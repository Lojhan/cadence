import { readdirSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@babel/parser";

const allowed: Record<string, readonly string[]> = {
  contracts: [],
  music: ["contracts"],
  core: ["contracts", "music"],
  "audio-engine": ["contracts"],
  "audio-browser": ["contracts", "audio-engine"],
  ui: ["contracts", "music"],
  features: ["contracts", "music", "core", "ui", "audio-browser"],
  application: ["contracts", "music"],
  db: ["contracts", "application"],
};
const pure = new Set([
  "contracts",
  "music",
  "core",
  "ui",
  "features",
  "audio-engine",
  "audio-browser",
]);
const builtins = new Set(
  builtinModules.map((name) => name.replace(/^node:/, "")),
);
const frameworkFree = new Set([
  "contracts",
  "music",
  "core",
  "application",
  "audio-engine",
  "audio-browser",
]);
export function violations(
  owner: string,
  source: string,
  declared?: readonly string[],
): string[] {
  const errors: string[] = [];
  const tree = parse(source, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
    createImportExpressions: true,
  });
  function check(specifier: string) {
    const builtin = builtins.has(specifier.replace(/^node:/, ""));
    const external = !specifier.startsWith(".") && !specifier.startsWith("/");
    const name = specifier.startsWith("@")
      ? specifier.split("/").slice(0, 2).join("/")
      : specifier.split("/")[0];
    if (
      declared &&
      external &&
      !builtin &&
      name &&
      name !== `@cadence/${owner}` &&
      !declared.includes(name)
    )
      errors.push(`Undeclared dependency in ${owner}: ${specifier}`);
    if (
      frameworkFree.has(owner) &&
      (name === "react" ||
        name === "react-dom" ||
        name?.startsWith("@tanstack/react-"))
    )
      errors.push(`UI dependency in ${owner}: ${specifier}`);
    if (/^(stripe|@clerk\/)/.test(specifier))
      errors.push(`Hosted dependency: ${specifier}`);
    if (
      pure.has(owner) &&
      (builtin || /^(node:|better-sqlite3|pg$|drizzle-orm)/.test(specifier))
    )
      errors.push(`Server dependency in ${owner}: ${specifier}`);
    if (/^\.\.\/\.\.\//.test(specifier))
      errors.push(`Cross-package relative import: ${specifier}`);
    const dependency = /^@cadence\/([^/]+)/.exec(specifier)?.[1];
    if (
      dependency &&
      dependency !== owner &&
      !allowed[owner]?.includes(dependency)
    )
      errors.push(`${owner} cannot depend on ${dependency}`);
  }
  function visit(value: unknown) {
    if (!value || typeof value !== "object") return;
    if (Array.isArray(value)) {
      for (const child of value) visit(child);
      return;
    }
    const node = value as Record<string, unknown>;
    if (
      [
        "ImportDeclaration",
        "ExportNamedDeclaration",
        "ExportAllDeclaration",
        "ImportExpression",
      ].includes(String(node.type))
    ) {
      const source = node.source as
        | { type?: string; value?: string }
        | undefined;
      if (source?.type === "StringLiteral" && source.value) check(source.value);
      else if (node.type === "ImportExpression")
        errors.push("Computed module loading is not allowed");
    }
    const callee = node.callee as { type?: string; name?: string } | undefined;
    if (
      node.type === "CallExpression" &&
      callee?.type === "Identifier" &&
      callee.name === "require"
    ) {
      const argument = (
        node.arguments as { type?: string; value?: string }[]
      )[0];
      if (argument?.type === "StringLiteral" && argument.value)
        check(argument.value);
      else errors.push("Computed module loading is not allowed");
    }
    for (const [key, child] of Object.entries(node))
      if (!["loc", "start", "end", "extra"].includes(key)) visit(child);
  }
  visit(tree);
  return errors;
}
function scan(
  directory: string,
  owner: string,
  runtime: readonly string[],
  development: readonly string[],
  source = false,
): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", "dist", "generated"].includes(entry.name)) return [];
    const path = resolve(directory, entry.name);
    if (entry.isDirectory())
      return scan(
        path,
        owner,
        runtime,
        development,
        source || entry.name === "src",
      );
    return /\.[cm]?[jt]sx?$/.test(path)
      ? violations(
          owner,
          readFileSync(path, "utf8"),
          source ? runtime : development,
        ).map((error) => `${path}: ${error}`)
      : [];
  });
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const errors = readdirSync("packages", { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const root = resolve("packages", entry.name);
      const manifest = JSON.parse(
        readFileSync(resolve(root, "package.json"), "utf8"),
      );
      const runtime = Object.keys({
        ...manifest.dependencies,
        ...manifest.peerDependencies,
        ...manifest.optionalDependencies,
      });
      const development = [
        ...runtime,
        ...Object.keys(manifest.devDependencies ?? {}),
      ];
      return scan(root, entry.name, runtime, development);
    });
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else console.log("Package boundaries verified");
}
