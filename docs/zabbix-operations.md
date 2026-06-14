# Zabbix operations

Pull and Push run Zabbix JSON-RPC calls built from templates you write. Both operate on **selected rows** (Pull) or **selected rows** (Push) in the active sheet.

---

## Template syntax

Request bodies in Pull and Push editors are **JavaScript template literals**. Use `${…}` to inject row values:

| Variable | Meaning | Example |
|----------|---------|---------|
| `${flds.fieldname}` | Cell value by column name | `${flds.hostid}` |
| `${cols[N]}` | Cell value by column index (0-based) | `${cols[2]}` |

The preview panel evaluates the template against the **first selected row** (Pull/Push) so you can verify output before executing.

### Example push template

```json
{
  "hostid": "${flds.hostid}",
  "tags": ${cols[3]}
}
```

`${cols[3]}` is inserted **without quotes** so a JSON array in the cell becomes a proper JSON array in the request. String fields use quotes in the template around `${flds.…}`.

---

## Pull — enrich rows from Zabbix

**Zabbix ops → Pull**

For each **selected** row, ZbxWizz calls `{resource}.get` with your template and attaches the result to the row.

| Field | Description |
|-------|-------------|
| **Resource** | e.g. `host`, `item`, `trigger` |
| **Data label** | Key under `row.data` where the response is stored (default: `zbx`) |
| **Post process** | How to merge pulled data (reserved for future use) |
| **Request editor** | JSON params template for `.get` |

### Example — get items for each host

1. Import hosts with `hostid` column
2. Select rows
3. Resource: `item`
4. Label: `items`
5. Template:

   ```json
   {
     "hostids": ["${flds.hostid}"],
     "limit": 10
   }
   ```

6. Click **Pull**

Each row gets `data.items` containing the API result. Use it in transforms:

```javascript
json(data.items)
```

Or access nested fields if a single item was returned.

Rows show a loading state while requests are in flight. Failed rows log errors to the browser console.

---

## Push — write to Zabbix

**Zabbix ops → Push**

For each **selected** row, ZbxWizz calls `{resource}.{operation}` with your template.

| Field | Description |
|-------|-------------|
| **Resource** | `host`, `hostgroup`, `template`, `trigger`, … |
| **Operation** | `create`, `update`, or `delete` |
| **Request editor** | JSON params template |

### Operations

| Operation | API method | Typical use |
|-----------|------------|-------------|
| `update` | `{resource}.update` | Modify existing objects |
| `create` | `{resource}.create` | Bulk create |
| `delete` | `{resource}.delete` | Bulk removal |

### Confirmation

Push always shows a confirmation dialog. **Delete** operations display an additional warning.

There is **no undo**. Review the preview carefully.

### Example — update host tags

```json
{
  "hostid": "${flds.hostid}",
  "tags": ${cols[4]}
}
```

### Example — delete triggers

Resource: `trigger`, Operation: `delete`

```json
{
  "triggerid": "${flds.triggerid}"
}
```

---

## Connection

Configure once via the Zabbix logo (top right):

| Setting | On Zabbix frontend | Remote / local |
|---------|-------------------|----------------|
| API URL | `api_jsonrpc.php` | Full URL, e.g. `https://host/zabbix/api_jsonrpc.php` |
| Token | Bearer token from Zabbix UI | Same |

Credentials are stored in localStorage. The connection test runs `host.get` with `limit: 1`.

Optional: place `zbx_url.txt` and `zbx_api_key.txt` next to `index.html` and use **Load** buttons in the config dialog (useful for personal dev setups — do not deploy secrets in production web roots).

---

## Error handling

- Template syntax errors are shown before any API call
- Per-row API errors are stored in `row.lastResponse`
- Click the **row number** button to inspect full row data including `lastResponse`
- The overlay spinner indicates batch operations in progress

---

## Safety checklist

Before pushing to production:

1. **Test on a small selection** — one or two rows first
2. **Read the preview** for each template change
3. **Use filters** to narrow visible rows before Select All
4. **Export CSV** as backup before large updates
5. **Avoid delete** until update templates are proven
6. **Check token permissions** — the API enforces Zabbix role limits

See also [Getting started](getting-started.md) for a complete first push walkthrough.
