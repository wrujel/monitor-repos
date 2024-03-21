import playwright from "playwright";
import { promises as fs } from "fs";
import { Project } from "../utils/types";
import { repos } from "../utils/repos";

const ROOT_PATH = process.argv.slice(2)[0].split("=")[1];

(async () => {
  const projects: Project[] = [];
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const [data] = await Promise.all([
    fs.readFile("./data/report.json", { encoding: "utf-8" }),
  ]);
  const report = (await JSON.parse(data)).pop();

  for (const repo of repos) {
    const repoUrl = `${ROOT_PATH}/${repo}`;

    let title,
      url = "";
    for (const x of repo.split("-")) {
      title === "" ? "" : (title += " ");
      title += x.charAt(0).toUpperCase() + x.slice(1);
    }

    if (report.repos.find((x) => x.repo === repo && x.status === "passed")) {
      await page.goto(repoUrl);
      url = await page
        .locator("//a[contains(@title,'https')]")
        .first()
        .getAttribute("href");
    }

    if (url === "") {
      //TODO:notifying that the repo is not available
    }

    projects.push({ repo, title, repoUrl, url });
  }

  await fs.writeFile(
    "./data/projects.json",
    JSON.stringify(projects, null, 2),
    { encoding: "utf-8" }
  );
  await browser.close();
})();
