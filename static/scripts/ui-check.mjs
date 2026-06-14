import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';

const root = join(fileURLToPath(import.meta.url), '..', '..');
const port = 8765;

function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      let path = join(root, req.url === '/' ? 'index.html' : req.url.split('?')[0].replace(/^\//, ''));
      if (!existsSync(path) || !path.startsWith(root)) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = extname(path);
      const types = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.csv': 'text/csv',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.json': 'application/json',
        '.woff2': 'font/woff2',
        '.woff': 'font/woff',
        '.ttf': 'font/ttf',
      };
      res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
      res.end(readFileSync(path));
    });
    server.listen(port, () => resolve(server));
  });
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  await page.addInitScript(() => {
    localStorage.setItem('userlevel', 'courageous');
    localStorage.removeItem('worksheets');
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k?.startsWith('sheet-')) localStorage.removeItem(k);
    }
    indexedDB.deleteDatabase('zbxwizz');
  });

  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('.sheet-empty', { timeout: 10000 });

  const shotsDir = join(root, 'scripts', 'screenshots');
  await page.screenshot({ path: join(shotsDir, 'empty.png'), fullPage: true });

  const emptyMetrics = await page.evaluate(() => {
    const ws = document.getElementById('worksheets');
    const layout = document.querySelector('.app-layout');
    return {
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
      layoutScrollWidth: layout?.scrollWidth,
      layoutClientWidth: layout?.clientWidth,
      wsScrollWidth: ws?.scrollWidth,
      wsClientWidth: ws?.clientWidth,
      hasEmptyState: !!document.querySelector('.sheet-empty'),
      viewportWidth: window.innerWidth,
    };
  });
  console.log('EMPTY:', JSON.stringify(emptyMetrics, null, 2));

  // Load wide CSV
  await page.click('text=Import data');
  await page.click('text=Import CSV');
  await page.setInputFiles('#loadCvsForm input[name="file"]', join(root, 'testdata', 'wide.csv'));
  await page.click('#importCsvModal .btn-primary');
  await page.waitForFunction(() => document.querySelectorAll('.dataTable tbody tr').length > 5, { timeout: 10000 });
  await page.waitForTimeout(500);

  await page.screenshot({ path: join(shotsDir, 'with-data.png'), fullPage: true });

  // Scroll worksheets to far right
  await page.evaluate(() => {
    const ws = document.getElementById('worksheets');
    ws.scrollLeft = ws.scrollWidth;
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(shotsDir, 'scrolled-right.png') });

  const wideMetrics = await page.evaluate(() => {
    const ws = document.getElementById('worksheets');
    const layout = document.querySelector('.app-layout');
    const table = document.querySelector('.dataTable');
    const tr = table?.querySelector('thead tr');
    return {
      bodyScrollWidth: document.body.scrollWidth,
      bodyClientWidth: document.body.clientWidth,
      bodyOverflow: getComputedStyle(document.body).overflowX,
      layoutScrollWidth: layout?.scrollWidth,
      layoutClientWidth: layout?.clientWidth,
      wsScrollWidth: ws?.scrollWidth,
      wsClientWidth: ws?.clientWidth,
      wsScrollLeft: ws?.scrollLeft,
      wsPaddingRight: getComputedStyle(ws).paddingRight,
      tableWidth: table?.offsetWidth,
      tableRight: table?.getBoundingClientRect().right,
      wrapRight: document.querySelector('.sheet-table-scroll')?.getBoundingClientRect().right,
      wsRight: ws?.getBoundingClientRect().right,
      viewportWidth: window.innerWidth,
      colCount: tr?.children.length,
      gapTableToViewport: window.innerWidth - table.getBoundingClientRect().right,
      gapWsRightToViewport: window.innerWidth - ws.getBoundingClientRect().right,
    };
  });
  console.log('WIDE (scrolled right):', JSON.stringify(wideMetrics, null, 2));

  await browser.close();
  server.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
