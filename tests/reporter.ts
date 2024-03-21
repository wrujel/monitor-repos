import type {
  Reporter,
  FullConfig,
  Suite,
  TestCase,
  TestResult,
  FullResult,
} from "@playwright/test/reporter";
import { promises as fs } from "fs";
import { RepoStatus, Summary } from "../utils/types";

class ProjectsReporter implements Reporter {
  summary: Summary;
  repos: RepoStatus[];

  constructor() {
    this.repos = [];
  }

  onBegin(config: FullConfig<{}, {}>, suite: Suite): void {
    console.log("Starting test run");
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const repo = test.title.split(": ")[1];
    const status = result.status;
    let skipped = false;

    for (const x of this.repos) {
      if (x.repo === repo) {
        if (x.status !== status) {
          x.status = status;
        }
        skipped = true;
      }
    }

    if (!skipped) {
      console.log({ repo, status });
      this.repos.push({ repo, status });
    }
  }

  onEnd(result: FullResult) {
    let passed = 0;
    let failed = 0;

    for (const repo of this.repos) {
      if (repo.status === "passed") {
        passed++;
      } else {
        failed++;
      }
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

      resolve();
    });
  }
}

export default ProjectsReporter;
