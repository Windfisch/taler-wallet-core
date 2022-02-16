import { potextract } from "./potextract.js";
import * as child_process from "child_process";
import * as fs from "fs";
import glob = require("glob");
import { po2ts } from "./po2ts.js";

function usage(): never {
  console.log("usage: pogen <extract|merge|emit>");
  process.exit(1);
}

export function main() {
  const subcommand = process.argv[2];
  if (process.argv.includes("--help") || !subcommand) {
    usage();
  }
  switch (subcommand) {
    case "extract":
      potextract();
      break;
    case "merge": {
      const packageJson = JSON.parse(
        fs.readFileSync("./package.json", { encoding: "utf-8" }),
      );

      const poDomain = packageJson.pogen?.domain;
      if (!poDomain) {
        console.error("missing 'pogen.domain' field in package.json");
        process.exit(1);
      }
      const files = glob.sync("src/i18n/*.po");
      console.log(files);
      for (const f of files) {
        console.log(`merging ${f}`);
        child_process.execSync(
          `msgmerge -o '${f}' '${f}' 'src/i18n/${poDomain}.pot'`,
        );
      }
      break;
    }
    case "emit":
      po2ts();
      break;
    default:
      console.error(`unknown subcommand '${subcommand}'`);
      usage();
  }
}
