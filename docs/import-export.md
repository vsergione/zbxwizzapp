# Import & export

---

## Import from Zabbix

**Import data → Import from Zabbix**

Fetches data via `resource.get` and loads it into the active sheet, replacing current sheet data.

| Field | Description |
|-------|-------------|
| **Resource** | API resource name: `host`, `hostgroup`, `template`, `trigger`, `item`, … |
| **Request editor** | JSON parameters passed to `{resource}.get` |
| **Templates** | Save/load frequently used requests (stored in localStorage) |

### Example requests

**Five hosts with tags:**

```json
{"limit": 5, "selectTags": ["tag", "value"]}
```

**Hosts in a host group:**

```json
{
  "groupids": ["YOUR_GROUP_ID"],
  "selectTags": ["tag", "value"],
  "selectInterfaces": ["interfaceid", "ip", "port", "type"]
}
```

**Items for a host:**

```json
{
  "hostids": ["YOUR_HOST_ID"],
  "selectTags": ["tag", "value"],
  "limit": 100
}
```

Refer to the [Zabbix API documentation](https://www.zabbix.com/documentation/current/en/manual/api/reference) for available parameters and `select*` options.

### How imported data is stored

Each row keeps two representations:

| Location | Contents |
|----------|----------|
| Table cells (`flds`) | Flat string values; objects JSON-stringified |
| `data.csv` | Original API object (for transforms) |
| `data.{label}` | Data from Pull operations |

---

## Import from CSV

**Import data → Import CSV**

- Select a CSV file with a header row
- Column names become field names
- Replaces data in the active sheet

Tips:

- Use UTF-8 encoding
- Quote fields that contain commas
- Name the host ID column `hostid` if you plan to push host updates without editing templates

---

## Import from JavaScript

**Import data → Import from JavaScript**

Runs a script that must return:

```javascript
{
  fields: ["col1", "col2", ...],
  records: [
    { col1: "value", col2: "value" },
    ...
  ]
}
```

Available in the script scope: `ws`, `zbx`, `json()`, `obj()`.

### Example

```javascript
({
  fields: ["hostid", "name", "note"],
  records: [
    { hostid: "10001", name: "web-01", note: "production" },
    { hostid: "10002", name: "web-02", note: "staging" }
  ]
})
```

Use this for synthetic test data, merging external sources, or reshaping API responses before they hit the table.

---

## Export to CSV

**Export data → Export to CSV**

Choose what to export:

| Option | Rows included |
|--------|---------------|
| All records | Every row in the sheet |
| Only selected | Checked rows |
| Only visible | Rows passing all filters |

Output uses PapaParse with headers and quoted fields. Cell values export as displayed in the table (string form).

---

## Request templates

In Import, Pull, and Push dialogs you can **Save** the current editor content as a named template. Templates persist in localStorage and appear in the dropdown for reuse.

Naming convention in storage:

| Dialog | Key prefix |
|--------|------------|
| Import from Zabbix | `importReqTpl_` |
| Import from JavaScript | `importJSTpl_` |
| Pull | `pullReqTpl_` |
| Push | `pushReqTpl_` |

Select a template and click **Remove** to delete it from localStorage.

---

## Not yet available

- Import Excel (`.xlsx`)
- Export JSON (use **Environment → Save** for full workspace export instead)
