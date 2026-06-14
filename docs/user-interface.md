# User interface

ZbxWizz presents data in a multi-sheet workbook. Each sheet is an independent table with its own filters, transforms, and data.

---

## Menu bar

| Menu | Actions |
|------|---------|
| **Environment** | New workspace, Save/Load `.json` environment file |
| **Import data** | CSV, Zabbix API, JavaScript |
| **Export data** | CSV (all / selected / visible rows) |
| **Zabbix ops** | Pull (enrich rows), Push (create/update/delete) |
| **Table structure** | Save/restore column layout |
| **Clear data** | Reset current workspace |
| **Save icon** | Trigger autosave to localStorage |
| **Play icon** | Open script player (advanced JavaScript) |
| **Zabbix logo** | API URL and token configuration |

---

## Table layout

Each column header is a stacked control panel:

```
┌─────────────────────────────┐
│  <  [0]  ▲ ▼  >             │  ← column index, sort, move
│  hostid                     │  ← field name (double-click to rename)
│  [Filter ▼]                 │  ← row filter
│  [transform textarea]       │  ← column expression
│  [preview]                  │  ← live preview (first visible row)
│  [Apply]                    │
└─────────────────────────────┘
```

- **Column numbers start at 0**
- Empty columns beyond imported data are named `col0`, `col1`, …
- The table starts with **30 columns** by default; extra columns appear as needed

### Row controls

| Control | Action |
|---------|--------|
| Row number button | Show row debug info (full data object) |
| Checkbox | Select row for Pull / Push |
| Cell click | Highlight cell |
| Cell double-click | Edit cell value inline |
| **Del Sel** | Delete selected rows from the sheet |
| Header checkbox | Toggle all **visible** rows |

The first two columns (row number and checkbox) stay sticky when scrolling horizontally.

---

## Filtering

Open **Filter** on any column:

| Filter type | Behaviour |
|-------------|-----------|
| Empty | Cell matches empty string |
| Not empty | Cell has any content |
| Contains | Substring match (default) |
| Does not contain | Inverse substring |
| Starts with / Ends with / Exact match | Prefix, suffix, or full match |

The value dropdown lists unique values from that column.

**Multiple column filters combine with AND** — a row must pass every active filter to stay visible.

Filters affect transforms: expressions run on **visible rows only**.

---

## Column operations

| Control | Action |
|---------|--------|
| `◀` / `▶` | Move column left / right |
| Column number badge | Toggle compressed (narrow) column width |
| `▲` / `▼` | Sort ascending / descending |
| Field name badge | Double-click to rename |

---

## Sheets

The footer shows sheet tabs:

- **Click** a tab to switch sheets
- **Double-click** a tab to rename it
- **[+] New sheet** — add an empty sheet
- **[-] Remove current sheet** — delete active sheet
- Tabs can be **drag-reordered**

Each sheet has its own data, filters, and scroll position. Cross-sheet lookups in transforms use `ws.sheetName` (see [Transformations](transformations.md)).

---

## Footer statistics

| Badge | Meaning |
|-------|---------|
| **Total** | All rows in the active sheet |
| **Selected** | Rows with checkbox checked |
| **Visible** | Rows not hidden by filters |

---

## Persistence

ZbxWizz stores state in the browser **localStorage**:

| Data | Storage key pattern |
|------|---------------------|
| Sheet list and active tab | `worksheets` |
| Sheet data | `sheet-{name}-data` |
| Zabbix URL and token | `zbxUrl`, `zbxToken` |
| Request templates | `importReqTpl_*`, `pushReqTpl_*`, `pullReqTpl_*`, … |
| Saved transforms | `transfo_*` |
| Table structures | `tbl_struct_*` |

**Environment → Save** exports everything to a downloadable `.json` file. **Load** restores from that file and reloads the page.

Autosave runs every 60 seconds (toggle with the save icon in the menu bar).

---

## Script player

The **play** button opens a JavaScript editor for ad-hoc scripting against the current session. This is an advanced feature — useful for one-off automation, debugging, or prototyping import scripts.

Results appear in the debug textarea below the editor.

---

## Startup disclaimer

First-time visitors see a warning about Push/Delete operations. Accepting stores `userlevel=courageous` in localStorage and skips the screen on future visits.
