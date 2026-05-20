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
  await page.getByRole('button', { name: /Close review/i }).click()
  await page.getByRole('button', { name: /Create helper/i }).click()
  await page.getByRole('button', { name: /Review before running/i }).first().click()
  await page.getByRole('button', { name: /Run reviewed command/i }).waitFor()
  const drawerOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  await page.getByRole('button', { name: /Close review/i }).click()

  const taskPages = [
    [/Fix warnings/i, /Check what needs attention first/i],
    [/Create helper/i, /Set up a helper without touching config/i],
    [/Add reminder/i, /Turn reminders into safe scheduled work/i],
    [/Build skills/i, /Shape OpenClaw with beginner-friendly skills/i],
    [/Review runs/i, /See what happened and what changed/i],
    [/Safety & drift/i, /Keep control without guessing/i],
  ]

  for (const [buttonName, headingName] of taskPages) {
    await page.getByRole('button', { name: buttonName }).click()
    await page.getByRole('heading', { name: headingName }).waitFor()
  }

  await page.getByRole('button', { name: /Build skills/i }).click()
  await page.getByRole('button', { name: /Review SKILL.md draft/i }).click()
  await page.getByLabel('Review setup draft').waitFor()
  await page.getByText('SKILL.md preview').waitFor()
  await page.getByText('This is a draft preview only').waitFor()
  await page.getByRole('button', { name: /Save skill draft/i }).click()
  await page.getByText(/Saved skill draft:/i).waitFor()

  await page.getByRole('button', { name: /Build skills/i }).click()
  await page.getByRole('button', { name: /Review plugin pack draft/i }).waitFor()
  await page.getByRole('button', { name: /Review plugin pack draft/i }).click()
  await page.getByText('Plugin pack preview').waitFor()
  await page.keyboard.press('Escape')
  await page.getByLabel('Review setup draft').waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: /Review plugin pack draft/i }).click()
  await page.getByRole('button', { name: /Save plugin pack/i }).click()
  await page.getByText(/Saved plugin pack:/i).waitFor()

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
  if (drawerOverflow) throw new Error('Review drawer has horizontal overflow')
  if (desktopOverflow) throw new Error('Desktop has horizontal overflow')
  if (mobileOverflow) throw new Error('Mobile has horizontal overflow')

  console.log(JSON.stringify({ ok: true, desktopOverflow, drawerOverflow, mobileOverflow }, null, 2))
} finally {
  await browser.close()
}
