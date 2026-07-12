import { expect, test } from "@playwright/test";

test.describe("Portal de Brasa login", () => {
  test("shows password validation after filling email and submitting the main form", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: /deixe o ontem para trás/i }),
    ).toBeVisible();

    const emailInput = page.getByLabel("E-mail de acesso");
    const passwordInput = page.getByLabel("Senha de acesso");
    const submit = page.getByRole("button", { name: "REACENDER MINHA CHAMA" });

    await expect(emailInput).toBeEditable();
    await expect(passwordInput).toBeEditable();
    await expect(submit).toBeEnabled();

    await emailInput.fill("qa@meccafit.com");
    await expect(emailInput).toHaveValue("qa@meccafit.com");
    await passwordInput.fill("");

    await submit.click();

    await expect(
      page.getByRole("alert").filter({ hasText: /Informe.*senha/i }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
