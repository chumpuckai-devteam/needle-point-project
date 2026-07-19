import { chromium } from '@playwright/test';
import fs from 'fs';
const out = new URL('../dogfood-output/screenshots/', import.meta.url);
fs.mkdirSync(out, { recursive: true });
const outPath = out.pathname;
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const page = await context.newPage();
async function shot(name, url) {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${outPath}${name}.png`, fullPage: true });
  console.log('shot', name, page.url());
}
await shot('01-studio-guest', 'https://needle-point-project.vercel.app/');
await page.goto('https://needle-point-project.vercel.app/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Like' }).first().click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${outPath}02-like-gates-auth.png`, fullPage: true });
console.log('after like', page.url());
await shot('03-canopy-store', 'https://needle-point-project.vercel.app/stores/canopycanvas');
await shot('04-thread-follow', 'https://needle-point-project.vercel.app/stores/threadandtonic');
await page.goto('https://needle-point-project.vercel.app/stores/threadandtonic', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Follow store/i }).click();
await page.waitForTimeout(1000);
await page.screenshot({ path: `${outPath}04b-follow-gates-auth.png`, fullPage: true });
console.log('after follow', page.url());
await shot('05-bookshop-door-stl', 'https://needle-point-project.vercel.app/projects/e36a3046-812f-469c-9331-330336099ccb');
await shot('06-shops-list', 'https://needle-point-project.vercel.app/stores');
await shot('07-stitch-along', 'https://needle-point-project.vercel.app/stitch-along');
await shot('08-auth', 'https://needle-point-project.vercel.app/auth');
await page.goto('https://needle-point-project.vercel.app/', { waitUntil: 'networkidle' });
const navText = await page.locator("nav[aria-label='Primary navigation']").innerText();
console.log('NAV:', JSON.stringify(navText.replace(/\s+/g,' ')));
console.log('hasNewPost', /new post/i.test(navText));
await browser.close();
console.log('ok');
