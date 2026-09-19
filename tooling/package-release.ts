import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  cpSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";

const version = process.env.CADENCE_RELEASE_VERSION ?? "0.1.0-alpha.1";
if (!/^\d+\.\d+\.\d+(?:-[a-z0-9.]+)?$/.test(version))
  throw new Error("Invalid release version");
const output = resolve("artifacts/packages");
const tarballs = resolve("artifacts/release");
rmSync(output, { recursive: true, force: true });
rmSync(tarballs, { recursive: true, force: true });
mkdirSync(tarballs, { recursive: true });
function run(command: string, args: string[], cwd = process.cwd()) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stdout + result.stderr);
  return result.stdout;
}
run("pnpm", ["exec", "tsc", "-p", "tsconfig.packages.json"]);
const checksums: string[] = [];
for (const directory of readdirSync("packages")) {
  const source = resolve("packages", directory);
  const destination = resolve(output, directory);
  const manifest = JSON.parse(readFileSync(`${source}/package.json`, "utf8"));
  manifest.version = version;
  manifest.repository = {
    type: "git",
    url: "https://github.com/Lojhan/cadence.git",
    directory: `packages/${directory}`,
  };
  for (const [entry, path] of Object.entries(manifest.exports) as [
    string,
    string,
  ][]) {
    if (/\.tsx?$/.test(path))
      manifest.exports[entry] = {
        types: path.replace(/\.tsx?$/, ".d.ts"),
        import: path.replace(/\.tsx?$/, ".js"),
      };
  }
  for (const [name, constraint] of Object.entries(
    manifest.dependencies ?? {},
  )) {
    if (name.startsWith("@cadence/")) {
      manifest.dependencies[name] =
        `https://github.com/Lojhan/cadence/releases/download/v${version}/cadence-${name.slice(9)}-${version}.tgz`;
    } else if (constraint === "catalog:") {
      manifest.dependencies[name] = JSON.parse(
        readFileSync(`${source}/node_modules/${name}/package.json`, "utf8"),
      ).version;
    }
  }
  delete manifest.devDependencies;
  delete manifest.scripts;
  manifest.files = ["src", "generated", "migrations", "LICENSE", "README.md"];
  cpSync("LICENSE", `${destination}/LICENSE`);
  writeFileSync(
    `${destination}/README.md`,
    `# ${manifest.name}\n\nMIT-licensed Cadence package. See https://github.com/Lojhan/cadence for source, documentation, and release status.\n`,
  );
  writeFileSync(
    `${destination}/package.json`,
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
  if (directory === "audio-engine")
    cpSync(`${source}/generated`, `${destination}/generated`, {
      recursive: true,
    });
  if (directory === "db")
    cpSync(`${source}/migrations`, `${destination}/migrations`, {
      recursive: true,
    });
  if (directory === "ui")
    cpSync(`${source}/src/styles.css`, `${destination}/src/styles.css`);
  if (directory === "audio-browser") {
    cpSync(`${source}/src/capture.js`, `${destination}/src/capture.js`);
    const entry = `${destination}/src/index.js`;
    writeFileSync(
      entry,
      readFileSync(entry, "utf8").replace(
        'new URL("./worker.ts", import.meta.url)',
        'new URL("./worker.js", import.meta.url)',
      ),
    );
  }
  run("pnpm", ["pack", "--pack-destination", tarballs], destination);
  const filename = `cadence-${directory}-${version}.tgz`;
  checksums.push(
    `${createHash("sha256")
      .update(readFileSync(`${tarballs}/${filename}`))
      .digest("hex")}  ${filename}`,
  );
}
writeFileSync(`${tarballs}/SHA256SUMS`, `${checksums.join("\n")}\n`);
console.log(`Packed ${checksums.length} MIT packages for ${version}`);
