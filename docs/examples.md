# Examples

Copy-paste starting points for common tasks. Adjust column indices and field names to match your sheet.

---

## Import hosts with tags and interfaces

**Import from Zabbix** · Resource: `host`

```json
{
  "limit": 50,
  "selectTags": ["tag", "value"],
  "selectInterfaces": ["interfaceid", "ip", "dns", "type", "main"]
}
```

---

## Import hosts by tag

```json
{
  "tags": [
    {"tag": "environment", "value": "production"}
  ],
  "selectTags": ["tag", "value"]
}
```

---

## Add a tag to all visible hosts

Transform on the **tags** column:

```javascript
json(obj(data.csv.tags).concat({"tag":"reviewed","value":"2026-06-14"}))
```

Push template:

```json
{
  "hostid": "${flds.hostid}",
  "tags": ${cols[YOUR_TAGS_COL_INDEX]}
}
```

---

## Set a macro-like value in a free column

Import hosts, add a column (or use an empty `colN`), transform:

```javascript
"location=" + flds.name.split("-")[0]
```

---

## Bulk-update host visible name

Transform on `name` column:

```javascript
flds.name.replace(/^OLD-/, "NEW-")
```

Push:

```json
{
  "hostid": "${flds.hostid}",
  "name": "${flds.name}"
}
```

---

## Pull items for selected hosts

1. Import hosts (with `hostid`)
2. Select rows
3. **Pull** · Resource: `item` · Label: `items`

```json
{
  "hostids": ["${flds.hostid}"],
  "output": ["itemid", "name", "key_"],
  "limit": 500
}
```

4. Transform a new column to show item count:

```javascript
data.items ? String(data.items.length) : "0"
```

---

## Import triggers for a template

**Import from Zabbix** · Resource: `trigger`

```json
{
  "templateids": ["YOUR_TEMPLATE_ID"],
  "selectTags": ["tag", "value"],
  "expandDescription": true
}
```

---

## Disable hosts matching a pattern

1. Import hosts
2. Filter **name** column · Contains · `decom`
3. Select visible rows
4. Push · `host` · `update`

```json
{
  "hostid": "${flds.hostid}",
  "status": 1
}
```

(`status: 1` = disabled in Zabbix host API)

---

## Delete triggers by ID

1. Import triggers with `triggerid`
2. Filter and select carefully
3. Push · `trigger` · **delete**

```json
{
  "triggerid": "${flds.triggerid}"
}
```

Always test with one row first.

---

## Cross-sheet asset lookup

**Sheet 1 (`hosts`):** imported hosts  
**Sheet 2 (`assets`):** CSV with `hostid` and `owner`

On `hosts`, transform an `owner` column:

```javascript
ws.assets.lookup(flds.hostid, "hostid", "owner", false) || ""
```

---

## Generate test data (Import from JavaScript)

```javascript
({
  fields: ["hostid", "name", "status"],
  records: Array.from({length: 10}, (_, i) => ({
    hostid: String(10000 + i),
    name: "test-host-" + i,
    status: "0"
  }))
})
```

---

## Export only selected rows for review

1. Select rows to review
2. **Export data → Export to CSV** → *only selected*
3. Share CSV with team before pushing

---

## Save and restore a workspace

Before a risky operation:

1. **Environment → Save** → name the file `before-tag-migration.json`
2. Run push
3. If needed, **Environment → Load** to restore

---

## Further reading

- [Getting started](getting-started.md) — step-by-step first migration
- [Zabbix API reference](https://www.zabbix.com/documentation/current/en/manual/api/reference) — all resources and parameters
