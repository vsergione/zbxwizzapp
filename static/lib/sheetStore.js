/**
 * IndexedDB persistence for worksheet data (replaces localStorage sheet-* keys).
 */
const sheetStore = (() => {
    const DB_NAME = "zbxwizz";
    const DB_VERSION = 1;
    const STORE_SHEETS = "sheets";
    const STORE_META = "meta";
    const CONFIG_KEY = "worksheets";

    let dbPromise = null;

    function openDB() {
        if (!dbPromise) {
            dbPromise = new Promise((resolve, reject) => {
                const req = indexedDB.open(DB_NAME, DB_VERSION);
                req.onerror = () => reject(req.error);
                req.onsuccess = () => resolve(req.result);
                req.onupgradeneeded = (event) => {
                    const db = event.target.result;
                    if (!db.objectStoreNames.contains(STORE_SHEETS)) {
                        db.createObjectStore(STORE_SHEETS);
                    }
                    if (!db.objectStoreNames.contains(STORE_META)) {
                        db.createObjectStore(STORE_META);
                    }
                };
            });
        }
        return dbPromise;
    }

    function tx(storeName, mode) {
        return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
    }

    function get(storeName, key) {
        return tx(storeName, "readonly").then(store => new Promise((resolve, reject) => {
            const req = store.get(key);
            req.onsuccess = () => resolve(req.result ?? null);
            req.onerror = () => reject(req.error);
        }));
    }

    function set(storeName, key, value) {
        return tx(storeName, "readwrite").then(store => new Promise((resolve, reject) => {
            const req = store.put(value, key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        }));
    }

    function remove(storeName, key) {
        return tx(storeName, "readwrite").then(store => new Promise((resolve, reject) => {
            const req = store.delete(key);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        }));
    }

    function sheetKey(name) {
        return "sheet-" + name + "-data";
    }

    function localSheetKeys() {
        const keys = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && /^sheet-.*-data$/.test(key)) {
                keys.push(key);
            }
        }
        return keys;
    }

    async function migrateFromLocalStorage() {
        const hasLocalSheets = localSheetKeys().length > 0;
        const localConfig = localStorage.getItem(CONFIG_KEY);
        if (!hasLocalSheets && !localConfig) {
            return;
        }

        if (localConfig) {
            try {
                await setConfig(JSON.parse(localConfig));
            } catch (e) {
                console.warn("Could not migrate worksheets config from localStorage", e);
            }
            localStorage.removeItem(CONFIG_KEY);
        }

        for (const key of localSheetKeys()) {
            try {
                const raw = localStorage.getItem(key);
                if (raw) {
                    await set(STORE_SHEETS, key, JSON.parse(raw));
                }
            } catch (e) {
                console.warn("Could not migrate", key, e);
            }
            localStorage.removeItem(key);
        }
    }

    async function getConfig() {
        return get(STORE_META, CONFIG_KEY);
    }

    async function setConfig(config) {
        return set(STORE_META, CONFIG_KEY, config);
    }

    async function getSheet(name) {
        return get(STORE_SHEETS, sheetKey(name));
    }

    async function setSheet(name, data) {
        return set(STORE_SHEETS, sheetKey(name), data);
    }

    async function removeSheet(name) {
        return remove(STORE_SHEETS, sheetKey(name));
    }

    async function removeAllSheets() {
        const store = await tx(STORE_SHEETS, "readwrite");
        return new Promise((resolve, reject) => {
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }

    async function clearAll() {
        await removeAllSheets();
        await remove(STORE_META, CONFIG_KEY);
    }

    function onSaveError(error) {
        console.error("Sheet save failed", error);
        const msg = error && error.name === "QuotaExceededError"
            ? "Browser storage is full. Export your environment (Environment → Save) and remove unused sheets."
            : "Could not save worksheet data: " + (error && error.message ? error.message : error);
        if (typeof show_modal === "function") {
            show_modal({ body: msg });
        }
    }

    return {
        migrateFromLocalStorage,
        getConfig,
        setConfig,
        getSheet,
        setSheet,
        removeSheet,
        removeAllSheets,
        clearAll,
        onSaveError,
    };
})();
