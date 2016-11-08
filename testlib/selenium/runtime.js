/*
 This file is part of TALER
 (C) 2016 Inria

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 *
 * @author Florian Dold
 */

"use strict";

var webdriver = require('selenium-webdriver');
var chrome = require('selenium-webdriver/chrome');
var path = require("path");
var process = require("process");
var fs = require("fs");

var connect = require('connect');
var serveStatic = require('serve-static');

// Port of the web server used to serve the test files
var httpPort = 8080;

var p = `http://localhost:${httpPort}/testlib/selenium/testhost.html`;

var argv = require('minimist')(process.argv.slice(2), {"boolean": ["keep-open"]});

console.log(argv);

function printUsage() {
  console.log(`Usage: [--keep-open] TESTSCRIPT`);
}

if (argv._.length != 1) {
  console.log("exactly one test script must be given");
  printUsage();
  process.exit(1);
}

var testScriptName = path.resolve(argv._[0]);
var projectRoot = path.resolve(__dirname, "../../");
if (!testScriptName.startsWith(projectRoot)) {
  console.log("test file must be inside wallet project root");
  process.exit(1);
}

var testScript = "./" + testScriptName.substring(projectRoot.length);
console.log("test script:", testScript);
console.log("test script name:", testScriptName);
console.log("root:", projectRoot);

try {
  var stats = fs.lstatSync(path.resolve(projectRoot, testScript));
  if (!stats.isFile()) {
    throw Error("test must be a file");
  }
} catch (e) {
  console.log("can't execute test");
  console.log(e);
  process.exit(e);
}


var script = `
  function f() {
    if ("undefined" == typeof System) {
      console.log("can't access module loader");
      return
    }
    System.import("testlib/talertest")
      .then(tt => {
        SystemJS.import("http://localhost:${httpPort}/${testScript}")
          .then(() => {
            return tt.run();
          })
          .then(() => {
            window.__test_over = true;
          })
          .catch((e) => {
            window.__test_over = true;
            console.error(e)
          });
      })
      .catch((e) => {
        console.error("can't locate talertest");
        console.error(e);
      });
  }
  if (document.readyState == "complete") {
    f();
  } else {
    document.addEventListener("DOMContentLoaded", f);
  }
`;

function untilTestOver() {
  return driver.executeScript("return window.__test_over");
}

console.log("TAP version 13");

let srv = connect().use(serveStatic(__dirname + "/../../"));
let l = srv.listen(8080);

var driver = new webdriver.Builder()
  .setLoggingPrefs({browser: 'ALL'})
  .forBrowser('chrome')
  .build();

driver.get(p);
driver.executeScript(script);
driver.wait(untilTestOver);

driver.manage().logs().get("browser").then((logs) => {
  for (let l of logs) {
    if (l.message.startsWith("{")) {
      // format not understood, sometimes messages are logged
      // with more structure, just pass it on
      console.log(l.message);
      continue;
    }
    let s1 = l.message.indexOf(" ") + 1;
    let s2 = l.message.indexOf(" ", s1) + 1;
    // Skip file url and LINE:COL
    console.log(l.message.substring(s2));
  }

  if (!argv["keep-open"]) {
    driver.quit();
    l.close();
  }
});

