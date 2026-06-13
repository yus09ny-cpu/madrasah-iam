import { chromium } from 'playwright'

const BASE = 'http://localhost:5173'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()

page.on('console', msg => {
  if (msg.type() === 'error') console.log('[console error]', msg.text())
})

// ─── Login ──────────────────────────────────────────────────────────────────
await page.goto(`${BASE}/login`)
await page.waitForSelector('input[type="email"]', { timeout: 30000 })
await page.fill('input[type="email"]', 'yus.bmy@yahoo.com')
await page.fill('input[type="password"]', '123456')
await page.click('button[type="submit"]')
await page.waitForURL(/dashboard/, { timeout: 30000 })
console.log('Logged in OK')

// ─── Go to Audit Jiwa ───────────────────────────────────────────────────────
await page.goto(`${BASE}/audit-jiwa`)
await page.waitForSelector('text=Mula Audit Jiwa', { timeout: 30000 })
await page.click('text=Mula Audit Jiwa')
await page.waitForTimeout(500)

// ─── Answer all 4 pillars (click score "4" for every question) ─────────────
for (let pillar = 1; pillar <= 4; pillar++) {
  const buttons = await page.locator('button:has(span:text-is("4"))').all()
  for (const b of buttons) {
    await b.click()
  }
  await page.waitForTimeout(300)

  const isLast = pillar === 4
  const nextBtnText = isLast ? 'Lihat Keputusan' : 'Pillar Seterusnya'
  await page.click(`button:has-text("${nextBtnText}")`)
  await page.waitForTimeout(500)
}

console.log('Assessment completed, on results screen')

// ─── Generate AI recommendation ─────────────────────────────────────────────
await page.click('text=Jana Preskripsi Peribadi')
await page.waitForTimeout(1000)

try {
  await page.waitForSelector('text=Diagnosis Jiwa Anda', { timeout: 60000 })
  console.log('AI recommendation received')
  const bodyText = await page.locator('body').innerText()
  const idx = bodyText.indexOf('Diagnosis Jiwa Anda')
  console.log('PREVIEW:', bodyText.substring(idx, idx + 300).replace(/\n+/g, ' '))
} catch {
  console.log('AI step failed/timeout')
  const errText = await page.locator('body').innerText()
  console.log('BODY SNIPPET:', errText.substring(0, 500))
}

await browser.close()
