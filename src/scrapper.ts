import playwright from "playwright";
import { promises as fs } from "fs";
import { Project } from "../utils/types";
import { repos } from "../utils/repos";
import { ROOT_PATH } from "../utils/constants";

(async () => {
  const projects: Project[] = [];
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const [data, data2] = await Promise.all([
    fs.readFile("./data/report.json", { encoding: "utf-8" }),
    fs.readFile("./data/projects.json", { encoding: "utf-8" }),
  ]);
  const report = (await JSON.parse(data)).pop();
  let data_projects = await JSON.parse(data2);
  console.log(data_projects);

  for (const repo of repos) {
    const repoUrl = `${ROOT_PATH}/${repo}`;

    let title = "";
    for (const x of repo.split("-")) {
      title === "" ? "" : (title += " ");
      title += x.charAt(0).toUpperCase() + x.slice(1);
    }

    let url = "";
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

    projects.push({
      repo,
      title,
      repoUrl,
      url,
    });
  }

  if (data_projects.length > 90) data_projects.shift();
  data_projects.push({
    last_update: new Date().toUTCString(),
    projects,
  });
  await fs.writeFile(
    "./data/projects.json",
    JSON.stringify(data_projects, null, 2),
    { encoding: "utf-8" }
  );
  await browser.close();
})();
