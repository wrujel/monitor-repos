import { test, expect } from "@playwright/test";
import { ProjectEntry } from "../utils/types";
import { readFileSync } from "fs";

enum SlowHost {
  Render = "onrender.com",
}

const SLOW_HOST_TIMEOUT = 5 * 60 * 1000; // 5 minutes per attempt
const DEFAULT_TIMEOUT = 30 * 1000; // 30 seconds
const SLOW_HOST_RETRIES = 3;
const RETRY_BASE_BACKOFF_MS = 10 * 1000; // 10s, 20s, 40s...

// Total backoff across all waits between N attempts: base * (2^(N-1) - 1)
const totalBackoffMs = (retries: number): number =>
  RETRY_BASE_BACKOFF_MS * ((1 << (retries - 1)) - 1);

const exponentialBackoffMs = (attempt: number): number =>
  RETRY_BASE_BACKOFF_MS * (1 << (attempt - 1));

const isSlowHost = (url: string): boolean =>
  Object.values(SlowHost).some((host) => url.includes(host));

const getTimeout = (url: string): number =>
  isSlowHost(url) ? SLOW_HOST_TIMEOUT : DEFAULT_TIMEOUT;

const projects: ProjectEntry[] = JSON.parse(
  readFileSync("./data/projects.json", { encoding: "utf-8" }),
);

for (const project of projects) {
  if (!project.url || project.archived) continue;

  test(`Repo: ${project.repo}`, async ({ page }) => {
    const timeout = getTimeout(project.url);
    const retries = isSlowHost(project.url) ? SLOW_HOST_RETRIES : 1;
    // Total test budget covers all attempts + exponential backoffs between them
    test.setTimeout(timeout * retries + totalBackoffMs(retries));

    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await page.goto(project.url, {
          timeout,
          waitUntil: "load",
        });
        expect(response?.ok()).toBeTruthy();
        return;
      } catch (e) {
        lastError = e as Error;
        if (attempt < retries) {
          const delay = exponentialBackoffMs(attempt);
          console.log(
            `[${project.repo}] Attempt ${attempt}/${retries} failed, retrying in ${delay / 1000}s...`,
          );
          await page.waitForTimeout(delay);
        }
      }
    }
    throw lastError;
  });
}
