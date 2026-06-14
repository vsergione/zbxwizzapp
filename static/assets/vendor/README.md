# Vendored third-party assets

Runtime dependencies live under `assets/` so ZbxWizz deploys as a plain static folder — no `npm install` on the server.

## Layout

| Path | Package | Notes |
|------|---------|--------|
| `assets/js/`, `assets/css/` | jQuery, Bootstrap, JSONEditor, … | Frozen manually; versions in `versions.json` |
| `assets/vendor/ace/` | ace-builds | Script player editor |
| `assets/vendor/font-awesome/` | font-awesome 4 | Toolbar icons |
| `assets/css/img/` | jsoneditor icons | SVG sprite for JSONEditor |

## Updating npm-vendored packages

From `static/`:

```bash
npm install          # devDependencies only
npm run vendor       # copies ace + font-awesome into assets/vendor/
```

Review the diff, test the script player and icons, then commit.

To bump a pinned version, edit the version in `package.json`, run the commands above, and update `bundledInAssets` in `scripts/vendor-deps.mjs` if you refresh those files too.
