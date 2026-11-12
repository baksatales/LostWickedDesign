// Makes a self-contained, downloadable visual review from the screenshot run.
import { readFile, writeFile } from 'node:fs/promises';
const directory = 'generated-artifacts/approved-comparison';
const results = JSON.parse(await readFile(`${directory}/results.json`, 'utf8'));
const blocks = [];
for (const view of results) {
  const hasSource = !view.sampleAccount && !view.customModule;
  const image = await readFile(`${directory}/${view.name}-${view.viewport}-${hasSource ? 'side-by-side' : 'app'}.jpg`);
  blocks.push(`<section id="${view.name}-${view.viewport}"><h2>${view.name} · ${view.viewport}px</h2><p>${view.route} · ${hasSource ? 'Source left, frontend right' : 'App capture only — no corresponding approved frame supplied'} · Overflow ${view.scrollWidth-view.width}px · Broken images ${view.images.length} · Browser errors ${view.errors.length}</p><img loading="lazy" alt="${view.name} at ${view.viewport}px" src="data:image/jpeg;base64,${image.toString('base64')}"></section>`);
}
for (const width of [1440, 390]) {
  const image = await readFile(`generated-artifacts/homepage-v5/compare-${width}.jpg`);
  blocks.unshift(`<section><h2>Homepage V5 · ${width}px</h2><p>Approved V5 export on the left; working homepage on the right. The existing functional header, one sample footer disclosure and working form controls are intentional differences.</p><img alt="Homepage V5 comparison" src="data:image/jpeg;base64,${image.toString('base64')}"></section>`);
}
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Baksa Tales — approved design screenshot comparisons</title><style>body{margin:0;background:#f6f3df;color:#2b1712;font:18px/1.5 Georgia,serif}main{max-width:1500px;margin:auto;padding:24px}h1,h2{font-weight:500}h1{color:#611811}section{margin:36px 0}img{display:block;width:100%;height:auto;border:1px solid #dccab0}a{color:#611811}nav{display:flex;flex-wrap:wrap;gap:8px 16px;font-size:14px}</style></head><body><main><h1>Approved design comparisons</h1><p>Original HTML is on the left; the working frontend is on the right. Each comparison shows the first 900px. Full-page source and app images are also retained in the project. Screens captured at 1440px desktop and 390px phone. The sample-data notice, responsive menus, touch areas, live counts, calculated recommendations and checkout states are intentional functional differences.</p><nav>${results.filter(r=>r.viewport===1440).map(r=>`<a href="#${r.name}-1440">${r.name}</a>`).join('')}</nav>${blocks.join('')}</main></body></html>`;
await writeFile('generated-artifacts/baksa-tales-design-comparison.html', html);
console.log(`Saved self-contained evidence for ${results.length} views; ${results.filter(r=>r.scrollWidth>r.width||r.images.length||r.errors.length).length} problem views.`);
