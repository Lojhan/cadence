import { readFileSync } from "node:fs";

const version = process.env.CADENCE_RELEASE_VERSION ?? "";
if (!/^\d+\.\d+\.\d+-alpha\.\d+$/.test(version)) {
  throw new Error("Expected an explicit alpha release version");
}
const notes = readFileSync(process.argv[2] ?? "docs/ALPHA_RELEASE.md", "utf8");
if (!notes.startsWith(`Cadence ${version} is `)) {
  throw new Error(`Release notes must identify ${version} on their first line`);
}
console.log(`Release notes match ${version}`);
