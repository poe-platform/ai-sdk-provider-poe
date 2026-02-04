import * as esbuild from "esbuild";
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  readdirSync,
} from "fs";
import { execSync } from "child_process";
import { join } from "path";

const pkg = JSON.parse(readFileSync("package.json", "utf-8"));
const stages = ["stable", "beta", "alpha"] as const;

// --- JS builds (esbuild) ---
for (const stage of stages) {
  await esbuild.build({
    entryPoints: ["src/index.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile: `dist/${stage}/index.js`,
    define: { __RELEASE_STAGE__: JSON.stringify(stage) },
    external: Object.keys(pkg.dependencies || {}),
    minify: false,
    sourcemap: true,
  });
}

// --- Per-stage .d.ts generation ---

const tmpBase = ".build-types-tmp";
const srcDir = "src";
const srcFiles = readdirSync(srcDir).filter((f) => f.endsWith(".ts"));

try {
  for (const stage of stages) {
    const tmpSrc = join(tmpBase, stage, "src");
    mkdirSync(tmpSrc, { recursive: true });

    for (const file of srcFiles) {
      const code = readFileSync(join(srcDir, file), "utf-8");
      writeFileSync(join(tmpSrc, file), code);
    }

    const tmpTsconfig = join(tmpBase, stage, "tsconfig.json");
    writeFileSync(
      tmpTsconfig,
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          declaration: true,
          emitDeclarationOnly: true,
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
          outDir: join("..", "..", "dist", stage),
          rootDir: "src",
        },
        include: ["src"],
      }),
    );

    execSync(`npx tsc -p ${tmpTsconfig}`, { stdio: "inherit" });
  }
} finally {
  rmSync(tmpBase, { recursive: true, force: true });
}

console.log("Built all release stages: stable, beta, alpha");
