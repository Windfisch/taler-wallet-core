import { potextract } from "./potextract.js";

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
    default:
      console.error(`unknown subcommand '${subcommand}'`);
      usage();
  }
}
