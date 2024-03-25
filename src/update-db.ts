import { getReposFromDB, createRepo, updateRepo } from "./db";
import { headers } from "../utils/constants";
import { Repository } from "../utils/models";
import { IRepository } from "../utils/types";
import dotenv from "dotenv";
dotenv.config();

const GITHUB_REPOS = process.env.GITHUB_REPOS;
const GITHUB_TAG = process.env.GITHUB_TAG;

const isValueObject = (value: any) => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

(async () => {
  const rawData = await fetch(GITHUB_REPOS, headers);
  const data = await rawData.json();
  let processedData: IRepository[] = [];
  const repoObject = new Repository();
  for (const repo of data) {
    let newRepo: IRepository;
    for (const key in repo) {
      if (Object.keys(repoObject).includes(key) && !isValueObject(repo[key])) {
        newRepo = {
          ...newRepo,
          [key]: repo[key],
        };
      }
    }
    if (newRepo?.topics.includes(GITHUB_TAG)) {
      processedData.push(newRepo);
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
})();
