import { promises as fs } from "fs";
import {
  PASSED_STATUS,
  DEPLOY_DOWN_STATUS,
  ARCHIVE_STATUS,
  PLACEHOLDER_SUMMARY,
  PLACEHOLDER_TABLE,
  PLACEHOLDER_CHART,
} from "../utils/constants";
import { ProjectEntry, RepoStatus, Summary } from "../utils/types";

const generateSummaryHTML = (summary: Summary) => {
  return `<p><ul>
            <li><span>Number of Repos: ${summary.repos_count}</span></li>
            <li><span>Last Update: ${new Date(summary.last_update).toUTCString()}</span></li>
            <li><span>Active: ${summary.active}</span></li>
            <li><span>Deploy Down: ${summary.deploy_down}</span></li>
            <li><span>Archive: ${summary.archive}</span></li>
          </ul></p>
  `;
};

const generateTableHTML = (repos: RepoStatus[], projects: ProjectEntry[]) => {
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
                  const repoCell = project?.repoUrl
                    ? `<a href="${project.repoUrl}">${item.repo}</a>`
                    : item.repo;
                  const projectCell = project?.url
                    ? `<a href="${project.url}">Link</a>`
                    : "";
                  let statusIcon = "❌";
                  if (item.status === PASSED_STATUS) statusIcon = "✅";
                  else if (item.status === ARCHIVE_STATUS) statusIcon = "📦";
                  return `<tr>
                                  <td>${repoCell}</td>
                                  <td>${projectCell}</td>
                                  <td>${statusIcon}</td>
                                </tr>`;
                })
                .join("")}
            </tbody>
          </table>
  `;
};

const generateChartSVGContent = (
  reportEntries: { summary: Summary; repos: RepoStatus[] }[],
) => {
  const maxSlots = 90;
  const chartWidth = 800;
  const chartHeight = 200;
  const barWidth = Math.max(4, Math.floor((chartWidth - 60) / maxSlots));
  const paddingLeft = 40;
  const paddingBottom = 30;
  const plotHeight = chartHeight - paddingBottom - 10;

  // Use the last 90 entries
  const entries = reportEntries.slice(-maxSlots);
  if (entries.length === 0) return "";

  const maxRepos = Math.max(...entries.map((e) => e.summary.repos_count), 1);

  // Right-align bars so newest entries appear on the right
  const startSlot = maxSlots - entries.length;

  let bars = "";
  entries.forEach((entry, i) => {
    const x = paddingLeft + (startSlot + i) * barWidth;
    const { active = 0, deploy_down = 0, archive = 0 } = entry.summary;
    const total = active + deploy_down + archive;

    // Stacked bars (bottom to top): archive (gray), deploy-down (red), active (green)
    const archiveH = (archive / maxRepos) * plotHeight;
    const downH = (deploy_down / maxRepos) * plotHeight;
    const activeH = (active / maxRepos) * plotHeight;

    let y = chartHeight - paddingBottom;

    // archive bar
    if (archiveH > 0) {
      bars += `<rect x="${x}" y="${y - archiveH}" width="${barWidth - 1}" height="${archiveH}" fill="#9e9e9e" rx="1"/>`;
      y -= archiveH;
    }
    // deploy-down bar
    if (downH > 0) {
      bars += `<rect x="${x}" y="${y - downH}" width="${barWidth - 1}" height="${downH}" fill="#e53935" rx="1"/>`;
      y -= downH;
    }
    // active bar
    if (activeH > 0) {
      bars += `<rect x="${x}" y="${y - activeH}" width="${barWidth - 1}" height="${activeH}" fill="#43a047" rx="1"/>`;
    }
  });

  // Y-axis labels
  const yLabels = [0, Math.round(maxRepos / 2), maxRepos];
  let yAxisLabels = yLabels
    .map((v) => {
      const y = chartHeight - paddingBottom - (v / maxRepos) * plotHeight;
      return `<text x="${paddingLeft - 5}" y="${y + 4}" text-anchor="end" font-size="10" fill="#666">${v}</text>`;
    })
    .join("");

  // Legend
  const legend = `
    <rect x="${paddingLeft}" y="2" width="10" height="10" fill="#43a047" rx="2"/>
    <text x="${paddingLeft + 14}" y="11" font-size="10" fill="#666">Active</text>
    <rect x="${paddingLeft + 60}" y="2" width="10" height="10" fill="#e53935" rx="2"/>
    <text x="${paddingLeft + 74}" y="11" font-size="10" fill="#666">Deploy Down</text>
    <rect x="${paddingLeft + 150}" y="2" width="10" height="10" fill="#9e9e9e" rx="2"/>
    <text x="${paddingLeft + 164}" y="11" font-size="10" fill="#666">Archive</text>
  `;

  const totalWidth = paddingLeft + maxSlots * barWidth + 10;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${chartHeight}" viewBox="0 0 ${totalWidth} ${chartHeight}">
      <rect width="${totalWidth}" height="${chartHeight}" fill="#fff" rx="6"/>
      ${legend}
      ${yAxisLabels}
      <line x1="${paddingLeft}" y1="${chartHeight - paddingBottom}" x2="${totalWidth}" y2="${chartHeight - paddingBottom}" stroke="#ccc" stroke-width="1"/>
      ${bars}
    </svg>`;
};

(async () => {
  const [template, reportRaw, projectsRaw] = await Promise.all([
    fs.readFile("./templates/README.md.tpl", { encoding: "utf-8" }),
    fs.readFile("./data/report.json", { encoding: "utf-8" }),
    fs.readFile("./data/projects.json", { encoding: "utf-8" }),
  ]);

  const reportEntries = JSON.parse(reportRaw);
  const projects: ProjectEntry[] = JSON.parse(projectsRaw);

  const latestEntry = reportEntries[reportEntries.length - 1];
  if (!latestEntry) {
    console.log("No report entries found, skipping README generation");
    return;
  }

  const { summary, repos } = latestEntry;

  const svgContent = generateChartSVGContent(reportEntries);
  if (svgContent) {
    await fs.writeFile("./data/chart.svg", svgContent);
  }
  const chartImg = svgContent
    ? `<img src="./data/chart.svg" alt="Last 90 days chart"/>`
    : "";

  const newReadme = template
    .replace(PLACEHOLDER_SUMMARY, generateSummaryHTML(summary))
    .replace(PLACEHOLDER_CHART, chartImg)
    .replace(PLACEHOLDER_TABLE, generateTableHTML(repos, projects));

  await fs.writeFile("./README.md", newReadme);
  console.log("README.md generated");
})();
