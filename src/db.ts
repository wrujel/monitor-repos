import mongoose from "mongoose";
import dns from "dns";
import { RepoModel } from "../utils/models";
import { IRepository } from "../utils/types";
import dotenv from "dotenv";
dotenv.config();

dns.setServers(["8.8.8.8", "8.8.4.4"]);

const MONGO_URI = process.env.MONGO_URI;

const connectToDB = async () => {
  if (!MONGO_URI) throw new Error("DB is not defined");
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI, { family: 4 });
  }
};

export const disconnectFromDB = async () => {
  await mongoose.disconnect();
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
    return [];
  }
};

export const getPublicReposFromDB = async (): Promise<String[]> => {
  try {
    await connectToDB();
    const repos = await RepoModel.find({ private: false });
    let newRepos: String[] = [];
    repos.forEach((repo: any) => {
      newRepos.push(repo.name);
    });
    return newRepos;
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const createRepo = async (repo: IRepository) => {
  try {
    await connectToDB();
    await RepoModel.create(repo);
  } catch (error) {
    console.error(error);
  }
};

export const updateRepo = async (repo: IRepository) => {
  try {
    await connectToDB();
    await RepoModel.findOneAndUpdate({ name: repo.name }, repo);
  } catch (error) {
    console.error(error);
  }
};
