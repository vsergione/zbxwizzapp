# Transformations

Column transforms are single JavaScript expressions evaluated **once per visible cell** in that column. Type an expression, check the preview, click **Apply**.

Hidden rows (filtered out) are not transformed.

---

## Expression context

Each expression runs with these bindings:

| Name | Description |
|------|-------------|
| `self` | Current cell value (before transform) |
| `cols` | Array of all cell values in the row, by column index (`cols[0]` = first data column) |
| `flds` | Object of cell values keyed by field name |
| `data` | Row attachment bag — `data.csv` (original import), `data.zbx` (pull results), custom pull labels |
| `ws` | All worksheets — keys are sheet names (`ws.sheet1`, `ws.sheet2`, …) |
| `lastResponse` | Last Zabbix API response for this row (from Pull/Push) |
| `json()` | `JSON.stringify` shorthand |
| `obj()` | `JSON.parse` shorthand |

Standard JavaScript functions and operators are available.

Objects returned from expressions are automatically JSON-stringified for display in the cell.

---

## Helper functions

```javascript
json(value)   // JSON.stringify(value)
obj(string)   // JSON.parse(string)
```

Typical pattern for nested API fields:

```javascript
json(obj(data.csv.tags).concat({"tag":"env","value":"prod"}))
```

---

## Saved expressions

Each column transform field has:

- **Dropdown** — load saved expressions (`transfo_*` in localStorage)
- **+** — save current expression
- **−** — delete selected saved expression

---

## DataTable API (`ws.sheetName`)

Access another sheet (or the current one via the active sheet name):

```javascript
ws.sheet1.rows          // array of Row objects
ws.sheet1.col(2)        // all cells in column 2, or .col("hostid")
ws.sheet1.get_row(0)    // row by index
ws.sheet1.lookup(subject, searchCol, valueCol, regexp?)
ws.sheet1.lookup2(terms, valueCol, regexp?, defaultOnEmpty?)
```

### `lookup(subject, searchCol, valueCol, regexp?)`

Find the first row where `searchCol` matches `subject`, return `valueCol` from that row.

| Parameter | Type | Description |
|-----------|------|-------------|
| `subject` | string | Value or regex pattern to match |
| `searchCol` | number or string | Column index or field name to search |
| `valueCol` | number or string | Column to return |
| `regexp` | boolean | If true, `subject` is treated as regex (default: exact match, case-insensitive) |

**Example — map host name to asset ID from a lookup sheet:**

```javascript
ws.assets.lookup(cols[1], "hostname", "asset_id", false)
```

(Assumes a sheet named `lookup` with `hostname` and `asset_id` columns.)

### `lookup2(terms, valueCol, regexp?, defaultOnEmpty?)`

Multi-column exact match. `terms` is an object like `{ hostid: "1001", env: "prod" }`.

---

## Row object (in scripts)

When iterating `ws.sheet1.rows` or inspecting row debug info:

| Property / method | Description |
|-------------------|-------------|
| `cells` | Array of Cell objects |
| `vals` | Array of cell values by column index |
| `fld_vals` | Object of field name → value |
| `isHidden` | `true` if filtered out |
| `isSelected` | `true` if checkbox checked |
| `data` | Attached data objects |
| `cell(idx)` | Cell by index or field name |

---

## Common patterns

**Copy value from another column**

```javascript
cols[0]
```

**Uppercase a field**

```javascript
flds.hostname.toUpperCase()
```

**Build JSON for a push column**

```javascript
json([{"tag":"owner","value":cols[2]}])
```

**Conditional value**

```javascript
cols[3] === "0" ? "disabled" : "enabled"
```

**Count pulled items**

```javascript
data.items ? data.items.length : 0
```

**Cross-sheet lookup**

```javascript
ws.assets.lookup(flds.hostid, "hostid", "owner", false) || "unknown"
```

---

## Preview vs Apply

| Action | Behaviour |
|--------|-----------|
| Typing / onchange | Updates preview using first **visible** row in the column |
| **Apply** | Runs expression on all **visible** rows in the column |

Errors in expressions show as the error message string in the cell.

---

## Tips

- Use **filters** to limit which rows get transformed before Apply
- Keep complex logic in a Pull step, then transform the flattened result
- Use **Import from JavaScript** to prototype data shapes before writing transforms
- Double-click a field name badge to rename columns for clearer `flds` references

See [Examples](examples.md) for full walkthroughs.
