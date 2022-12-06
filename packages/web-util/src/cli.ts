import { clk, setGlobalLogLevelFromString } from "@gnu-taler/taler-util";
import { serve } from "./serve.js";

export const walletCli = clk
  .program("wallet", {
    help: "Command line interface for the GNU Taler wallet.",
  })
  .maybeOption("log", ["-L", "--log"], clk.STRING, {
    help: "configure log level (NONE, ..., TRACE)",
    onPresentHandler: (x) => {
      setGlobalLogLevelFromString(x);
    },
  })
  .flag("version", ["-v", "--version"], {
    onPresentHandler: printVersion,
  })
  .flag("verbose", ["-V", "--verbose"], {
    help: "Enable verbose output.",
  });

walletCli
  .subcommand("serve", "serve", { help: "Create a server." })
  .maybeOption("folder", ["-F", "--folder"], clk.STRING, {
    help: "should complete",
    // default: "./dist"
  })
  .maybeOption("port", ["-P", "--port"], clk.INT, {
    help: "should complete",
    // default: 8000
  })
  .flag("development", ["-D", "--dev"], {
    help: "should complete",
  })
  .action(async (args) => {
    return serve({
      folder: args.serve.folder || "./dist",
      port: args.serve.port || 8000,
      development: args.serve.development,
    });
  });

declare const __VERSION__: string;
function printVersion(): void {
  console.log(__VERSION__);
  process.exit(0);
}

export function main(): void {
  walletCli.run();
}
