import { promises as fs } from "fs";

let count = 4;

// Función para calcular el intervalo en minutos basado en ejecuciones deseadas por día
const getIntervalFromExecutionsPerDay = (executionsPerDay: number): number => {
  return Math.floor((24 * 60) / executionsPerDay);
};

const updateCron = async (filename, content) => {
  const lines = content.split(/[\r\n]+/g);
  let newLines = [];
  for (const line of lines) {
    if (line.includes("cron:")) {
      const newCron = `cron: "0 */${count} * * *"`;
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
    // Definir diferentes rangos de ejecuciones por día para mayor varianza
    const executionRanges = [
      { min: 5, max: 15 }, // Baja frecuencia: 5-15 ejecuciones/día
      { min: 15, max: 30 }, // Media frecuencia: 15-30 ejecuciones/día
      { min: 30, max: 48 }, // Alta frecuencia: 30-48 ejecuciones/día
    ];

    // Seleccionar aleatoriamente un rango
    const selectedRange =
      executionRanges[Math.floor(Math.random() * executionRanges.length)];

    // Calcular número aleatorio de ejecuciones dentro del rango seleccionado
    const executionsPerDay = Math.floor(
      Math.random() * (selectedRange.max - selectedRange.min + 1) +
        selectedRange.min
    );

    // Convertir a intervalo en minutos
    count = getIntervalFromExecutionsPerDay(executionsPerDay);

    // Asegurar que el intervalo esté entre 1 y 1440 (máximo de minutos en un día)
    count = Math.max(1, Math.min(1440, count));

    console.log(
      `Configurando ${executionsPerDay} ejecuciones por día (cada ${count} minutos)`
    );

    await fs.writeFile(
      "./.github/workflows/last-update.json",
      JSON.stringify(
        {
          date: new Date(),
          lastCount: count,
          executionsPerDay: executionsPerDay,
        },
        null,
        2
      ),
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
