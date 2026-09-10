import { test, expect } from '@playwright/test';
import fs from 'node:fs/promises';
import AxeBuilder from '@axe-core/playwright';

const shots = '../docs/screenshots';
async function capture(page, name) {
  await expect(page.locator('.login-form-wrap h2, #main h1').first()).toBeVisible();
  await expect(page.locator('.loading-line')).toHaveCount(0);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${shots}/${name}.png`, fullPage: true, animations: 'disabled' });
}
async function login(page, role = 'admin') {
  await page.goto('/');
  await page.getByLabel('Work email').fill(`${role}@example.com`);
  await page.getByLabel('Password', { exact: true }).fill('demo-password');
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await expect(page.getByRole('heading', { name: 'Good to see you,' })).toBeVisible();
}

test('login, dashboard, responsive navigation, and screenshots', async ({ page }) => {
  await fs.mkdir(shots, { recursive: true });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await capture(page, 'login');
  for (const width of [360, 768, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await capture(page, `login-${width}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByLabel('Work email').fill('admin@example.com');
  await page.getByLabel('Password', { exact: true }).fill('incorrect-password');
  await page.getByRole('button', { name: 'Sign in to workspace' }).click();
  await expect(page.getByRole('alert')).toContainText('Email or password is incorrect');
  await login(page);
  await expect(page.getByText('Projects in motion', { exact: true })).toBeVisible();
  await capture(page, 'dashboard');
  for (const width of [360, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect(page.locator('body')).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await capture(page, `dashboard-${width}`);
    if (width === 360) {
      await capture(page, 'mobile');
      await page.getByRole('button', { name: 'Open navigation' }).click();
      await page.getByRole('navigation').getByRole('link', { name: 'Projects' }).click();
      await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Close navigation' })).toHaveCount(0);
      await page.goto('/');
    }
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/projects');
  await expect(page.getByRole('link', { name: 'Merchant platform Northstar Commerce' })).toBeVisible();
  await capture(page, 'projects');
  await page.getByRole('link', { name: 'Merchant platform Northstar Commerce' }).click();
  await expect(page.getByRole('heading', { name: 'Merchant platform', exact: true })).toBeVisible();
  await capture(page, 'project-detail');
  await page.goto('/analytics');
  await expect(page.getByRole('heading', { name: 'Delivery insights' })).toBeVisible();
  await capture(page, 'analytics');
  await page.goto('/admin/');
  await expect(page.getByRole('heading', { name: 'Site administration', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Users', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Select user to change' })).toBeVisible();
  await page.getByRole('link', { name: 'admin@example.com', exact: true }).click();
  await expect(page.getByLabel('Staff status')).toBeChecked();
  await expect(page.getByLabel('Role:', { exact: true })).toHaveValue('admin');
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await page.goto('/tasks');
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('core management screens fit all four viewport widths', async ({ page }) => {
  test.setTimeout(60000);
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  const projects = await (await page.request.get('/api/projects/')).json();
  const tasks = await (await page.request.get('/api/tasks/')).json();
  const project = projects.find((item) => item.code === 'MRC');
  const task = tasks.find((item) => item.project === project.id);
  for (const width of [360, 768, 1440, 1920]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const [name, path] of [
      ['projects', '/projects'],
      ['project-detail', `/projects/${project.id}`],
      ['tasks', '/tasks'],
      ['task-detail', `/tasks/${task.id}`],
      ['team', '/team'],
      ['analytics', '/analytics'],
      ['activity', '/activity'],
    ]) {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      await capture(page, `${name}-${width}`);
      if (width <= 768) {
        await expect
          .poll(() => page.locator('.sidebar').evaluate((element) => element.getBoundingClientRect().right))
          .toBeLessThanOrEqual(0);
      }
    }
  }
  expect(errors).toEqual([]);
});

test('project and task CRUD, validation, archive, restore, and persistence', async ({ page }) => {
  await login(page);
  await page.goto('/projects');
  await page.getByRole('button', { name: 'New project' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Project name').fill('Release quality review');
  await dialog.getByLabel('Project code').fill('MRC');
  await dialog.getByLabel('Client or department').fill('Delivery operations');
  await dialog.getByLabel('Target date').fill('2040-09-30');
  await dialog
    .getByLabel('Project brief')
    .fill('A release rehearsal with documented rollback and clear ownership.');
  await dialog.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(dialog.locator('[aria-invalid="true"]')).toHaveCount(1);
  await dialog.getByLabel('Project code').fill('QAUI');
  await dialog.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByLabel('Search projects').fill('Release quality review');
  await page.getByRole('link', { name: 'Release quality review Delivery operations' }).click();
  const projectURL = page.url();
  await page.getByRole('button', { name: 'Edit project' }).click();
  await dialog.getByRole('combobox', { name: 'Status', exact: true }).selectOption('active');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('On track', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New task' }).click();
  await dialog.getByLabel('Task title').fill('Verify release rollback');
  await dialog.getByRole('combobox', { name: 'Assignee', exact: true }).selectOption({ label: 'Maya Chen' });
  await dialog.getByRole('combobox', { name: 'Priority', exact: true }).selectOption('urgent');
  await dialog.getByLabel('Deadline').fill('2040-09-25');
  await dialog.getByLabel('Estimate (hours)').fill('6');
  await dialog.getByLabel('Tags (comma separated)').fill('release, qa');
  await dialog
    .getByLabel('Description', { exact: true })
    .fill('Restore the staging release and confirm data remains intact.');
  await dialog.getByRole('button', { name: 'Create task', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole('link', { name: /Verify release rollback/ }).click();
  const taskURL = page.url();
  await page.getByRole('button', { name: 'Edit task' }).click();
  await dialog.getByLabel('Task title').fill('Verify release rollback and recovery');
  await dialog.getByRole('button', { name: 'Save changes' }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByLabel('Task status').selectOption('done');
  await expect(page.getByText('Task status updated.', { exact: false })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Task status')).toHaveValue('done');
  await page.goto(projectURL);
  await expect(page.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  await page.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Restore', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New task' })).toHaveCount(0);
  await page.goto(taskURL);
  await expect(page.getByLabel('Task status')).toHaveCount(0);
  await expect(page.getByText('This task belongs to an archived project.', { exact: false })).toBeVisible();
  await page.goto(projectURL);
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Archive', exact: true })).toBeVisible();
  await page.goto(taskURL);
  await page.getByRole('button', { name: 'Delete task', exact: true }).click();
  await dialog.getByRole('button', { name: 'Keep it' }).click();
  await expect(
    page.getByRole('heading', { name: 'Verify release rollback and recovery', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Delete task', exact: true }).click();
  await dialog.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page).toHaveURL(/\/tasks$/);
  await page.goto(projectURL);
  await page.getByRole('button', { name: 'Delete project', exact: true }).click();
  await dialog.getByRole('button', { name: 'Delete permanently' }).click();
  await expect(page).toHaveURL(/\/projects$/);
  await page.reload();
  await page.getByLabel('Search projects').fill('Release quality review');
  await expect(page.getByText('No projects here yet.')).toBeVisible();
});

test('member only changes assigned task status', async ({ page }) => {
  await login(page, 'member');
  await expect(page.getByRole('button', { name: 'New task' })).toHaveCount(0);
  const tasks = await (await page.request.get('/api/tasks/')).json();
  const user = await (await page.request.get('/api/auth/me/')).json();
  const mine = tasks.find((task) => task.assignee === user.id && !task.project_archived);
  const other = tasks.find((task) => task.assignee !== user.id && !task.project_archived);
  await page.goto(`/tasks/${mine.id}`);
  await expect(page.getByRole('button', { name: 'Edit task' })).toHaveCount(0);
  await page.getByLabel('Task status').selectOption(mine.status === 'done' ? 'in_review' : 'done');
  await expect(page.getByText('Task status updated.', { exact: false })).toBeVisible();
  await page.getByLabel('Task status').selectOption(mine.status);
  await expect(page.getByLabel('Task status')).toBeEnabled();
  await page.goto(`/tasks/${other.id}`);
  await expect(page.getByLabel('Task status')).toHaveCount(0);
  await page.goto('/team');
  await expect(page.getByLabel(/Role for/)).toHaveCount(0);
  await page.goto('/admin/');
  await expect(page).toHaveURL(/\/admin\/login\//);
  await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible();
});

test('manager has work controls but cannot delete projects or manage roles', async ({ page }) => {
  await login(page, 'manager');
  await page.goto('/projects');
  await expect(page.getByRole('button', { name: 'New project' })).toBeVisible();
  await page.getByRole('link', { name: 'Merchant platform Northstar Commerce' }).click();
  await expect(page.getByRole('button', { name: 'Edit project' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Delete project' })).toHaveCount(0);
  await page.goto('/team');
  await expect(page.getByLabel(/Role for/)).toHaveCount(0);
});

test('search, filters, CSV export, analytics data, and activity', async ({ page }) => {
  await login(page);
  await page.getByLabel('Search workspace').fill('merchant');
  await page.getByLabel('Search workspace').press('Enter');
  await expect(page).toHaveURL(/q=merchant/);
  await expect(page.getByLabel('Search tasks')).toHaveValue('merchant');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByLabel('Filter by status').selectOption('done');
  await expect(page.locator('tbody .status:not(.done)')).toHaveCount(0);
  await expect(page.locator('tbody .status.done').first()).toBeVisible();
  await page.getByLabel('Filter by project').selectOption({ label: 'Merchant platform' });
  await page.getByLabel('Sort tasks').selectOption('priority');
  const downloadReady = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export work' }).click();
  const download = await downloadReady;
  const csv = await fs.readFile(await download.path(), 'utf8');
  expect(csv).toContain('Merchant platform');
  expect(csv).toContain('"Done"');
  expect(csv).not.toContain('Brand system');
  await page.goto('/analytics');
  await page.getByLabel('Analytics period').selectOption('30');
  await expect(page.getByText('Completed over the last 30 days.')).toBeVisible();
  await page.getByRole('button', { name: 'View data' }).click();
  await expect(page.locator('.chart-data tbody tr')).toHaveCount(30);
  await page.getByRole('button', { name: 'Show chart' }).click();
  await page.locator('.flow-chart g[tabindex]').first().focus();
  await expect(page.locator('.chart-caption')).toContainText('completed');
  await page.goto('/activity');
  await page.getByLabel('Filter activity by teammate').selectOption({ label: 'Jordan Lee' });
  const authors = await page.locator('.activity-item p strong').allTextContents();
  expect(authors.length).toBeGreaterThan(0);
  expect(authors.every((name) => name === 'Jordan Lee')).toBe(true);
});

test('admin role changes persist and failed submissions keep entered values', async ({ page }) => {
  await login(page);
  await page.goto('/team');
  await page.getByLabel('Role for Theo Bennett').selectOption('manager');
  await expect(page.getByLabel('Role for Theo Bennett')).toBeEnabled();
  await page.reload();
  await expect(page.getByLabel('Role for Theo Bennett')).toHaveValue('manager');
  await page.getByLabel('Role for Theo Bennett').selectOption('member');
  await expect(page.getByLabel('Role for Theo Bennett')).toBeEnabled();
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'New task' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Task title').fill('Recoverable form content');
  await page.route('**/api/tasks/', async (route) => {
    if (route.request().method() === 'POST')
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Service unavailable. Try again.' }),
      });
    else await route.continue();
  });
  await dialog.getByRole('button', { name: 'Create task', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Service unavailable');
  await expect(dialog.getByLabel('Task title')).toHaveValue('Recoverable form content');
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await page.setViewportSize({ width: 360, height: 850 });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open navigation' })).toBeFocused();
});

test('WCAG AA automated accessibility on login and core workspace screens', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  let result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  await fs.writeFile('../docs/axe-login.json', JSON.stringify(result.violations, null, 2));
  expect.soft(result.violations).toEqual([]);
  await login(page);
  for (const path of ['/', '/projects', '/tasks', '/team', '/analytics']) {
    await page.goto(path);
    await expect(page.locator('h1')).toBeVisible();
    result = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    await fs.writeFile(
      `../docs/axe-${path.slice(1) || 'dashboard'}.json`,
      JSON.stringify(result.violations, null, 2),
    );
    expect.soft(result.violations).toEqual([]);
  }
});

test('session cookies coexist with other local apps through login and logout', async ({
  page,
  context,
  baseURL,
}) => {
  await context.addCookies([
    { name: 'sessionid', value: 'another-app-session', url: baseURL },
    { name: 'csrftoken', value: 'a'.repeat(32), url: baseURL },
  ]);
  await login(page);
  let cookies = await context.cookies(baseURL);
  expect(cookies.find((cookie) => cookie.name === 'opsboard_sessionid').httpOnly).toBe(true);
  expect(cookies.find((cookie) => cookie.name === 'opsboard_csrftoken').value).toBeTruthy();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Good to see you,' })).toBeVisible();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  await page.goto('/projects');
  await expect(page.getByRole('heading', { name: 'Welcome back.' })).toBeVisible();
  cookies = await context.cookies(baseURL);
  expect(cookies.find((cookie) => cookie.name === 'sessionid').value).toBe('another-app-session');
  expect(cookies.find((cookie) => cookie.name === 'csrftoken').value).toBe('a'.repeat(32));
  expect(cookies.find((cookie) => cookie.name === 'opsboard_sessionid')).toBeUndefined();
});
