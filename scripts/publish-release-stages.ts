import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

const version = process.argv[2];
if (!version) {
  console.error("Usage: tsx scripts/publish-release-stages.ts <version>");
  process.exit(1);
}

const stages = ["stable", "beta", "alpha"] as const;
const originalPkg = readFileSync("package.json", "utf-8");

try {
  for (const stage of stages) {
    const pkg = JSON.parse(originalPkg);

    pkg.main = `./dist/${stage}/index.js`;
    pkg.types = `./dist/${stage}/index.d.ts`;
    pkg.exports["."] = {
      types: `./dist/${stage}/index.d.ts`,
      import: `./dist/${stage}/index.js`,
    };
    pkg.version = stage === "stable" ? version : `${version}-${stage}`;

    writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");

    const tag = stage === "stable" ? "latest" : stage;
    execSync(`npm publish --tag ${tag} --provenance`, { stdio: "inherit" });
    console.log(`Published ${pkg.version} to @${tag}`);
  }
} finally {
  writeFileSync("package.json", originalPkg);
}
