/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, If not, see <http://www.gnu.org/licenses/>
 */


/**
 * Generate .po file from list of source files.
 *
 * Note that duplicate message IDs are NOT merged, to get the same output as
 * you would from xgettext, just run msguniq.
 *
 * @author Florian Dold
 */

/// <reference path="../lib/decl/node.d.ts" />

"use strict";

import {readFileSync} from "fs";
import {execSync} from "child_process";
import * as ts from "typescript";


function wordwrap(str: string, width: number = 80): string[] {
    var regex = '.{1,' + width + '}(\\s|$)|\\S+(\\s|$)';
    return str.match(RegExp(regex, 'g'));
}

export function processFile(sourceFile: ts.SourceFile) {
  processNode(sourceFile);
  let lastTokLine = 0;
  let preLastTokLine = 0;

  function getHeadName(node: ts.Node): string {
    switch (node.kind) {
      case ts.SyntaxKind.Identifier:
        return (<ts.Identifier>node).text;
      case ts.SyntaxKind.CallExpression:
      case ts.SyntaxKind.PropertyAccessExpression:
        return getHeadName((<any>node).expression);
    }
  }

  function getTemplate(node: ts.Node): string {
    switch (node.kind) {
      case ts.SyntaxKind.FirstTemplateToken:
        return (<any>node).text;
      case ts.SyntaxKind.TemplateExpression:
        let te = <ts.TemplateExpression>node;
        let textFragments = [te.head.text];
        for (let tsp of te.templateSpans) {
          textFragments.push(`%${(textFragments.length-1)/2+1}$s`);
          textFragments.push(tsp.literal.text);
        }
        return textFragments.join('');
      default:
        return "(pogen.ts: unable to parse)";
    }
  }

  function getComment(node: ts.Node, lc): string {
    let lastComments;
    for (let l = preLastTokLine; l < lastTokLine; l++) {
      let pos = ts.getPositionOfLineAndCharacter(sourceFile, l, 0);
      let comments = ts.getTrailingCommentRanges(sourceFile.text, pos);
      if (comments) {
        lastComments = comments;
      }
    }
    if (!lastComments) {
      return;
    }
    let candidate = lastComments[lastComments.length-1];
    let candidateEndLine = ts.getLineAndCharacterOfPosition(sourceFile, candidate.end).line;
    if (candidateEndLine != lc.line - 1) {
      return;
    }
    let text = sourceFile.text.slice(candidate.pos, candidate.end);
    switch (candidate.kind) {
      case ts.SyntaxKind.SingleLineCommentTrivia:
        // Remove comment leader
        text = text.replace(/^[/][/]\s*/, "");
        break;
      case ts.SyntaxKind.MultiLineCommentTrivia:
        // Remove comment leader and trailer,
        // handling white space just like xgettext.
        text = text
            .replace(/^[/][*](\s*?\n|\s*)?/, "")
            .replace(/(\n[ \t]*?)?[*][/]$/, "");
        break;
    }
    return text;
  }

  function processNode(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.TaggedTemplateExpression:
        let lc = ts.getLineAndCharacterOfPosition(sourceFile, node.pos);
        if (lc.line != lastTokLine) {
          preLastTokLine = lastTokLine;
          lastTokLine = lc.line;
        }
        let tte = <ts.TaggedTemplateExpression>node;
        let headName = getHeadName(tte.tag);
        let comment = getComment(tte, lc);
        let tpl = getTemplate(tte.template).replace(/"/g, '\\"');
        // Do escaping, wrap break at newlines
        let parts = tpl
            .match(/(.*\n|.+$)/g)
            .map((x) => x.replace(/\n/g, '\\n'))
            .map((p) => wordwrap(p))
            .reduce((a,b) => a.concat(b));
        if (comment) {
          for (let cl of comment.split('\n')) {
            console.log(`#. ${cl}`);
          }
        }
        console.log(`#: ${sourceFile.fileName}:${lc.line+1}`);
        console.log(`#, c-format`);
        if (parts.length == 1) {
          console.log(`msgid "${parts[0]}"`);
        } else {
          console.log(`msgid ""`);
          for (let p of parts) {
            console.log(`"${p}"`);
          }
        }
        console.log(`msgstr ""`);
        console.log();
        break;
    }

    ts.forEachChild(node, processNode);
  }
}

const fileNames = process.argv.slice(2);

console.log(
`# SOME DESCRIPTIVE TITLE.
# Copyright (C) YEAR THE PACKAGE'S COPYRIGHT HOLDER
# This file is distributed under the same license as the PACKAGE package.
# FIRST AUTHOR <EMAIL@ADDRESS>, YEAR.
#
#, fuzzy
msgid ""
msgstr ""
"Project-Id-Version: PACKAGE VERSION\\n"
"Report-Msgid-Bugs-To: \\n"
"POT-Creation-Date: ${execSync("date '+%F %H:%M%z'").toString().trim()}\\n"
"PO-Revision-Date: YEAR-MO-DA HO:MI+ZONE\\n"
"Last-Translator: FULL NAME <EMAIL@ADDRESS>\\n"
"Language-Team: LANGUAGE <LL@li.org>\\n"
"Language: \\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"`);
console.log()

fileNames.forEach(fileName => {
  let sourceFile = ts.createSourceFile(fileName, readFileSync(fileName).toString(), ts.ScriptTarget.ES6, /*setParentNodes */ true);
  processFile(sourceFile);
});
