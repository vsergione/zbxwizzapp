# Getting started

This walkthrough takes you from a fresh install to updating host tags in Zabbix. It assumes ZbxWizz is [served from the Zabbix frontend](installation.md) and that you have an API token ready.

---

## 1. Connect to Zabbix

1. Click the **Zabbix logo** (top right)
2. Enter:
   - **API URL:** `api_jsonrpc.php`
   - **API Token:** your token from *Users → API tokens*
3. Click **Save config**

The logo turns bright red when the connection test (`host.get` with `limit: 1`) succeeds.

---

## 2. Import hosts

1. **Import data → Import from Zabbix**
2. **Resource:** `host`
3. In the request editor, paste:

   ```json
   {
     "limit": 5,
     "selectTags": ["tag", "value"]
   }
   ```

4. Click **Import**

Five hosts appear in the table. Nested fields (like `tags`) are stored as JSON strings in the cells; the original object is kept in `data.csv` for transforms.

---

## 3. Transform a column

Add a tag to every visible host.

1. Find the column that holds tags (check the blue field name badge in the header)
2. In that column's **transform** textarea, enter:

   ```javascript
   json(obj(data.csv.tags).concat({"tag":"zbxwizz","value":"was here"}))
   ```

3. A **preview** for the first visible row appears below
4. Click **Apply**

The expression runs on each **visible** row in that column. Hidden (filtered-out) rows are skipped.

---

## 4. Select rows to update

- Check individual row checkboxes, or
- Use the header checkbox (next to **Del Sel**) to select all **visible** rows

The footer shows **Total**, **Selected**, and **Visible** counts.

---

## 5. Push back to Zabbix

1. **Zabbix ops → Push**
2. Configure:
   - **Resource:** `host`
   - **Operation:** `update`
3. In the request editor, paste (adjust `${cols[N]}` to match your tags column index):

   ```json
   {
     "hostid": "${flds.hostid}",
     "tags": ${cols[1]}
   }
   ```

4. Check the **preview** — it should show a valid JSON object with `hostid` and `tags`
5. Click **Push**, then **Confirm**

Verify the new tag in the Zabbix UI under *Data collection → Hosts*.

---

## What you learned

| Concept | Used here |
|---------|-----------|
| Import template | JSON params for `host.get` |
| Transform expression | JavaScript with `data.csv`, `obj()`, `json()` |
| Push template | JSON with `${flds.*}` and `${cols[N]}` variables |
| Row selection | Only checked rows are pushed |

---

## Next steps

- [User interface](user-interface.md) — table controls, filters, multiple sheets
- [Zabbix operations](zabbix-operations.md) — Pull, delete, saved templates
- [Transformations](transformations.md) — full expression reference
- [Examples](examples.md) — import items, bulk rename, host groups

---

## Excel alternative

If you prefer spreadsheets over in-app transforms:

1. Import from Zabbix
2. **Export data → Export to CSV**
3. Edit in Excel
4. **Import data → Import from CSV**
5. Push as above

Ensure the host ID column is named `hostid`, or change `${flds.hostid}` in the push template to match your column name.
