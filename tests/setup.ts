import "dotenv/config";
import { afterAll } from "vitest";
import { persistAccessedKeys } from "./helpers/index.js";

afterAll(async () => {
  await persistAccessedKeys();
});
