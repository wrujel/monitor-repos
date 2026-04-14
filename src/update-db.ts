import { getReposFromDB, createRepo, updateRepo } from "./db";
import { headers } from "../utils/constants";
import { Repository } from "../utils/models";
import { IRepository } from "../utils/types";
import { promises as fs } from "fs";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const GITHUB_REPOS = process.env.GITHUB_REPOS;
const GITHUB_TAG = process.env.GITHUB_TAG;

const isValueObject = (value: any) => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

(async () => {
  const rawData = await fetch(GITHUB_REPOS, headers);
  const data = (await rawData.json()) as any[];
  let processedData: IRepository[] = [];
  const repoObject = new Repository();
  for (const repo of data) {
    let newRepo: Partial<IRepository> = {};
    for (const key in repo) {
      if (Object.keys(repoObject).includes(key) && !isValueObject(repo[key])) {
        newRepo = {
          ...newRepo,
          [key]: repo[key],
        };
      }
    }
    if (newRepo?.topics?.includes(GITHUB_TAG)) {
      processedData.push(newRepo as IRepository);
    }
  }

  const dbRepos = await getReposFromDB();
  for (const repo of processedData) {
    if (!dbRepos.includes(repo.name)) {
      await createRepo(repo);
    } else {
      await updateRepo(repo);
    }
  }

  // Process private repos from data/private/ (skip scrapper, exclude -deploy files)
  const privateFiles = await fs.readdir("./data/private");
  const privateRepoNames = privateFiles
    .filter((f) => f.endsWith(".json") && !f.includes("-deploy"))
    .map((f) => path.basename(f, ".json"));

  for (const name of privateRepoNames) {
    const privateRepo = { name, private: true } as Partial<IRepository>;
    if (!dbRepos.includes(name)) {
      await createRepo(privateRepo as IRepository);
    } else {
      await updateRepo(privateRepo as IRepository);
    }
  }
})();
