import { promises as fs } from "fs";
import { PLACEHOLDER_SUMMARY, PLACEHOLDER_TABLE } from "../utils/constants";

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

const generateTableHTML = (repos) => {
  return `<table>
            <thead>
              <tr>
                <th>Repo</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${repos
                .map(
                  (item) => `<tr>
                                  <td>${item.repo}</td>
                                  <td>${item.status} ${
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
  const [template, report] = await Promise.all([
    fs.readFile("./templates/README.md.tpl", { encoding: "utf-8" }),
    fs.readFile("./data/report.json", { encoding: "utf-8" }),
  ]);

  const { summary, repos } = (await JSON.parse(report)).pop();

  const newReadme = template
    .replace(PLACEHOLDER_SUMMARY, generateSummaryHTML(summary))
    .replace(PLACEHOLDER_TABLE, generateTableHTML(repos));

  await fs.writeFile("./README.md", newReadme);
})();
