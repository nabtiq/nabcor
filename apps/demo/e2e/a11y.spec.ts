import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const locale of ['en', 'ar'] as const) {
  test(`no serious/critical a11y violations at /${locale}`, async ({ page }) => {
    await page.goto(`/${locale}`, { waitUntil: 'networkidle' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    const impactful = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );

    const summary = impactful.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
    expect(summary, JSON.stringify(summary, null, 2)).toEqual([]);
  });

  test(`html has correct lang and dir at /${locale}`, async ({ page }) => {
    await page.goto(`/${locale}`);
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', locale);
    await expect(html).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
  });
}
