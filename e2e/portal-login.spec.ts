import { expect, test } from "@playwright/test";

test.describe("Portal de Brasa login", () => {
  test("shows password validation after filling email and submitting the main form", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: /deixe o ontem para trás/i }),
    ).toBeVisible();
    await expect(page.getByLabel("E-mail de acesso")).toBeVisible();
    await expect(page.getByLabel("Senha de acesso")).toBeVisible();

    await page.getByLabel("E-mail de acesso").fill("qa@meccafit.com");
    await expect(page.getByLabel("E-mail de acesso")).toHaveValue("qa@meccafit.com");
    await page.getByRole("button", { name: "REACENDER MINHA CHAMA" }).click();

    await expect(
      page.getByRole("alert").filter({
        hasText: /Informe (a senha de teste|sua senha de acesso)/i,
      }),
    ).toBeVisible();
  });
});
