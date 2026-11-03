// Run from the project root while Prisma Studio 7 is listening on port 5555:
//   npm install --prefix .tools --no-package-lock playwright
//   node scripts/studio-visualizer.cjs
// Only the read-only metadata aggregate is translated for MariaDB 10.4.
// All metadata and table rows come from the actual configured database.
const { chromium } = require('../.tools/node_modules/playwright');
(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
  const page = await browser.newPage({viewport:{width:1440,height:1050}});
  await page.route('**/bff', async route => {
    const payload = route.request().postDataJSON();
    if (payload?.query?.sql?.includes('json_arrayagg(json_object(')) {
      payload.query.sql = payload.query.sql
        .replace('json_arrayagg(json_object(', "concat('[', group_concat(json_object(")
        .replace('`nullable`)) as `columns`', "`nullable`)), ']') as `columns`");
      console.log('Applied MariaDB 10.4 aggregate compatibility translation.');
      const response = await route.fetch({postData:JSON.stringify(payload)});
      const body = await response.json();
      if (Array.isArray(body[1])) {
        for (const row of body[1]) {
          if (typeof row.columns === 'string') row.columns = JSON.parse(row.columns);
        }
      }
      await route.fulfill({response,json:body});
    } else await route.continue();
  });
  await page.goto('http://localhost:5555');
  await page.waitForTimeout(2000);
  console.log(await page.locator('body').innerText());
  await page.getByRole('link',{name:'Visualizer'}).click();
  await page.waitForTimeout(1500);
  console.log(await page.locator('body').innerText());
  await page.screenshot({path:'evidence/studio7-visualizer.png',fullPage:true});
  await browser.close();
})();
