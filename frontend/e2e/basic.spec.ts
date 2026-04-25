import { test, expect } from '@playwright/test'

test.describe('HelpCenter RAG E2E', () => {
  test('page loads with correct title', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle('HelpCenter RAG')
  })

  test('displays welcome message on initial load', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('HelpCenter RAG')).toBeVisible()
    await expect(page.getByText('输入问题，我将基于帮助中心文档为您解答')).toBeVisible()
  })

  test('sidebar is visible', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: '新对话' })).toBeVisible()
  })

  test('chat input is present', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByPlaceholder(/输入您的问题/)).toBeVisible()
  })
})
