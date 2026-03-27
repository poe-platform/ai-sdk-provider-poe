import "dotenv/config";
import { fetchPoeModels } from "../src/poe-models.js";

const model = process.argv[2];
if (!model) {
  console.error("Usage: npm run code:fetch_poe_model -- <model>");
  process.exit(1);
}

const models = await fetchPoeModels();
const entry = models.find((m) => m.id === model);

if (!entry) {
  console.error(`Model "${model}" not found. Available: ${models.map((m) => m.id).join(", ")}`);
  process.exit(1);
}

console.log(JSON.stringify(entry, null, 2));
