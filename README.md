# ZbxWizz

A browser-based ETL workbench for the [Zabbix API](https://www.zabbix.com/documentation/current/en/manual/api): import configuration data, transform it in a spreadsheet-like table, enrich rows with extra API calls, and push changes back — or export to CSV.

I built this after one migration too many — export from Zabbix, wrangle in Excel, hand off to a developer, wait for a throwaway script, repeat. ZbxWizz keeps that workflow in one place without locking you into predefined operations. You write the API requests; the tool handles the table, batching, and round trip.

Personal project, used on real deployments. Not a SaaS product — but meant for the bulk updates that do not belong in the Zabbix web UI.

**Website:** [zbxwizz.app](https://zbxwizz.app)

---

## At a glance

| Step | What you do in ZbxWizz |
|------|------------------------|
| **Extract** | Import from Zabbix, CSV, or JavaScript |
| **Transform** | Column expressions with live preview |
| **Enrich** | Pull extra API data per row (optional) |
| **Load** | Push to Zabbix or export CSV |

Deploy by copying the `static/` folder — no npm, no build step, no server-side code.

---

## Documentation

**→ [Full documentation](docs/README.md)**

| Guide | |
|-------|---|
| [Installation](docs/installation.md) | Zabbix frontend setup (recommended) or local try-out |
| [Getting started](docs/getting-started.md) | First import, transform, and push in 5 steps |
| [User interface](docs/user-interface.md) | Table, filters, sheets, persistence |
| [Import & export](docs/import-export.md) | All import sources and CSV export |
| [Zabbix operations](docs/zabbix-operations.md) | Pull, Push, templates, safety |
| [Transformations](docs/transformations.md) | Expression reference and data model |
| [Examples](docs/examples.md) | Copy-paste recipes |

---

## Quick install (Zabbix frontend)

```bash
git clone https://github.com/WebwerksRo/zbxwizz.git
sudo cp -r zbxwizz/static /usr/share/zabbix/zbxwizz
```

Open `https://your-zabbix-server/zbxwizz/` · API URL: `api_jsonrpc.php`

Details: [Installation guide](docs/installation.md)

---

## Safety

Push and delete hit the **live Zabbix API** with no undo. Review previews and test on a small row selection first. See [Zabbix operations → Safety](docs/zabbix-operations.md#safety-checklist).

---

## Author

**Sergiu Voicu** · [GitHub](https://github.com/WebwerksRo/zbxwizz) · [Issues](https://github.com/WebwerksRo/zbxwizz/issues)
