import { expect, test, type Page } from "@playwright/test";

const VIEWPORTS = [
  { name: "320x568", width: 320, height: 568 },
  { name: "360x740", width: 360, height: 740 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
  { name: "landscape-short", width: 667, height: 375 },
] as const;

async function assertNoPageHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const body = document.body;
    return {
      scrollWidth: Math.max(doc.scrollWidth, body.scrollWidth),
      clientWidth: doc.clientWidth,
    };
  });
  expect(
    overflow.scrollWidth,
    `scrollWidth ${overflow.scrollWidth} > clientWidth ${overflow.clientWidth}`,
  ).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

test.describe("Responsive launch · Portal público", () => {
  for (const vp of VIEWPORTS) {
    test(`portal sem scroll horizontal · ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await expect(
        page.getByRole("heading", { name: /deixe o ontem para trás/i }),
      ).toBeVisible({ timeout: 15_000 });
      await assertNoPageHorizontalScroll(page);

      const email = page.getByLabel("E-mail de acesso");
      const box = await email.boundingBox();
      expect(box, "campo e-mail visível").toBeTruthy();
      if (box) {
        expect(box.width).toBeGreaterThan(120);
        expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 2);
      }
    });
  }
});

test.describe("Responsive launch · Forja login", () => {
  for (const vp of [
    VIEWPORTS[0],
    VIEWPORTS[2],
    VIEWPORTS[4],
  ] as const) {
    test(`forja login sem overflow · ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/forja");
      await assertNoPageHorizontalScroll(page);
    });
  }
});
