import { expect, test } from '@playwright/test'

test('public phone login form is accessible and accepts credentials', async ({ page }) => {
  await page.goto('/login')

  await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible()
  const phone = page.getByLabel('Phone number')
  const password = page.getByLabel('Password')
  await expect(phone).toHaveAttribute('type', 'tel')
  await expect(password).toHaveAttribute('type', 'password')

  await phone.fill('15551234567')
  await password.fill('Playwright!123')
  await expect(page.getByRole('button', { name: 'Log in' })).toBeEnabled()
  await expect(page.getByRole('link', { name: 'Create one' })).toHaveAttribute('href', '/signup')
})
