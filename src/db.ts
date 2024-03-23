import mongoose from "mongoose";
import { RepoModel } from "../utils/models";
import { IRepository } from "../utils/types";
import dotenv from "dotenv";
dotenv.config();

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

export const createRepo = async (repo: IRepository) => {
  try {
    await connectToDB();
    await RepoModel.create(repo);
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
};

export const updateRepo = async (repo: IRepository) => {
  try {
    await connectToDB();
    await RepoModel.findOneAndUpdate({ name: repo.name }, repo);
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
};
