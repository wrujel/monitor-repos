import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";
import { promises as fs } from "fs";
import { RepoBadge, RepoStatus, Summary } from "../utils/types";
import { PASSED_STATUS, ROOT_PATH } from "../utils/constants";

class ProjectsReporter implements Reporter {
  summary: Summary;
  repos: RepoStatus[];
  repoBadges: RepoBadge[];

  constructor() {
    this.repos = [];
    this.repoBadges = [];
  }

  onBegin(config: FullConfig<{}, {}>, suite: Suite): void {
    if (!ROOT_PATH) throw new Error("Path is not defined");
    console.log("Starting test run");
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const repo = test.title.split(": ")[1];
    let status, color;
    let skipped = false;

    if (result.status === "passed") {
      status = PASSED_STATUS;
      color = "green";
    } else {
      status = "failed";
      color = "red";
    }

    for (const x of this.repos) {
      if (x.repo === repo) {
        if (x.status !== status) {
          x.status = status;
        }
        skipped = true;
      }
    }

    if (!skipped) {
      this.repos.push({ repo, status, color });
    }
  }

  onEnd(result: FullResult) {
    let passed = 0;
    let failed = 0;

    for (const repo of this.repos) {
      if (repo.status === PASSED_STATUS) {
        passed++;
      } else {
        failed++;
      }
      this.repoBadges.push({
        schemaVersion: 1,
        label: "status",
        message: repo.status,
        color: repo.color,
        style: "for-the-badge",
        namedLogo: "github",
        repo: repo.repo,
      });
    }

    this.summary = {
      repos_count: this.repos.length,
      last_update: new Date().toUTCString(),
      passed,
      failed,
    };

    console.log("Test run finished");
  }

  onExit(): Promise<void> {
    console.log("Saving report to file");
    return new Promise(async (resolve) => {
      const [raw_data] = await Promise.all([
        fs.readFile("./data/report.json", { encoding: "utf-8" }),
      ]);

      const json = await JSON.parse(raw_data);

      if (json.length > 90) json.shift();
      json.push({ summary: this.summary, repos: this.repos });

      await fs.writeFile("./data/report.json", JSON.stringify(json, null, 2), {
        encoding: "utf-8",
      });

      for (const badge of this.repoBadges) {
        await fs.writeFile(
          `./data/${badge.repo}.json`,
          JSON.stringify(badge, null, 2),
          { encoding: "utf-8" }
        );
      }

      resolve();
    });
  }
}

export default ProjectsReporter;
