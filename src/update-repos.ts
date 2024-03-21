import { promises as fs } from "fs";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { RepoModel } from "../utils/repo";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const updateRepositories = async () => {
  try {
    if (!MONGO_URI) throw new Error("DB is not defined");
    await mongoose.connect(MONGO_URI);
    await mongoose.connection.db.admin().command({ ping: 1 });
    const repos = await RepoModel.find();
    let newRepos = [];
    repos.forEach((repo: any) => {
      newRepos.push(repo.name);
    });
    await fs.writeFile("./data/repos.json", JSON.stringify(newRepos, null, 2), {
      encoding: "utf-8",
    });
  } catch (error) {
    console.error(error);
  } finally {
    await mongoose.disconnect();
  }
};

(async () => {
  updateRepositories();
  const [template, data] = await Promise.all([
    fs.readFile("./templates/repos.ts.tpl", { encoding: "utf-8" }),
    fs.readFile("./data/repos.json", { encoding: "utf-8" }),
  ]);
  const json = await JSON.parse(data);

  const newRepos = template.replace("%repos%", JSON.stringify(json));
  await fs.writeFile("./utils/repos.ts", newRepos, { encoding: "utf-8" });
})();
