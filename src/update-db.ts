import { headers } from "../utils/constants";
import { RepoModel, Repository } from "../utils/models";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { IRepository } from "../utils/types";
dotenv.config();

const GITHUB_REPOS = process.env.GITHUB_REPOS;
const GITHUB_TAG = process.env.GITHUB_TAG;
const MONGO_URI = process.env.MONGO_URI;

const connectToDB = async () => {
  try {
    if (!MONGO_URI) throw new Error("DB is not defined");
    await mongoose.connect(MONGO_URI);
    await mongoose.connection.db.admin().command({ ping: 1 });
  } catch (error) {
    console.error(error);
  }
};

export const getReposFromDB = async (): Promise<String[]> => {
  try {
    await connectToDB();
    const repos = await RepoModel.find();
    let newRepos: String[] = [];
    repos.forEach((repo: any) => {
      newRepos.push(repo.name);
    });
    return newRepos;
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
};

const createRepo = async (repo: IRepository) => {
  try {
    await connectToDB();
    await RepoModel.create(repo);
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
};

const updateRepo = async (repo: IRepository) => {
  try {
    await connectToDB();
    await RepoModel.findOneAndUpdate({ name: repo.name }, repo);
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
};

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
