
let $ws = $("#worksheets").on("scroll",(e)=>{
    sheet = worksheets.get_active();
    sheet.scrollY = $ws.scrollTop();
    sheet.scrollX = $ws.scrollLeft();
});


class WorkSheets {
    /**
     *
     * @type {*:{DataTable}}
     */
    #sheetsOrder = [];
    sheets = {};
    lastAssignedIdx;
    #activeSheetName;
    #sheetsContainer;
    #tabsContainer;

    get s() {
        return this.sheets;
    }
    get sheetsNames() {
        return this.#sheetsOrder;
    }

    #sheetContainerTpl = `<div class="sheet-pane" aria-labelledby="" style="display: none"></div>`;
    #sheetSelectorTabTpl = `<li class="nav-item sheet-tab" role="presentation">
                    <div class="sheet-tab-inner">
                        <a class="nav-link sheet-tab-label" id="sheet1-tab" data-target="#sheet1"
                        onclick="worksheets.activate_sheet($(this).attr('data-sheet'))">Sheet1</a>
                        <button type="button" class="sheet-tab-menu-btn" title="Sheet menu" aria-label="Sheet menu"
                            onclick="sheetTabMenu.toggleFromButton(event, this)"><i class="fa fa-chevron-down"></i></button>
                    </div>
                </li>`;

    constructor(sheetsContainer, tabsContainer, config = {}, sheetData = {}) {
        this.#sheetsContainer = $(sheetsContainer);
        this.#tabsContainer = $(tabsContainer);

        console.log(config);

        this.lastAssignedIdx = config.lastAssignedIdx ? config.lastAssignedIdx : 0;

        this.#tabsContainer.empty();
        this.#sheetsContainer.empty();
        sheetTabMenu.bindTabs(this.#tabsContainer);

        (config.sheets ? config.sheets : []).forEach((sheetName) => {
            try {
                let wsData = sheetData[sheetName] ?? null;
                this.new_sheet(sheetName, wsData);
            } catch (e) {
                this.new_sheet(sheetName);
                console.log('Invalid sheet data', e);
            }
        });

        if (Object.keys(this.sheets).length===0) {
            console.log("empty workspace -> create default sheet");
            this.new_sheet();
        }
        if(config.activeSheet) this.activate_sheet(config.activeSheet);
    }

    static async load(sheetsContainer, tabsContainer) {
        await sheetStore.migrateFromLocalStorage();
        let config = {};
        try {
            config = await sheetStore.getConfig() ?? {};
        } catch (e) {
            console.log('No saved ws config', e);
        }

        const sheetData = {};
        for (const sheetName of config.sheets ?? []) {
            try {
                sheetData[sheetName] = await sheetStore.getSheet(sheetName);
            } catch (e) {
                console.log('Could not load sheet', sheetName, e);
            }
        }

        return new WorkSheets(sheetsContainer, tabsContainer, config, sheetData);
    }

    activate_sheet(wsId,event="") {
        console.log("activate_sheet "+wsId);

        $("#worksheets").children().hide();
        $("#sheetSelector").find("a.nav-link").removeClass("active");
        $("#sheet-"+wsId).show();
        $("#sheet-"+wsId+"-tab").addClass("active");
        const $activeTab = $("#sheet-"+wsId+"-tab");
        const scrollEl = document.getElementById("sheetTabsScroll");
        const tabEl = $activeTab.closest(".sheet-tab")[0];
        if (scrollEl && tabEl) {
            const tabLeft = tabEl.offsetLeft;
            const tabRight = tabLeft + tabEl.offsetWidth;
            const viewLeft = scrollEl.scrollLeft;
            const viewRight = viewLeft + scrollEl.clientWidth;
            if (tabLeft < viewLeft) {
                scrollEl.scrollLeft = tabLeft - 8;
            } else if (tabRight > viewRight) {
                scrollEl.scrollLeft = tabRight - scrollEl.clientWidth + 8;
            }
        }
        if(this.#activeSheetName===wsId) return ;
        this.#activeSheetName = wsId;
        let activeSheet = this.get_active();

        if(activeSheet)
            $ws.scrollTop(activeSheet.scrollY).scrollLeft(activeSheet.scrollX)
        this.update_stats();
        return this.sheets[wsId];

    }

    save() {
        let cfg = {
            sheets: this.#sheetsOrder,
            lastAssignedIdx: this.lastAssignedIdx,
            activeSheet: this.#activeSheetName
        };
        console.log("save cfg",cfg)
        return sheetStore.setConfig(cfg).catch(err => sheetStore.onSaveError(err));
    }

    flushAllSaves() {
        this.save();
        return Promise.all(
            Object.keys(this.sheets).map(name => this.sheets[name].flushSave())
        );
    }

    update_stats() {
        try {
            let stats = this.get_active().get_stats();
            $("#totalRecs").text(stats.total);
            $("#totalSelected").text(stats.selected);
            $("#totalVisible").text(stats.visible);
        }
        catch(e) {
            //console.log(e);
        }
    }

    /**
     *
     * @param {String} wsId
     * @param {*} data
     * @returns
     */
    new(wsId, data = null) {
        return this.new_sheet(wsId, data);
    }

    /**
     * 
     * @param {String} wsId 
     * @param {*} data 
     * @returns 
     */
    new_sheet(wsId, data = null) {

        if (!wsId) {
            this.lastAssignedIdx++;
            wsId = "sheet" + (this.lastAssignedIdx);
        }
        console.log("New sheet",wsId);


        // create tab
        const $tab = $(this.#sheetSelectorTabTpl).appendTo(this.#tabsContainer);
        $tab.find("a")
            .text(wsId)
            .attr("data-target", "sheet-"+wsId)
            .attr("data-sheet", wsId)
            .attr("id", "sheet-"+wsId + "-tab");
        $tab.attr("data-sheet", wsId);


        // create sheet container/pane
        let container = $(this.#sheetContainerTpl).appendTo(this.#sheetsContainer)
            .text(wsId)
            .attr("id", "sheet-"+wsId)
            .attr("data-sheet", wsId);
        this.sheets[wsId] = new DataTable(wsId,container,30, data);
        this.sheetsNames.push(wsId);
        this.activate_sheet(wsId,data===null?"initial creation":"create & load");
        return this.sheets[wsId];
    }

    delete(sheetId) {
        return this.delete_sheet(sheetId);
    }
    /**
     *
     * @param sheetId
     * @returns {WorkSheets}
     */
    delete_sheet(sheetId) {
        if (!sheetId) {
            sheetId = this.#activeSheetName;
        }
        console.log("delete "+sheetId)

        const wasActive = sheetId === this.#activeSheetName;
        const idx = this.#sheetsOrder.indexOf(sheetId);
        let activateNext = null;
        if (wasActive && this.#sheetsOrder.length > 1) {
            activateNext = this.#sheetsOrder[idx + 1] ?? this.#sheetsOrder[idx - 1];
        }

        this.sheets[sheetId].remove();
        delete this.sheets[sheetId];
        $("#sheet-"+sheetId+"-tab").closest(".sheet-tab").remove();
        this.reorder();
        this.save();

        if (this.#sheetsOrder.length === 0) {
            this.new_sheet();
        } else if (wasActive) {
            this.activate_sheet(activateNext ?? this.#sheetsOrder[0], 'deletion');
        } else {
            this.update_stats();
        }

        return this;
    }

    duplicate_sheet(sheetId) {
        if (!sheetId) {
            sheetId = this.#activeSheetName;
        }
        const dt = this.sheets[sheetId];
        if (!dt) return;

        const data = {
            fields: [...dt.fields],
            records: JSON.parse(JSON.stringify(dt.export())),
        };
        const newName = this.#uniqueSheetName(`${sheetId} copy`);
        return this.new_sheet(newName, data);
    }

    #uniqueSheetName(base) {
        if (!this.sheets[base]) return base;
        let i = 2;
        while (this.sheets[`${base} ${i}`]) i++;
        return `${base} ${i}`;
    }

    /**
     *
     * @returns {DataTable}
     */
    get_active_sheet() {
        return this.sheets[this.#activeSheetName];
    }

    get_active() {
        return this.get_active_sheet();
    }

    reset() {
        this.lastAssignedIdx = 0;
        Object.keys(this.sheets).forEach(k=>{
            this.sheets[k].remove();
            delete this.sheets[k];
            this.#tabsContainer.find("li:has(#sheet-"+k+"-tab)").remove();
        });
        this.#sheetsOrder = [];
        sheetStore.removeAllSheets().catch(err => sheetStore.onSaveError(err));
        this.new_sheet();
        this.save();
    }
    rename(oldName,newName){
        return this.rename_sheet(oldName,newName);
    }

    rename_sheet(oldName,newName) {
        if(oldName!==newName && this.sheets[newName]) throw "Sheet "+newName+" already exists";

        this.sheets[newName] = this.sheets[oldName];
        this.sheets[newName].rename(newName);
        delete this.sheets[oldName];
        this.sheetsNames[this.sheetsNames.indexOf(oldName)] = newName;
        $("#sheet-"+oldName+"-tab")
            .closest(".sheet-tab")
            .attr("data-sheet", newName)
            .find("a")
            .attr("id","sheet-"+newName+"-tab")
            .attr("data-target","sheet-"+newName)
            .attr("data-sheet",newName)
            .text(newName);
        $("#sheet-"+oldName)
            .attr("id","sheet-"+newName)
            .attr("data-sheet",newName);
        return this.activate_sheet(newName,"rename");
    }

    reorder() {
        let newOrder = [];
        $("#sheetSelector").find("a").toArray().forEach(a=>newOrder.push($(a).attr("data-sheet")));
        console.log("reorder",newOrder);
        this.#sheetsOrder = newOrder;
        this.save();
    }
}


const sheetTabMenu = {
    $menu: null,
    sheetId: null,
    bound: false,

    init() {
        if (this.$menu) return;
        this.$menu = $(`
            <div id="sheetTabMenu" class="dropdown-menu sheet-tab-menu shadow" hidden>
                <button type="button" class="dropdown-item" data-action="rename">
                    <i class="fa fa-pencil fa-fw"></i> Rename
                </button>
                <button type="button" class="dropdown-item" data-action="duplicate">
                    <i class="fa fa-copy fa-fw"></i> Duplicate
                </button>
                <button type="button" class="dropdown-item text-danger" data-action="delete">
                    <i class="fa fa-trash fa-fw"></i> Remove
                </button>
            </div>
        `).appendTo("body");

        this.$menu.on("click", "[data-action]", (e) => {
            e.preventDefault();
            this.runAction($(e.currentTarget).data("action"));
        });

        $(document).on("click", (e) => {
            if (!$(e.target).closest("#sheetTabMenu, .sheet-tab-menu-btn").length) {
                this.hide();
            }
        });
    },

    bindTabs($container) {
        this.init();
        if (this.bound) return;
        $container.on("contextmenu", ".sheet-tab", (e) => {
            e.preventDefault();
            const $tab = $(e.currentTarget);
            const sheetId = $tab.find(".sheet-tab-label").attr("data-sheet");
            worksheets.activate_sheet(sheetId);
            this.showAt(e.clientX, e.clientY, sheetId);
        });
        this.bound = true;
    },

    toggleFromButton(event, btn) {
        event.preventDefault();
        event.stopPropagation();
        const $tab = $(btn).closest(".sheet-tab");
        const sheetId = $tab.find(".sheet-tab-label").attr("data-sheet");
        if (this.$menu && !this.$menu.prop("hidden") && this.sheetId === sheetId) {
            this.hide();
            return;
        }
        worksheets.activate_sheet(sheetId);
        const rect = btn.getBoundingClientRect();
        this.showAt(rect.left, rect.bottom + 2, sheetId);
    },

    showAt(x, y, sheetId) {
        this.init();
        this.sheetId = sheetId;
        const pad = 8;
        this.$menu.prop("hidden", false).css({ display: "block", left: x, top: y });

        const rect = this.$menu[0].getBoundingClientRect();
        let left = x;
        let top = y;
        if (rect.right > window.innerWidth - pad) {
            left = window.innerWidth - rect.width - pad;
        }
        if (rect.bottom > window.innerHeight - pad) {
            top = window.innerHeight - rect.height - pad;
        }
        left = Math.max(pad, left);
        top = Math.max(pad, top);
        this.$menu.css({ left, top });
    },

    hide() {
        if (!this.$menu) return;
        this.$menu.prop("hidden", true).hide();
        this.sheetId = null;
    },

    runAction(action) {
        const id = this.sheetId;
        this.hide();
        if (!id || !worksheets?.sheets[id]) return;

        switch (action) {
            case "rename":
                edit_tab($("#sheet-" + id + "-tab"));
                break;
            case "duplicate":
                worksheets.duplicate_sheet(id);
                break;
            case "delete":
                worksheets.delete_sheet(id);
                break;
        }
    },
};


function edit_tab(src) {
    const lnk = $(src);
    const $inner = lnk.closest(".sheet-tab-inner");
    const sheetName = lnk.text().trim();

    function restore() {
        inp.remove();
        lnk.removeClass("editing");
    }

    if ($inner.find(".sheet-tab-rename-input").length) return;

    lnk.addClass("editing");
    const inp = $("<input type='text' class='sheet-tab-rename-input'>")
        .val(sheetName)
        .appendTo($inner)
        .trigger("focus")
        .on("keydown", (event) => {
            const sheetNewName = inp.val().trim();
            if (event.code === "Escape") {
                restore();
                return;
            }
            if (event.code === "Enter" || event.code === "NumpadEnter") {
                event.preventDefault();
                if (!sheetNewName || sheetNewName === sheetName) {
                    restore();
                    return;
                }
                if (worksheets.sheets[sheetNewName]) return;
                restore();
                worksheets.rename_sheet(sheetName, sheetNewName);
            }
        })
        .on("blur", restore);
}