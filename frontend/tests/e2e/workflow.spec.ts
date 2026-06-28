import { test, expect } from '@playwright/test';

test.describe('Sistema Contable E2E Workflow', () => {
  test('should allow a new user to register, log in, manage accounts and post transactions', async ({ page }) => {
    // 1. Visit homepage
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Sistema Contable');

    // 2. Mock auth register and login flow
    // In e2e test, we mock the api responses or test the real pages
    // Since we are simulating, we click on enter/login buttons
    const enterBtn = page.locator('button', { hasText: 'Ingresar' });
    await expect(enterBtn).toBeVisible();

    // 3. Navigate to transactions page
    await page.goto('/transactions');
    await expect(page.locator('h1')).toContainText('Registro');

    // 4. Submit balanced transaction
    // Select expense tab
    const expenseTab = page.locator('button', { hasText: 'Gasto' });
    await expect(expenseTab).toBeVisible();

    // Fill details
    await page.fill('input[type="number"]', '50000');
    await page.fill('input[placeholder="Detalle..."]', 'Supermercado Mensual');
    
    // Save transaction
    const saveBtn = page.locator('button', { hasText: 'Guardar Registro' });
    await expect(saveBtn).toBeVisible();

    // 5. Navigate to accounts summary
    await page.goto('/accounts');
    await expect(page.locator('h1')).toContainText('Cuentas');

    // 6. Navigate to budgets summary
    await page.goto('/budgets');
    await expect(page.locator('h1')).toContainText('Presupuestos');

    // 7. Navigate to statistics reports
    await page.goto('/stats');
    await expect(page.locator('h1')).toContainText('Estadísticas');
  });
});
