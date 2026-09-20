import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const projectRoot = process.cwd();
const folder = path.join(projectRoot, "public/notebooks");
const data = JSON.parse(await readFile(path.join(projectRoot, "data/topics.json"), "utf8"));
const topicIds = new Set(data.skillsData.map(topic => topic.id));
const notebooks = [];
for (const filename of await readdir(folder)) {
  if (!filename.endsWith(".ipynb")) continue;
  const topicId = filename.slice(0, -6);
  if (!topicIds.has(topicId)) throw new Error(`Notebook ${filename} does not match a topic ID.`);
  const notebook = JSON.parse(await readFile(path.join(folder, filename), "utf8"));
  if (notebook.nbformat !== 4 || !Array.isArray(notebook.cells)) throw new Error(`Invalid notebook: ${filename}`);
  notebooks.push(topicId);
}
notebooks.sort();
await writeFile(path.join(projectRoot, "data/notebooks.json"), JSON.stringify(notebooks, null, 2) + "\n");
console.log(`Found ${notebooks.length} topic notebooks.`);
