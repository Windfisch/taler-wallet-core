'use strict';

import Instrumenter from 'istanbul-lib-instrument';

// Good enough ES6 module detection regex.
// Format detections not designed to be accurate, but to handle the 99% use case.
const s_ESM_REGEX = /(^\s*|[}\);\n]\s*)(import\s*(['"]|(\*\s+as\s+)?[^"'\(\)\n;]+\s*from\s*['"]|\{)|export\s+\*\s+from\s+["']|export\s* (\{|default|function|class|var|const|let|async\s+function))/;

/**
 * Instruments JSPM / SystemJS replacing the `System.translate` hook adding Istanbul instrumentation of loaded source
 * code before deferring the instrumented source for translation. The instrumentation process occurs on the original
 * source code and supports ES5 and ES Modules (ES6+).
 *
 * @param {object}   System - An instance of SystemJS.
 *
 * @param {RegExp}   sourceFilePathRegex - A regex which defines which source files are instrumented; default excludes
 *                                         any sources with file paths that includes `jspm_packages`.
 */
export default function instrumentIstanbulSystem(System, sourceFilePathRegex = /^((?!jspm_packages).)*$/)
{
   /* istanbul ignore if */
   if (typeof System.translate !== 'function')
   {
      throw new TypeError("instrumentIstanbulSystem - 'System' is not an instance of the SystemJS API.");
   }

   /* istanbul ignore if */
   if (!(sourceFilePathRegex instanceof RegExp))
   {
      throw new TypeError("instrumentIstanbulSystem - 'sourceFilePathRegex' is not an instance of RexExp.");
   }

   // Coverage variable created by Istanbul and stored in global variables.
   const coverageVariable = Object.keys(global).filter((key) => { return key.startsWith('$$cov_'); })[0];

   /* istanbul ignore if */
   if (typeof coverageVariable === 'undefined')
   {
      throw new TypeError(
       'instrumentIstanbulSystem - Istanbul coverage variable could not be located in global variables.');
   }

   // ES5 instrumenter
   const instrumenter = Instrumenter.createInstrumenter({ coverageVariable });

   // ES6 / ES Modules instrumenter
   const instrumenterESM = Instrumenter.createInstrumenter({ coverageVariable, esModules: true });

   // Store the original `System.translate` hook.
   const systemTranslate = System.translate;

   // Override SystemJS translate hook to instrument original sources with Istanbul.
   System.translate = (load) =>
   {
      const filePath = load.address.substr(System.baseURL.length);

      // Use `sourceFilePathRegex` to test file path for source instrumentation.
      if (sourceFilePathRegex.test(filePath))
      {
         /* istanbul ignore next */
         try
         {
            // If a source file passes the ES6 / ES Module regex test then use the ESM instrumenter.
            if (s_ESM_REGEX.test(load.source) || load.metadata.format === 'esm')
            {
               load.source = instrumenterESM.instrumentSync(load.source, filePath);
            }
            else
            {
               load.source = instrumenter.instrumentSync(load.source, filePath);
            }
         }
         catch (err)
         {
            const newErr = new Error(`Unable to instrument '${load.name}' for Istanbul:\n\t${err.message}`);
            newErr.stack = `Unable to instrument '${load.name}' for istanbul:\n\t${err.stack}`;
            newErr.originalErr = err.originalErr || err;
            throw newErr;
         }
      }

      // Defer to the original `System.translate` hook.
      return systemTranslate.call(System, load);
   };
}
