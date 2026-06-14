# ZbxWizz — static application

This directory is the runnable application. Copy it to your web server or Zabbix frontend and open `index.html`.

**Documentation:** [../docs/README.md](../docs/README.md)

## Quick reference

| Path | Purpose |
|------|---------|
| `index.html` | Application entry point |
| `lib/` | Core application logic |
| `plugins/zbx.js` | Zabbix JSON-RPC client |
| `assets/` | Vendored CSS, JavaScript, images |

No `npm install` required at deploy time. For updating vendored libraries (maintainers only), see [assets/vendor/README.md](assets/vendor/README.md).
