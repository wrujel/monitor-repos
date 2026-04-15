import { promises as fs } from "fs";
import path from "path";
import { headers } from "../utils/constants";
import { ProjectEntry } from "../utils/types";
import dotenv from "dotenv";
dotenv.config();

const GITHUB_REPOS = process.env.GITHUB_REPOS;
const GITHUB_TAG = process.env.GITHUB_TAG;

const fetchAllRepos = async (baseUrl: string): Promise<any[]> => {
  const all: any[] = [];
  const url = new URL(baseUrl);
  url.searchParams.set("per_page", "100");
  let nextUrl: string | null = url.toString();

  while (nextUrl) {
    const res = await fetch(nextUrl, headers);
    const page = (await res.json()) as any[];
    all.push(...page);

    // Parse the Link header for the next page URL
    const link = res.headers.get("link") ?? "";
    const match = link.match(/<([^>]+)>;\s*rel="next"/);
    nextUrl = match ? match[1] : null;
  }

  return all;
};

(async () => {
  // 1. Fetch public repos from GitHub API (all pages)
  const data = await fetchAllRepos(GITHUB_REPOS!);

  const publicProjects: ProjectEntry[] = data
    .filter((repo) => repo.topics?.includes(GITHUB_TAG))
    .map((repo) => ({
      repo: repo.name,
      title: repo.name,
      repoUrl: repo.html_url,
      url: repo.homepage || "",
      archived: repo.archived || false,
    }));

  // 2. Read private repos from data/private/
  const privateFiles = await fs.readdir("./data/private");
  const privateRepoFiles = privateFiles.filter(
    (f) => f.endsWith(".json") && !f.includes("_deploy"),
  );

  const privateProjects: ProjectEntry[] = await Promise.all(
    privateRepoFiles.map(async (f) => {
      const name = path.basename(f, ".json");
      let url = "";
      try {
        const deployData = await fs.readFile(
          `./data/private/${name}_deploy.json`,
          { encoding: "utf-8" },
        );
        url = JSON.parse(deployData).url ?? "";
      } catch {
        // no deploy file for this private repo
      }
      return {
        repo: name,
        title: name,
        repoUrl: "",
        url,
        archived: false,
      };
    }),
  );

  const allProjects: ProjectEntry[] = [...publicProjects, ...privateProjects];

  // 3. Write utils/repos.ts — public non-archived repo names only (for tests)
  const publicTestableRepos = publicProjects
    .filter((p) => !p.archived)
    .map((p) => p.repo);

  const template = await fs.readFile("./templates/repos.ts.tpl", {
    encoding: "utf-8",
  });
  const reposTemplate = template.replace(
    "%repos%",
    JSON.stringify(publicTestableRepos),
  );
  await fs.writeFile("./utils/repos.ts", reposTemplate, {
    encoding: "utf-8",
  });

  // 4. Write data/repos.json — all repo names
  const allRepoNames = allProjects.map((p) => p.repo);
  await fs.writeFile(
    "./data/repos.json",
    JSON.stringify(allRepoNames, null, 2),
    { encoding: "utf-8" },
  );

  // 5. Write data/projects.json — flat project entries
  await fs.writeFile(
    "./data/projects.json",
    JSON.stringify(allProjects, null, 2),
    { encoding: "utf-8" },
  );

  // 6. Write data/projects_history.json — record date when repoUrl or url changes
  type HistoryEntry = {
    repo: string;
    repoUrl: string;
    url: string;
    changes: { date: string; field: string; from: string; to: string }[];
  };

  let history: HistoryEntry[] = [];
  try {
    const raw = await fs.readFile("./data/projects_history.json", {
      encoding: "utf-8",
    });
    history = JSON.parse(raw) as HistoryEntry[];
  } catch {
    // no existing history file
  }

  const today = new Date().toISOString().slice(0, 10);

  for (const project of allProjects) {
    const existing = history.find((h) => h.repo === project.repo);
    if (!existing) {
      history.push({
        repo: project.repo,
        repoUrl: project.repoUrl,
        url: project.url,
        changes: [],
      });
    } else {
      if (existing.repoUrl !== project.repoUrl) {
        existing.changes.push({
          date: today,
          field: "repoUrl",
          from: existing.repoUrl,
          to: project.repoUrl,
        });
        existing.repoUrl = project.repoUrl;
      }
      if (existing.url !== project.url) {
        existing.changes.push({
          date: today,
          field: "url",
          from: existing.url,
          to: project.url,
        });
        existing.url = project.url;
      }
    }
  }

  await fs.writeFile(
    "./data/projects_history.json",
    JSON.stringify(history, null, 2),
    { encoding: "utf-8" },
  );

  // Testable = all projects with a URL and not archived (public + private)
  const testableCount = allProjects.filter((p) => p.url && !p.archived).length;
  console.log(
    `Updated: ${testableCount} testable, ${allProjects.length} total projects`,
  );
})();
