import { expect, test, type Page } from "@playwright/test";

const SEED_PASSWORD = process.env.ARGOS_SEED_PASSWORD?.trim() || "senha123";

const VIEWPORTS = [
  { name: "320x568", width: 320, height: 568 },
  { name: "360x740", width: 360, height: 740 },
  { name: "390x844", width: 390, height: 844 },
  { name: "430x932", width: 430, height: 932 },
] as const;

const CLIENT_TABS = [
  { id: "treino", label: /Treino/i },
  { id: "evolucao", label: /Evolu/i },
  { id: "comunidade", label: /Comunidade/i },
  { id: "perfil", label: /Perfil/i },
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
  ).toBeLessThanOrEqual(overflow.clientWidth + 2);
}

async function dismissBlockingOverlays(page: Page) {
  // Juramento / apresentação / callouts — tenta avançar ou fechar se aparecerem.
  for (let i = 0; i < 6; i += 1) {
    const skip = page.getByRole("button", {
      name: /Pular apresentação|Entendi|Sair|Continuar|Acender/i,
    });
    if (await skip.first().isVisible().catch(() => false)) {
      await skip.first().click({ force: true }).catch(() => undefined);
      await page.waitForTimeout(400);
      continue;
    }
    break;
  }
}

async function loginCliente(page: Page) {
  await page.goto("/");
  await page.getByLabel("E-mail de acesso").fill("cliente@meccafit.com");
  await page.getByLabel("Senha de acesso").fill(SEED_PASSWORD);
  await page.getByRole("button", { name: /REACENDER MINHA CHAMA/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 45_000 });
  await dismissBlockingOverlays(page);
}

async function loginForjador(page: Page) {
  await page.goto("/forja");
  const email = page.getByLabel(/E-mail/i).first();
  const password = page.getByLabel(/Senha/i).first();
  await email.fill("forjador@meccafit.com");
  await password.fill(SEED_PASSWORD);
  await page.getByRole("button", { name: /entrar|acessar|forjar|reacender/i }).first().click();
  await page.waitForURL(/\/(forjador|dashboard\/forja)/, { timeout: 45_000 });
}

test.describe("Responsive launch · Cliente autenticado", () => {
  test.describe.configure({ mode: "serial" });

  for (const vp of VIEWPORTS) {
    test(`tabs sem overflow · ${vp.name}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await loginCliente(page);

      const nav = page.getByRole("navigation", { name: /Navegação principal/i });
      await expect(nav).toBeVisible();

      const navBox = await nav.boundingBox();
      expect(navBox, "bottom nav visível").toBeTruthy();
      if (navBox) {
        expect(navBox.y + navBox.height).toBeGreaterThan(vp.height - 120);
      }

      for (const tab of CLIENT_TABS) {
        const tabBtn = nav.getByRole("button", { name: tab.label });
        if (await tabBtn.isVisible().catch(() => false)) {
          await tabBtn.click();
          await page.waitForTimeout(600);
          await dismissBlockingOverlays(page);
          await assertNoPageHorizontalScroll(page);
        }
      }
    });
  }
});

test.describe("Responsive launch · Forjador autenticado", () => {
  for (const vp of [VIEWPORTS[0], VIEWPORTS[2]] as const) {
    test(`workspace sem overflow · ${vp.name}`, async ({ page }) => {
      test.setTimeout(90_000);
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await loginForjador(page);
      await assertNoPageHorizontalScroll(page);

      const workspaceNav = page.getByRole("navigation", { name: /Navegação forjador/i });
      if (await workspaceNav.isVisible().catch(() => false)) {
        const box = await workspaceNav.boundingBox();
        expect(box?.height ?? 999).toBeLessThan(120);
      }
    });
  }
});
