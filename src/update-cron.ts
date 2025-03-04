import { promises as fs } from "fs";

let count = 4;

const updateCron = async (filename, content) => {
  const lines = content.split(/[\r\n]+/g);
  let newLines = [];
  for (const line of lines) {
    if (line.includes("cron:")) {
      const newCron = `cron: "* */${count} * * *"`;
      newLines.push(line.replace(/cron:.*$/, newCron));
    } else {
      newLines.push(line);
    }
  }
  const newContent = newLines.join("\n");
  await fs.writeFile(`./.github/workflows/${filename}`, newContent);
};

const readFiles = async (dirname, updateCron, onError) => {
  try {
    const filenames = await fs.readdir(dirname);
    for (const filename of filenames) {
      try {
        const content = await fs.readFile(dirname + filename, "utf-8");
        await updateCron(filename, content);
      } catch (err) {
        onError(err);
      }
    }
  } catch (err) {
    onError(err);
  }
};

(async () => {
  const data = await fs.readFile(
    "./.github/workflows/last-update.json",
    "utf-8"
  );
  const lastUpdate = await JSON.parse(data);
  if (
    !lastUpdate.date ||
    new Date().getTime() - new Date(lastUpdate.date).getTime() >
      1000 * 60 * 60 * 24
  ) {
    count = [4, 6, 8, 12].filter((v) => v !== lastUpdate.lastCount)[
      Math.floor(Math.random() * 3)
    ];
    await fs.writeFile(
      "./.github/workflows/last-update.json",
      JSON.stringify({ date: new Date(), lastCount: count }, null, 2),
      {
        encoding: "utf-8",
      }
    );
    readFiles("./.github/workflows/", updateCron, (err) => {
      console.log("Error reading files", err);
      throw err;
    });
  }
})();
