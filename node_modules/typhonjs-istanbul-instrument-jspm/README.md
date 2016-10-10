![typhonjs-config-jspm-parse](http://i.imgur.com/G3zAIuf.png)

[![NPM](https://img.shields.io/npm/v/typhonjs-istanbul-instrument-jspm.svg?label=npm)](https://www.npmjs.com/package/typhonjs-istanbul-instrument-jspm)
[![Code Style](https://img.shields.io/badge/code%20style-allman-yellowgreen.svg?style=flat)](https://en.wikipedia.org/wiki/Indent_style#Allman_style)
[![License](https://img.shields.io/badge/license-MPLv2-yellowgreen.svg?style=flat)](https://github.com/typhonjs-node-jspm/typhonjs-istanbul-instrument-jspm/blob/master/LICENSE)
[![Gitter](https://img.shields.io/gitter/room/typhonjs/TyphonJS.svg)](https://gitter.im/typhonjs/TyphonJS)

[![Build Status](https://travis-ci.org/typhonjs-node-jspm/typhonjs-istanbul-instrument-jspm.svg?branch=master)](https://travis-ci.org/typhonjs-node-jspm/typhonjs-istanbul-instrument-jspm)
[![Coverage](https://img.shields.io/codecov/c/github/typhonjs-node-jspm/typhonjs-istanbul-instrument-jspm.svg)](https://codecov.io/github/typhonjs-node-jspm/typhonjs-istanbul-instrument-jspm)
[![Dependency Status](https://www.versioneye.com/user/projects/56e5c275df573d00472cd46f/badge.svg?style=flat)](https://www.versioneye.com/user/projects/56e5c275df573d00472cd46f)

Provides a NPM module to add Istanbul instrumentation to JSPM / SystemJS by replacing the System.translate hook. 

By using this module SystemJS can be instrumented for code coverage with Istanbul with minimal effort. 

For a comprehensive ES6 build / testing / publishing NPM module please see [typhonjs-npm-build-test](https://www.npmjs.com/package/typhonjs-npm-build-test) as it combines this module along with transpiling ES6 sources with Babel, pre-publish script detection, ESDoc dependencies, testing with Mocha / Istanbul and an Istanbul instrumentation hook for JSPM / SystemJS tests. 

Please review [istanbul-jspm-coverage-example](https://github.com/typhonjs-demos-test/istanbul-jspm-coverage-example) for a complete working example which uses `typhonjs-npm-build-test` and subsequently this module which is included as a dependency to `typhonjs-npm-build-test`. 

-----

In short an ES6 Mocha test that instruments Istanbul will do the following:
```
import jspm                      from 'jspm';

import instrumentIstanbulSystem  from 'typhonjs-istanbul-instrument-jspm';

// Set the package path to the local root where config.js is located.
jspm.setPackagePath(process.cwd());

// Create SystemJS Loader
const System = new jspm.Loader();

// Replaces System.translate with version that provides Istanbul instrumentation.
instrumentIstanbulSystem(System);
```

`instrumentIstanbulSystem` takes two parameters:
```
(object)   System - An instance of SystemJS.

(RegExp)   sourceFilePathRegex - (optional) A regex which defines which source files are instrumented; default excludes
                                 any sources with file paths that includes `jspm_packages`.
```

It should be noted that the default source file path regex is defined as `/^((?!jspm_packages).)*$/` which excludes any sourcecode loaded from `jspm_packages`. You may optionally pass in a regex as the second parameter to `instrumentIstanbulSystem`. An example of excluding both `jspm_packages` and `./test/src` is: `instrumentIstanbulSystem(System, /^((?!jspm_packages|test\/src\/).)*$/);`.

A final important detail when using Istanbul is that the `cover` command will not pickup the source instrumented via `typhonjs-istanbul-instrument-jspm` when an initial report is generated, however the instrumentation is represented in `coverage.raw.json`. To make sure SystemJS sources are represented in the final report simply run the Istanbul `report` command and the original source will be included in the report. This is automated by the [mocha-istanbul-report]() NPM script that is included as part of `typhonjs-npm-build-test` / `typhonjs-npm-scripts-test-mocha`. 

In `package.json` add an NPM script like the following:
```
"scripts": {
  "test-coverage": "babel-node ./node_modules/typhonjs-npm-scripts-test-mocha/scripts/mocha-istanbul-report.js"
}
```

Please note that the TyphonJS NPM scripts use a separate configuration file `./npmscriptrc` to define various actions. For further information refer to [typhonjs-npm-scripts-test-mocha](https://www.npmjs.com/package/typhonjs-npm-scripts-test-mocha)
