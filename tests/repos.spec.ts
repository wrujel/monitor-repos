import { test, expect } from "@playwright/test";
import { repos } from "../utils/repos";
import { ROOT_PATH } from "../utils/constants";

for (const repo of repos) {
  test(`Repo: ${repo}`, async ({ page }) => {
    await page.goto(`${ROOT_PATH}/${repo}`);
    await expect(
      page.locator("(//a[contains(@title,'https')])[2]")
    ).toBeVisible();
  });
}
