import { promises as fs } from "fs";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { RepoModel } from "../utils/repo";
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

const getReposFromDB = async (): Promise<String[]> => {
  try {
    if (!MONGO_URI) throw new Error("DB is not defined");
    await mongoose.connect(MONGO_URI);
    await mongoose.connection.db.admin().command({ ping: 1 });
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

(async () => {
  const dbRepos = await getReposFromDB();
  const [template, data] = await Promise.all([
    fs.readFile("./templates/repos.ts.tpl", { encoding: "utf-8" }),
    fs.readFile("./data/repos.json", { encoding: "utf-8" }),
  ]);
  const repos = await JSON.parse(data);
  let newRepos = repos;
  dbRepos.forEach((repo) => {
    if (!repos.includes(repo)) {
      newRepos.push(repo);
    }
  });

  const newReposTemplate = template.replace(
    "%repos%",
    JSON.stringify(newRepos)
  );
  await fs.writeFile("./utils/repos.ts", newReposTemplate, {
    encoding: "utf-8",
  });
  await fs.writeFile("./data/repos.json", JSON.stringify(newRepos, null, 2), {
    encoding: "utf-8",
  });
})();
