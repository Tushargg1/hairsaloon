import { expect, test } from '@playwright/test'

test('customer signup verifies an OTP without an SMS provider', async ({ page }) => {
  await page.route('**/api/platform/auth/me', (route) => route.fulfill({
    status: 401,
    contentType: 'application/json',
    body: JSON.stringify({ message: 'Unauthenticated' }),
  }))
  await page.route('**/api/platform/auth/otp/request', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      phone: '15551234567',
      purpose: 'SIGNUP',
    })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        challengeId: 'challenge-e2e',
        expiresInSeconds: 300,
        resendAfterSeconds: 30,
      }),
    })
  })
  await page.route('**/api/platform/auth/otp/verify', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      challengeId: 'challenge-e2e',
      code: '123456',
    })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ verificationProof: 'proof-e2e' }),
    })
  })
  await page.route('**/api/platform/auth/signup', async (route) => {
    expect(route.request().postDataJSON()).toEqual({
      phone: '15551234567',
      email: 'customer@example.com',
      password: 'Playwright!123',
      verificationProof: 'proof-e2e',
    })
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 1, phone: '15551234567', role: 'CUSTOMER' }),
    })
  })

  await page.goto('/signup')
  await page.getByLabel('Phone number').fill('15551234567')
  await page.getByRole('button', { name: 'Send verification code' }).click()
  await expect(page.getByText('Step 2 of 3')).toBeVisible()

  await page.getByLabel('Verification code').fill('123456')
  await page.getByRole('button', { name: 'Verify code' }).click()
  await expect(page.getByText('Step 3 of 3')).toBeVisible()

  await page.getByLabel('Email').fill('customer@example.com')
  await page.getByLabel('Password').fill('Playwright!123')
  await page.getByRole('button', { name: 'Create account' }).click()
  await expect(page).toHaveURL(/\/salons$/)
})