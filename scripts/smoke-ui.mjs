import { chromium } from 'playwright'

const url = process.env.COCKPIT_UI_URL ?? 'http://127.0.0.1:4320'
const browser = await chromium.launch()

try {
  const errors = []
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto(url, { waitUntil: 'networkidle' })

  await page.getByRole('heading', { name: /Plan changes before OpenClaw runs them/i }).waitFor()
  await page.getByRole('link', { name: 'Open OpenClaw Chat', exact: true }).waitFor()
  await page.getByRole('button', { name: /Set up a helper for this repo/i }).click()
  await page.getByRole('button', { name: /Review before running/i }).first().click()
  await page.getByLabel('Review setup draft').waitFor()

  const desktopOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true })
  mobile.on('pageerror', (error) => errors.push(error.message))
  await mobile.goto(url, { waitUntil: 'networkidle' })
  await mobile.getByRole('heading', { name: /Plan changes before OpenClaw runs them/i }).waitFor()
  const mobileOverflow = await mobile.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )

  if (errors.length > 0) throw new Error(`Page errors: ${errors.join('; ')}`)
  if (desktopOverflow) throw new Error('Desktop has horizontal overflow')
  if (mobileOverflow) throw new Error('Mobile has horizontal overflow')

  console.log(JSON.stringify({ ok: true, desktopOverflow, mobileOverflow }, null, 2))
} finally {
  await browser.close()
}
