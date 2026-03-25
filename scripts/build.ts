import * as esbuild from "esbuild";
import { readFileSync } from "fs";
import { execSync } from "child_process";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));

const shared: esbuild.BuildOptions = {
  bundle: true,
  platform: "node",
  format: "esm",
  external: Object.keys(pkg.dependencies || {}),
  minify: false,
  sourcemap: true,
};

await Promise.all([
  esbuild.build({ ...shared, entryPoints: ["src/index.ts"], outfile: "dist/index.js" }),
  esbuild.build({ ...shared, entryPoints: ["src/code/index.ts"], outfile: "dist/code.js" }),
]);

execSync("npx tsc --declaration --emitDeclarationOnly --outDir dist", { stdio: "inherit" });

console.log("Build complete.");
