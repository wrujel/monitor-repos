import playwright from "playwright";
import { promises as fs } from "fs";
import { Project } from "../utils/types";
import { repos } from "../utils/repos";
import { PASSED_STATUS, ROOT_PATH } from "../utils/constants";
import mailgun from "mailgun-js";
import dotenv from "dotenv";
dotenv.config();

const DOMAIN = process.env.MAILGUN_DOMAIN;
const API_KEY = process.env.MAILGUN_API_KEY;

const generateMessage = (repos: string[]) => {
  return {
    from: process.env.FROM_EMAIL,
    to: process.env.TO_EMAIL,
    subject: "Monitor Repos - Missing Projects",
    html: `<p>The following repos are not available:</p><ul>${repos
      .map((repo) => `<li>${repo}</li>`)
      .join("")}</ul>`,
  };
};

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
  let missing_projects = [];

  for (const repo of repos) {
    const repoUrl = `${ROOT_PATH}/${repo}`;

    let title = "";
    for (const x of repo.split("-")) {
      title === "" ? "" : (title += " ");
      title += x.charAt(0).toUpperCase() + x.slice(1);
    }

    let url = "";
    if (
      report.repos.find((x) => x.repo === repo && x.status === PASSED_STATUS)
    ) {
      await page.goto(repoUrl);
      url = await page
        .locator("//a[contains(@title,'https')]")
        .first()
        .getAttribute("href");
    }

    if (url === "") {
      missing_projects.push(repo);
    }

    projects.push({
      repo,
      title,
      repoUrl,
      url,
    });
  }

  if (missing_projects.length > 0) {
    const mg = mailgun({
      apiKey: API_KEY,
      domain: DOMAIN,
    });
    const message = generateMessage(missing_projects);
    try {
      await mg.messages().send(message);
    } catch (error) {
      console.error(error);
    }
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
