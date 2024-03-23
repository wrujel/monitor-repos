import { promises as fs } from "fs";
import { getReposFromDB } from "./db";

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
