import { promises as fs } from "fs";
import {
  PASSED_STATUS,
  DEPLOY_DOWN_STATUS,
  ARCHIVE_STATUS,
  PLACEHOLDER_SUMMARY,
  PLACEHOLDER_TABLE,
  PLACEHOLDER_CHART,
  PLACEHOLDER_CHART_REPOS,
} from "../utils/constants";
import { ProjectEntry, Report, RepoStatus, Summary } from "../utils/types";
import {
  SLOTS,
  StatusStyles,
  buildOverviewCard,
  buildStripCard,
} from "../utils/cards";

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

/* ── Charts ────────────────────────────────────────────────────────────────
 *
 * Both charts are the status-page card drawn in utils/cards.ts: 90 day-bars
 * under a title and a state badge, with the uptime over that window written
 * between "90 days ago" and "Today". All this module supplies is what our
 * three repo states look like and how a day maps onto them.
 */

const REPO_STYLES: StatusStyles = {
  [PASSED_STATUS]: {
    bar: "#9fd8a3",
    badge: "#2da44e",
    label: "Active",
    glyph: "check",
  },
  [DEPLOY_DOWN_STATUS]: {
    bar: "#e5534b",
    badge: "#cf222e",
    label: "Deploy down",
    legend: "Deploy Down",
    glyph: "cross",
  },
  [ARCHIVE_STATUS]: {
    bar: "#b1bac4",
    badge: "#6e7781",
    label: "Archived",
    legend: "Archive",
    glyph: "dash",
  },
};

/** Stacked bottom to top, the order the chart has always used. */
const STACK_ORDER = [ARCHIVE_STATUS, DEPLOY_DOWN_STATUS, PASSED_STATUS];

const normalize = (status: string) =>
  status in REPO_STYLES ? status : DEPLOY_DOWN_STATUS;

/**
 * Days up over days deployed. Archived days are left out of both halves — a
 * repo that is meant to be dormant should not read as downtime — so a window
 * with nothing but archived days has no uptime to report.
 */
const uptimeOf = (active: number, down: number) =>
  active + down > 0 ? (active / (active + down)) * 100 : null;

/** The worst thing any repo is doing right now. */
const fleetStatus = (repos: RepoStatus[]) =>
  repos.some((r) => r.status === DEPLOY_DOWN_STATUS)
    ? DEPLOY_DOWN_STATUS
    : repos.some((r) => r.status === PASSED_STATUS)
      ? PASSED_STATUS
      : ARCHIVE_STATUS;

/**
 * Every repo on one strip: each day is a full-height bar split between
 * archived, deploy-down and active in proportion to that day's counts, so a
 * single red sliver still reads at a glance.
 */
const generateChartSVGContent = (reportEntries: Report[]) => {
  const entries = reportEntries.slice(-SLOTS);
  if (entries.length === 0) return "";

  const days: (Record<string, number> | null)[] = new Array(SLOTS).fill(null);
  const startSlot = SLOTS - entries.length;
  let active = 0;
  let down = 0;

  entries.forEach((entry, i) => {
    const counts: Record<string, number> = {};
    for (const repo of entry.repos) {
      const status = normalize(repo.status);
      counts[status] = (counts[status] ?? 0) + 1;
    }
    active += counts[PASSED_STATUS] ?? 0;
    down += counts[DEPLOY_DOWN_STATUS] ?? 0;
    days[startSlot + i] = counts;
  });

  return buildOverviewCard({
    title: "All Repos",
    days,
    order: STACK_ORDER,
    status: fleetStatus(entries[entries.length - 1].repos),
    uptime: uptimeOf(active, down),
    styles: REPO_STYLES,
    legend: [PASSED_STATUS, DEPLOY_DOWN_STATUS, ARCHIVE_STATUS],
  });
};

/**
 * One card per repo, written to ./data/chart-<repo>.svg and laid out two per
 * row so the markdown table's own cell borders draw the grid.
 */
const generatePerRepoCharts = async (
  reportEntries: Report[],
): Promise<string> => {
  const entries = reportEntries.slice(-SLOTS);
  if (entries.length === 0) return "";

  const latestEntry = entries[entries.length - 1];
  const startSlot = SLOTS - entries.length;

  const cells: string[] = [];

  for (const repo of latestEntry.repos) {
    // Left to right is oldest to newest; a day the repo was not tracked stays
    // undefined and is drawn as the "no data" grey.
    const days: (string | undefined)[] = new Array(SLOTS).fill(undefined);
    let active = 0;
    let down = 0;

    entries.forEach((entry, i) => {
      const r = entry.repos.find((r) => r.repo === repo.repo);
      if (!r) return;
      const status = normalize(r.status);
      days[startSlot + i] = status;
      if (status === PASSED_STATUS) active++;
      else if (status === DEPLOY_DOWN_STATUS) down++;
    });

    const svg = buildStripCard({
      title: repo.repo,
      days,
      status: normalize(repo.status),
      uptime: uptimeOf(active, down),
      styles: REPO_STYLES,
    });

    await fs.writeFile(`./data/chart-${repo.repo}.svg`, svg);
    cells.push(
      `<td><img src="./data/chart-${repo.repo}.svg" alt="${repo.repo}"/></td>`,
    );
  }

  if (cells.length === 0) return "";

  const cols = 2;
  const rows: string[] = [];
  for (let i = 0; i < cells.length; i += cols) {
    rows.push(`<tr>${cells.slice(i, i + cols).join("")}</tr>`);
  }
  return `<table>${rows.join("")}</table>`;
};

(async () => {
  const [template, reportRaw, projectsRaw] = await Promise.all([
    fs.readFile("./templates/README.md.tpl", { encoding: "utf-8" }),
    fs.readFile("./data/report.json", { encoding: "utf-8" }),
    fs.readFile("./data/projects.json", { encoding: "utf-8" }),
  ]);

  const reportEntries: Report[] = JSON.parse(reportRaw);
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

  const repoChartsHTML = await generatePerRepoCharts(reportEntries);

  const newReadme = template
    .replace(PLACEHOLDER_SUMMARY, generateSummaryHTML(summary))
    .replace(PLACEHOLDER_CHART, chartImg)
    .replace(PLACEHOLDER_CHART_REPOS, repoChartsHTML)
    .replace(PLACEHOLDER_TABLE, generateTableHTML(repos, projects));

  await fs.writeFile("./README.md", newReadme);
  console.log("README.md generated");
})();
