import * as esbuild from "esbuild";
import { readFileSync } from "fs";
import { execSync } from "child_process";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "dist/index.js",
  external: Object.keys(pkg.dependencies || {}),
  minify: false,
  sourcemap: true,
});

execSync("npx tsc --declaration --emitDeclarationOnly --outDir dist", { stdio: "inherit" });

console.log("Build complete.");
