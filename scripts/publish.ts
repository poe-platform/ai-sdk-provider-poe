import { execSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";

const version = process.argv[2];
if (!version) {
  console.error("Usage: tsx scripts/publish.ts <version>");
  process.exit(1);
}

const originalPkg = readFileSync("package.json", "utf-8");

try {
  const pkg = JSON.parse(originalPkg);
  pkg.version = version;

  writeFileSync("package.json", JSON.stringify(pkg, null, 2) + "\n");
  execSync("npm publish --provenance", { stdio: "inherit" });
  console.log(`Published ${version}`);
} finally {
  writeFileSync("package.json", originalPkg);
}
