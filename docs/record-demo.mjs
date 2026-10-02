// Records docs/demo.gif. Needs the dev server on port 5199 and Playwright:
//   npm run dev -- --port 5199 &
//   npx -y -p playwright@1 node docs/record-demo.mjs   (then convert the .webm with ffmpeg)
import { chromium } from 'playwright';

const W = 390, H = 800;
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: W, height: H },
  deviceScaleFactor: 1,
  recordVideo: { dir: '/tmp/pg-rec/video', size: { width: W, height: H } },
});

// Visible cursor with a click ripple; headless video shows no cursor.
await context.addInitScript(() => {
  addEventListener('DOMContentLoaded', () => {
    const c = document.createElement('div');
    c.innerHTML = '<svg width="22" height="22" viewBox="0 0 24 24"><path d="M3 2l7 19 2.5-7.5L20 11z" fill="#fff" stroke="#111" stroke-width="1.5"/></svg>';
    Object.assign(c.style, { position: 'fixed', left: '0', top: '0', zIndex: 99999, pointerEvents: 'none', transform: 'translate(195px,400px)' });
    document.body.appendChild(c);
    addEventListener('mousemove', e => { c.style.transform = `translate(${e.clientX - 3}px,${e.clientY - 2}px)`; }, true);
    addEventListener('mousedown', e => {
      const r = document.createElement('div');
      Object.assign(r.style, { position: 'fixed', left: e.clientX - 18 + 'px', top: e.clientY - 18 + 'px', width: '36px', height: '36px',
        borderRadius: '50%', background: 'rgba(255,170,80,.45)', zIndex: 99998, pointerEvents: 'none', transition: 'all .45s ease-out' });
      document.body.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = 'scale(1.8)'; r.style.opacity = '0'; });
      setTimeout(() => r.remove(), 500);
    }, true);
  });
});

const page = await context.newPage();
await page.goto('http://localhost:5199/');
await page.waitForTimeout(1200);

async function clickOn(locator, pause = 700) {
  const box = await locator.first().boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y, { steps: 18 });
  await page.waitForTimeout(120);
  await page.mouse.down(); await page.waitForTimeout(60); await page.mouse.up();
  await page.waitForTimeout(pause);
}
const btn = (name) => page.getByRole('button', { name, exact: false });

await clickOn(btn('Zeig die Antwort'), 900);
await clickOn(btn('Gut'), 700);
await clickOn(btn('Zeig die Antwort'), 900);
await clickOn(btn('Easy'), 700);
await clickOn(btn('Zeig die Antwort'), 800);
await clickOn(btn('Gut'), 600);
await clickOn(page.getByRole('button', { name: 'schrift', exact: true }), 700);
await clickOn(page.getByText('Hanzi (HSK 1)'), 700);
await clickOn(btn('Zeig Aussprache'), 1100);
await clickOn(btn('Gut'), 700);
await clickOn(btn('Zeig Aussprache'), 1000);
await clickOn(btn('Easy'), 600);
await clickOn(page.getByRole('button', { name: 'stats', exact: true }), 900);
await page.mouse.move(W / 2, H / 2, { steps: 10 });
await page.mouse.wheel(0, 500); await page.waitForTimeout(900);
await page.mouse.wheel(0, -500); await page.waitForTimeout(700);
await clickOn(page.getByRole('button', { name: 'lernen', exact: true }), 1000);

const video = page.video();
await context.close();
console.log(await video.path());
await browser.close();
