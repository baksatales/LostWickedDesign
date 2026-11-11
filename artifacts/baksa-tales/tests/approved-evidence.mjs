// Makes a self-contained, downloadable visual review from the screenshot run.
import { readFile, writeFile } from 'node:fs/promises';
const directory = 'generated-artifacts/approved-comparison';
const results = JSON.parse(await readFile(`${directory}/results.json`, 'utf8'));
const blocks = [];
for (const view of results) {
  const image = await readFile(`${directory}/${view.name}-${view.viewport}-side-by-side.jpg`);
  blocks.push(`<section id="${view.name}-${view.viewport}"><h2>${view.name} · ${view.viewport}px</h2><p>${view.route} · Source left, frontend right · Overflow ${view.scrollWidth-view.width}px · Broken images ${view.images.length} · Browser errors ${view.errors.length}</p><img loading="lazy" alt="${view.name} source and app side by side at ${view.viewport}px" src="data:image/jpeg;base64,${image.toString('base64')}"></section>`);
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Baksa Tales — approved design screenshot comparisons</title><style>body{margin:0;background:#f6f3df;color:#2b1712;font:18px/1.5 Georgia,serif}main{max-width:1500px;margin:auto;padding:24px}h1,h2{font-weight:500}h1{color:#611811}section{margin:36px 0}img{display:block;width:100%;height:auto;border:1px solid #dccab0}a{color:#611811}nav{display:flex;flex-wrap:wrap;gap:8px 16px;font-size:14px}</style></head><body><main><h1>Approved design comparisons</h1><p>Original HTML is on the left; the working frontend is on the right. Each comparison shows the first 900px. Full-page source and app images are also retained in the project. Screens captured at 1440px desktop and 390px phone. The sample-data notice, responsive menus, touch areas, live counts, calculated recommendations and checkout states are intentional functional differences.</p><nav>${results.filter(r=>r.viewport===1440).map(r=>`<a href="#${r.name}-1440">${r.name}</a>`).join('')}</nav>${blocks.join('')}</main></body></html>`;
await writeFile('generated-artifacts/baksa-tales-design-comparison.html', html);
console.log(`Saved self-contained evidence for ${results.length} views; ${results.filter(r=>r.scrollWidth>r.width||r.images.length||r.errors.length).length} problem views.`);
