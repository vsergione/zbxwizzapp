# Installation

ZbxWizz is a **static web application**. There is no backend, no database, and no build step at deploy time. The entire app lives in the `static/` folder; copy it and open it in a browser.

All JavaScript and CSS dependencies are bundled under `static/assets/`. You do not need Node.js or npm on the server.

---

## Option 1 — On the Zabbix frontend (recommended)

Serving ZbxWizz from the same web root as the Zabbix UI is the best setup:

- API calls are **same-origin** — no CORS browser extensions
- You can use a **relative API URL** (`api_jsonrpc.php`)
- Your team can bookmark it like any other internal tool

### Steps

1. Clone or download the repository:

   ```bash
   git clone https://github.com/WebwerksRo/zbxwizz.git
   ```

2. Copy the `static/` folder into your Zabbix web root:

   ```bash
   sudo cp -r zbxwizz/static /usr/share/zabbix/zbxwizz
   ```

   Adjust the destination to match your installation:

   | Platform | Typical web root |
   |----------|------------------|
   | RHEL / Alma / Rocky (package) | `/usr/share/zabbix/` |
   | Debian / Ubuntu (package) | `/usr/share/zabbix/` |
   | Manual install / Docker | wherever the Zabbix UI is served from |

3. Set permissions so the web server can read the files:

   ```bash
   sudo find /usr/share/zabbix/zbxwizz -type d -exec chmod 755 {} \;
   sudo find /usr/share/zabbix/zbxwizz -type f -exec chmod 644 {} \;
   ```

4. Open in the browser:

   ```
   https://your-zabbix-server/zbxwizz/
   ```

5. Configure the API connection (Zabbix icon, top right):

   | Field | Value |
   |-------|-------|
   | API URL | `api_jsonrpc.php` |
   | Token | from *Users → API tokens* |

   When the connection succeeds, the Zabbix logo turns from pale red to bright red.

### Upgrading

Replace the folder contents with the new version. Before upgrading, export your workspace if you rely on saved data:

- **Environment → Save** exports sheets and layout to a `.json` file
- Request templates and transformations are stored in browser **localStorage** — export the environment file or note them separately

---

## Option 2 — Local try-out

Useful for evaluation or offline table work (without live API access).

```bash
git clone https://github.com/WebwerksRo/zbxwizz.git
cd zbxwizz/static
python3 -m http.server 8080
```

Open `http://localhost:8080/`.

### Limitations when not on the Zabbix frontend

| Issue | Workaround |
|-------|------------|
| Cross-origin API calls | CORS browser extension, or use full API URL with server-side CORS headers |
| Some Zabbix + HTTP/2 setups | Disable HTTP/2 in the browser for that site |
| Opening `file://` directly | Avoid — use a local HTTP server instead |

For day-to-day use against a live Zabbix instance, prefer **Option 1**.

---

## First launch

On first visit you will see a disclaimer screen. Click **Red pill** to enter the application. Your choice is remembered in localStorage.

---

## Troubleshooting

**Zabbix icon stays pale red**

- Check API URL and token
- Open browser developer tools → Network tab → look for failed `api_jsonrpc.php` requests
- Verify the token user has permission for the operations you intend to run

**Blank icons in the toolbar**

- Ensure `assets/vendor/font-awesome/` was copied completely (fonts subdirectory included)

**JSONEditor shows broken icons**

- Ensure `assets/css/img/jsoneditor-icons.svg` exists

**404 when opening `/zbxwizz/`**

- Confirm files are under the correct web root and the path matches your URL prefix (e.g. `/zabbix/zbxwizz/` if Zabbix is in a subdirectory)
