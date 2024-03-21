import { promises as fs } from "fs";

(async () => {
  const [template, data] = await Promise.all([
    fs.readFile("./templates/repos.ts.tpl", { encoding: "utf-8" }),
    fs.readFile("./data/repos.json", { encoding: "utf-8" }),
  ]);
  const json = await JSON.parse(data);

  const newRepos = template.replace("%repos%", JSON.stringify(json));
  await fs.writeFile("./utils/repos.ts", newRepos, { encoding: "utf-8" });
})();
