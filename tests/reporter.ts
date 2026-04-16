import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";
import { promises as fs } from "fs";
import { ProjectEntry, RepoBadge, RepoStatus, Summary } from "../utils/types";
import {
  PASSED_STATUS,
  DEPLOY_DOWN_STATUS,
  ARCHIVE_STATUS,
} from "../utils/constants";

class ProjectsReporter implements Reporter {
  summary!: Summary;
  repos: RepoStatus[];
  projects: ProjectEntry[];

  constructor() {
    this.repos = [];
    this.projects = [];
  }

  onBegin(config: FullConfig<{}, {}>, suite: Suite): void {
    console.log("Starting test run");
    console.log(`[debug] Total test suites: ${suite.allTests().length}`);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const repo = test.title.split(": ")[1];
    let status: string;
    let color: string;

    if (result.status === "passed") {
      status = PASSED_STATUS;
      color = "green";
    } else {
      status = DEPLOY_DOWN_STATUS;
      color = "red";
    }

    console.log(
      `[debug] Test ended: ${repo} → ${result.status} (duration: ${result.duration}ms)`,
    );
    if (result.status !== "passed" && result.error) {
      console.log(`[debug] Error for ${repo}: ${result.error.message}`);
    }

    const existing = this.repos.find((x) => x.repo === repo);
    if (existing) {
      existing.status = status;
      existing.color = color;
    } else {
      this.repos.push({ repo, status, color });
    }
  }

  onEnd(result: FullResult) {
    console.log(`Test run finished with status: ${result.status}`);
  }

  async onExit(): Promise<void> {
    console.log("Saving report to file");

    // Load projects.json for full project list
    const projectsData = await fs.readFile("./data/projects.json", {
      encoding: "utf-8",
    });
    this.projects = JSON.parse(projectsData);
    console.log(
      `[debug] Loaded ${this.projects.length} projects from projects.json`,
    );

    // Add archived / no-url projects that weren't tested
    for (const project of this.projects) {
      const alreadyTested = this.repos.find((r) => r.repo === project.repo);
      if (!alreadyTested) {
        this.repos.push({
          repo: project.repo,
          status: ARCHIVE_STATUS,
          color: "gray",
        });
      }
    }

    // Compute summary
    let active = 0;
    let deploy_down = 0;
    let archive = 0;

    for (const repo of this.repos) {
      if (repo.status === PASSED_STATUS) active++;
      else if (repo.status === DEPLOY_DOWN_STATUS) deploy_down++;
      else archive++;

      repo.badge = {
        schemaVersion: 1,
        label: "status",
        message: repo.status,
        color: repo.color,
        style: "for-the-badge",
        namedLogo: "github",
      };
    }

    this.summary = {
      repos_count: this.repos.length,
      last_update: new Date().toUTCString(),
      active,
      deploy_down,
      archive,
    };
    console.log(
      `[debug] Summary: total=${this.repos.length}, active=${active}, deploy_down=${deploy_down}, archive=${archive}`,
    );

    // Write per-repo badge JSON files
    for (const repo of this.repos) {
      console.log(`[debug] Writing badge for: ${repo.repo} (${repo.status})`);
      await fs.writeFile(
        `./data/${repo.repo}.json`,
        JSON.stringify(repo.badge, null, 2),
        { encoding: "utf-8" },
      );
    }

    // Append to report.json (rolling 90 entries)
    const rawReport = await fs.readFile("./data/report.json", {
      encoding: "utf-8",
    });
    const reportJson = JSON.parse(rawReport);

    if (reportJson.length >= 90) reportJson.shift();
    const simplifiedRepos = this.repos.map(({ repo, status }) => ({
      repo,
      status,
    }));
    reportJson.push({ summary: this.summary, repos: simplifiedRepos });

    await fs.writeFile(
      "./data/report.json",
      JSON.stringify(reportJson, null, 2),
      { encoding: "utf-8" },
    );
  }
}

export default ProjectsReporter;
