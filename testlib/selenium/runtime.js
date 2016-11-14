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
var globSync = require("glob").sync;

var connect = require('connect');
var serveStatic = require('serve-static');

// Port of the web server used to serve the test files
var httpPort = 8080;

var p = `http://localhost:${httpPort}/testlib/selenium/testhost.html`;

var argv = require('minimist')(process.argv.slice(2), {"boolean": ["keep-open", "coverage"]});

function printUsage() {
  console.log(`Usage: [--keep-open] TESTSCRIPT`);
}

function randId(n) {
  let s = "";
  var choices = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (let i = 0; i < n; i++) {
    s += choices.charAt(Math.floor(Math.random() * choices.length));
  }

  return s;
}

if (argv._.length != 1) {
  console.log("exactly one test script must be given");
  printUsage();
  process.exit(1);
}

var testScriptName = path.resolve(argv._[0]);
var testName = path.basename(testScriptName, ".js");
var projectRoot = path.resolve(__dirname, "../../") + "/";
if (!testScriptName.startsWith(projectRoot)) {
  console.log("test file must be inside wallet project root");
  process.exit(1);
}

var testScript = testScriptName.substring(projectRoot.length);

try {
  var stats = fs.lstatSync(path.resolve(projectRoot, "./" + testScript));
  if (!stats.isFile()) {
    throw Error("test must be a file");
  }
} catch (e) {
  console.log("can't execute test");
  console.log(e);
  process.exit(e);
}


var script = `
  function onStatus(s) {
    document.body.appendChild(document.createTextNode(s));
    document.body.appendChild(document.createElement("br"));
  }
  function f() {
    if ("undefined" == typeof System) {
      console.log("can't access module loader");
      return
    }
    System.import("testlib/talertest")
      .then(tt => {
        SystemJS.import("http://localhost:${httpPort}/${testScript}")
          .then(() => {
            return tt.run(onStatus);
          })
          .then(() => {
            window.__test_over = true;
          })
          .catch((e) => {
            window.__test_over = true;
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
if (argv["coverage"]) {
  driver.executeScript("window.requestCoverage = true;");
}
driver.executeScript(script);
driver.wait(untilTestOver);


/**
 * Instrument and get a coverage stub for all
 * files we don't have coverage for, so they show
 * up in the report.
 */
function augmentCoverage(cov) {
  for (let file of globSync(projectRoot + "/src/**/*.js")) {
    let suffix = file.substring(0, projectRoot.lenth);
    if (/.*\/vendor\/.*/.test(suffix)) {
      continue;
    }
    if (/.*\/taler-emscripten-lib.js/.test(suffix)) {
      continue;
    }
    if (file in cov) {
      continue;
    }
    let instrumenter = new (require("istanbul").Instrumenter)();
    let source = fs.readFileSync(file, "utf-8");
    let instrumentedSrc = instrumenter.instrumentSync(source, file);
    let covStubRE = /\{.*"path".*"fnMap".*"statementMap".*"branchMap".*\}/g;
    let covStubMatch = covStubRE.exec(instrumentedSrc);

    if (covStubMatch !== null) {
      let covStub = JSON.parse(covStubMatch[0]);
      cov[file] = covStub;
    }
  }
}


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

  let coverage = driver.executeScript("return JSON.stringify(window.__coverage__);");
  coverage.then((covStr) => {
    let cov = JSON.parse(covStr);
    if (cov) {
      let covTranslated = {};
      for (let f in cov) {
        let p = path.resolve(projectRoot, f);
        let c = covTranslated[p] = cov[f];
        c.path = p;
      }
      augmentCoverage(covTranslated);
      fs.writeFileSync(`coverage-${testName}-${randId(5)}.json`, JSON.stringify(covTranslated));
    }
    if (!argv["keep-open"]) {
      driver.quit();
      l.close();
    }
  })

});

