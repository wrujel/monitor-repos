import { promises as fs } from "fs";
import { PLACEHOLDER_SUMMARY, PLACEHOLDER_TABLE } from "../utils/constants";
import { Project, RepoStatus } from "../utils/types";

const generateSummaryHTML = (summary) => {
  const { repos_count, last_update, passed, failed } = summary;
  return `<p><ul>
            <li><span>Number of Repos: ${repos_count}</span></li>
            <li><span>Last Update: ${new Date(
              last_update
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
                .map(
                  (item) => `<tr>
                                  <td><a href="${
                                    projects.find((p) => p.repo === item.repo)
                                      .repoUrl
                                  }">${item.repo}</a></td>
                                  <td><a href="${
                                    projects.find((p) => p.repo === item.repo)
                                      .url
                                  }">Link</a></td>
                                  <td>${
                                    item.status === "passed" ? "✅" : "❌"
                                  }</td>
                                </tr>`
                )
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

  const newReadme = template
    .replace(PLACEHOLDER_SUMMARY, generateSummaryHTML(summary))
    .replace(PLACEHOLDER_TABLE, generateTableHTML(repos, projects));

  await fs.writeFile("./README.md", newReadme);
})();
