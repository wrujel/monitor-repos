import { promises as fs } from "fs";
import path from "path";
import {
  PASSED_STATUS,
  PLACEHOLDER_SUMMARY,
  PLACEHOLDER_TABLE,
} from "../utils/constants";
import { Project, RepoStatus } from "../utils/types";

const generateSummaryHTML = (summary) => {
  const { repos_count, last_update, passed, failed } = summary;
  return `<p><ul>
            <li><span>Number of Repos: ${repos_count}</span></li>
            <li><span>Last Update: ${new Date(
              last_update,
            ).toUTCString()}</span></li>
            <li><span>Passed: ${passed}</span></li>
            <li><span>Failed: ${failed}</span></li>
          </ul></p>
  `;
};

const generateTableHTML = (repos: RepoStatus[], projects: Project[]) => {
  return `<table>
            <thead>
              <tr>
                <th>Repo</th>
                <th>Project</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${repos
                .map((item) => {
                  const project = projects.find((p) => p.repo === item.repo);
                  const repoCell = project.repoUrl
                    ? `<a href="${project.repoUrl}">${item.repo}</a>`
                    : item.repo;
                  const projectCell = project.url
                    ? `<a href="${project.url}">Link</a>`
                    : "";
                  return `<tr>
                                  <td>${repoCell}</td>
                                  <td>${projectCell}</td>
                                  <td>${
                                    item.status === PASSED_STATUS ? "✅" : "❌"
                                  }</td>
                                </tr>`;
                })
                .join("")}
            </tbody>
          </table>
  `;
};

(async () => {
  const [template, report, data_projects] = await Promise.all([
    fs.readFile("./templates/README.md.tpl", { encoding: "utf-8" }),
    fs.readFile("./data/report.json", { encoding: "utf-8" }),
    fs.readFile("./data/projects.json", { encoding: "utf-8" }),
  ]);

  const { summary, repos } = (await JSON.parse(report)).pop();
  const { projects } = (await JSON.parse(data_projects)).pop();

  // Read private repos (exclude -deploy files), treat all as passed
  const privateFiles = await fs.readdir("./data/private");
  const privateRepoNames = privateFiles
    .filter((f) => f.endsWith(".json") && !f.includes("-deploy"))
    .map((f) => path.basename(f, ".json"));

  const privateRepoStatuses: RepoStatus[] = privateRepoNames.map((name) => ({
    repo: name,
    status: PASSED_STATUS,
  }));
  const privateProjects: Project[] = await Promise.all(
    privateRepoNames.map(async (name) => {
      const title = name
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
      let url = "";
      try {
        const deployData = await fs.readFile(
          `./data/private/${name}-deploy.json`,
          { encoding: "utf-8" },
        );
        url = JSON.parse(deployData).url ?? "";
      } catch {
        // no deploy file for this private repo
      }
      return {
        repo: name,
        title,
        repoUrl: "",
        url,
      };
    }),
  );

  const allRepos: RepoStatus[] = [...repos, ...privateRepoStatuses];
  const allProjects: Project[] = [...projects, ...privateProjects];
  const allSummary = {
    ...summary,
    repos_count: summary.repos_count + privateRepoNames.length,
    passed: summary.passed + privateRepoNames.length,
  };

  const newReadme = template
    .replace(PLACEHOLDER_SUMMARY, generateSummaryHTML(allSummary))
    .replace(PLACEHOLDER_TABLE, generateTableHTML(allRepos, allProjects));

  await fs.writeFile("./README.md", newReadme);
})();
