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

    const existing = this.repos.find((x) => x.repo === repo);
    if (existing) {
      existing.status = status;
      existing.color = color;
    } else {
      this.repos.push({ repo, status, color });
    }
  }

  onEnd(result: FullResult) {
    console.log("Test run finished");
  }

  async onExit(): Promise<void> {
    console.log("Saving report to file");

    // Load projects.json for full project list
    const projectsData = await fs.readFile("./data/projects.json", {
      encoding: "utf-8",
    });
    this.projects = JSON.parse(projectsData);

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

    // Write per-repo badge JSON files (public repos only)
    for (const repo of this.repos) {
      const project = this.projects.find((p) => p.repo === repo.repo);
      // Skip private repos — their badges are managed externally in data/private/
      if (project && !project.repoUrl) continue;
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
    reportJson.push({ summary: this.summary, repos: this.repos });

    await fs.writeFile(
      "./data/report.json",
      JSON.stringify(reportJson, null, 2),
      { encoding: "utf-8" },
    );
  }
}

export default ProjectsReporter;
