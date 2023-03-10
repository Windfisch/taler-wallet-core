/*
 This file is part of GNU Taler
 (C) 2019-2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Imports.
 */
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path"

const DEFAULT_PO_HEADER = `# SOME DESCRIPTIVE TITLE.
# Copyright (C) YEAR THE PACKAGE'S COPYRIGHT HOLDER
# This file is distributed under the same license as the PACKAGE package.
# FIRST AUTHOR <EMAIL@ADDRESS>, YEAR.
#
#, fuzzy
msgid ""
msgstr ""
"Project-Id-Version: PACKAGE VERSION\\n"
"Report-Msgid-Bugs-To: \\n"
"POT-Creation-Date: 2016-11-23 00:00+0100\\n"
"PO-Revision-Date: YEAR-MO-DA HO:MI+ZONE\\n"
"Last-Translator: FULL NAME <EMAIL@ADDRESS>\\n"
"Language-Team: LANGUAGE <LL@li.org>\\n"
"Language: \\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"\n\n`


function wordwrap(str: string, width: number = 80): string[] {
  var regex = ".{1," + width + "}(\\s|$)|\\S+(\\s|$)";
  return str.match(RegExp(regex, "g"));
}

function processFile(
  sourceFile: ts.SourceFile,
  outChunks: string[],
  knownMessageIds: Set<string>,
) {
  let lastTokLine = 0;
  let preLastTokLine = 0;
  processNode(sourceFile);

  function getTemplate(node: ts.Node): string {
    switch (node.kind) {
      case ts.SyntaxKind.FirstTemplateToken:
        return (<any>node).text;
      case ts.SyntaxKind.TemplateExpression:
        let te = <ts.TemplateExpression>node;
        let textFragments = [te.head.text];
        for (let tsp of te.templateSpans) {
          textFragments.push(`%${(textFragments.length - 1) / 2 + 1}$s`);
          textFragments.push(tsp.literal.text.replace(/%/g, "%%"));
        }
        return textFragments.join("");
      default:
        return "(pogen.ts: unable to parse)";
    }
  }

  function getComment(node: ts.Node): string {
    let lc = ts.getLineAndCharacterOfPosition(sourceFile, node.pos);
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
    let candidate = lastComments[lastComments.length - 1];
    let candidateEndLine = ts.getLineAndCharacterOfPosition(
      sourceFile,
      candidate.end,
    ).line;
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

  function getPath(node: ts.Node): string[] {
    switch (node.kind) {
      case ts.SyntaxKind.PropertyAccessExpression:
        let pae = <ts.PropertyAccessExpression>node;
        return Array.prototype.concat(getPath(pae.expression), [pae.name.text]);
      case ts.SyntaxKind.Identifier:
        let id = <ts.Identifier>node;
        return [id.text];
    }
    return ["(other)"];
  }

  function arrayEq<T>(a1: T[], a2: T[]) {
    if (a1.length != a2.length) {
      return false;
    }
    for (let i = 0; i < a1.length; i++) {
      if (a1[i] != a2[i]) {
        return false;
      }
    }
    return true;
  }

  interface TemplateResult {
    comment: string;
    path: string[];
    template: string;
    line: number;
  }

  function processTaggedTemplateExpression(
    tte: ts.TaggedTemplateExpression,
  ): TemplateResult {
    let lc = ts.getLineAndCharacterOfPosition(sourceFile, tte.pos);
    if (lc.line != lastTokLine) {
      preLastTokLine = lastTokLine;
      lastTokLine = lc.line;
    }
    let path = getPath(tte.tag);
    let res: TemplateResult = {
      path,
      line: lc.line,
      comment: getComment(tte),
      template: getTemplate(tte.template).replace(/"/g, '\\"'),
    };
    return res;
  }

  function formatMsgComment(line: number, comment?: string) {
    if (comment) {
      for (let cl of comment.split("\n")) {
        outChunks.push(`#. ${cl}\n`);
      }
    }
    const fn = path.posix.relative(process.cwd(), sourceFile.fileName);
    outChunks.push(`#: ${fn}:${line + 1}\n`);
    outChunks.push(`#, c-format\n`);
  }

  function formatMsgLine(head: string, msg: string) {
    // Do escaping, wrap break at newlines
    let parts = msg
      .match(/(.*\n|.+$)/g)
      .map((x) => x.replace(/\n/g, "\\n").replace(/"/g, '\\"'))
      .map((p) => wordwrap(p))
      .reduce((a, b) => a.concat(b));
    if (parts.length == 1) {
      outChunks.push(`${head} "${parts[0]}"\n`);
    } else {
      outChunks.push(`${head} ""\n`);
      for (let p of parts) {
        outChunks.push(`"${p}"\n`);
      }
    }
  }

  function getJsxElementPath(node: ts.Node) {
    let path;
    let process = (childNode) => {
      switch (childNode.kind) {
        case ts.SyntaxKind.JsxOpeningElement: {
          let e = childNode as ts.JsxOpeningElement;
          return (path = getPath(e.tagName));
        }
        default:
          break;
      }
    };
    ts.forEachChild(node, process);
    return path;
  }

  function translateJsxExpression(node: ts.Node, h) {
    switch (node.kind) {
      case ts.SyntaxKind.StringLiteral: {
        let e = node as ts.StringLiteral;
        return e.text;
      }
      default:
        return `%${h[0]++}$s`;
    }
  }

  function trim(s: string) {
    return s.replace(/^[ \n\t]*/, "").replace(/[ \n\t]*$/, "");
  }

  function getJsxContent(node: ts.Node) {
    let fragments = [];
    let holeNum = [1];
    let process = (childNode) => {
      switch (childNode.kind) {
        case ts.SyntaxKind.JsxText: {
          let e = childNode as ts.JsxText;
          let s = e.text;
          let t = s.split("\n").map(trim).join(" ");
          if (s[0] === " ") {
            t = " " + t;
          }
          if (s[s.length - 1] === " ") {
            t = t + " ";
          }
          fragments.push(t);
        }
        case ts.SyntaxKind.JsxOpeningElement:
          break;
        case ts.SyntaxKind.JsxSelfClosingElement:
        case ts.SyntaxKind.JsxElement:
          fragments.push(`%${holeNum[0]++}$s`);
          break;
        case ts.SyntaxKind.JsxExpression: {
          let e = childNode as ts.JsxExpression;
          fragments.push(translateJsxExpression(e.expression, holeNum));
          break;
        }
        case ts.SyntaxKind.JsxClosingElement:
          break;
        default:
          console.log("unhandled node type: ", childNode.kind)
          let lc = ts.getLineAndCharacterOfPosition(
            childNode.getSourceFile(),
            childNode.getStart(),
          );
          console.error(
            `unrecognized syntax in JSX Element ${ts.SyntaxKind[childNode.kind]} (${childNode.getSourceFile().fileName}:${lc.line + 1}:${lc.character + 1}`,
          );
          break;
      }
    };
    ts.forEachChild(node, process);
    return fragments.join("").trim().replace(/ +/g, " ");
  }

  function getJsxSingular(node: ts.Node) {
    let res;
    let process = (childNode) => {
      switch (childNode.kind) {
        case ts.SyntaxKind.JsxElement: {
          let path = getJsxElementPath(childNode);
          if (arrayEq(path, ["i18n", "TranslateSingular"])) {
            res = getJsxContent(childNode);
          }
        }
        default:
          break;
      }
    };
    ts.forEachChild(node, process);
    return res;
  }

  function getJsxPlural(node: ts.Node) {
    let res;
    let process = (childNode) => {
      switch (childNode.kind) {
        case ts.SyntaxKind.JsxElement: {
          let path = getJsxElementPath(childNode);
          if (arrayEq(path, ["i18n", "TranslatePlural"])) {
            res = getJsxContent(childNode);
          }
        }
        default:
          break;
      }
    };
    ts.forEachChild(node, process);
    return res;
  }

  function processNode(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.JsxElement:
        let path = getJsxElementPath(node);
        if (arrayEq(path, ["i18n", "Translate"])) {
          let content = getJsxContent(node);
          let { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.pos);
          let comment = getComment(node);
          if (!knownMessageIds.has(content)) {
            knownMessageIds.add(content);
            formatMsgComment(line, comment);
            formatMsgLine("msgid", content);
            outChunks.push(`msgstr ""\n`);
            outChunks.push("\n");
          }
          return;
        }
        if (arrayEq(path, ["i18n", "TranslateSwitch"])) {
          let { line } = ts.getLineAndCharacterOfPosition(sourceFile, node.pos);
          let comment = getComment(node);
          formatMsgComment(line, comment);
          let singularForm = getJsxSingular(node);
          if (!singularForm) {
            console.error("singular form missing");
            process.exit(1);
          }
          let pluralForm = getJsxPlural(node);
          if (!pluralForm) {
            console.error("plural form missing");
            process.exit(1);
          }
          if (!knownMessageIds.has(singularForm)) {
            knownMessageIds.add(singularForm);
            formatMsgLine("msgid", singularForm);
            formatMsgLine("msgid_plural", pluralForm);
            outChunks.push(`msgstr[0] ""\n`);
            outChunks.push(`msgstr[1] ""\n`);
            outChunks.push(`\n`);
          }
          return;
        }
        break;
      case ts.SyntaxKind.CallExpression: {
        // might be i18n.plural(i18n[.X]`...`, i18n[.X]`...`)
        let ce = <ts.CallExpression>node;
        let path = getPath(ce.expression);
        if (!arrayEq(path, ["i18n", "plural"])) {
          break;
        }
        if (ce.arguments[0].kind != ts.SyntaxKind.TaggedTemplateExpression) {
          break;
        }
        if (ce.arguments[1].kind != ts.SyntaxKind.TaggedTemplateExpression) {
          break;
        }
        let { line } = ts.getLineAndCharacterOfPosition(sourceFile, ce.pos);
        let t1 = processTaggedTemplateExpression(
          <ts.TaggedTemplateExpression>ce.arguments[0],
        );
        let t2 = processTaggedTemplateExpression(
          <ts.TaggedTemplateExpression>ce.arguments[1],
        );
        let comment = getComment(ce);
        const msgid = t1.template;
        if (!knownMessageIds.has(msgid)) {
          knownMessageIds.add(msgid);
          formatMsgComment(line, comment);
          formatMsgLine("msgid", t1.template);
          formatMsgLine("msgid_plural", t2.template);
          outChunks.push(`msgstr[0] ""\n`);
          outChunks.push(`msgstr[1] ""\n`);
          outChunks.push("\n");
        }

        // Important: no processing for child i18n expressions here
        return;
      }
      case ts.SyntaxKind.TaggedTemplateExpression: {
        let tte = <ts.TaggedTemplateExpression>node;
        let { comment, template, line, path } =
          processTaggedTemplateExpression(tte);
        if (path[0] != "i18n") {
          break;
        }
        const msgid = template;
        if (!knownMessageIds.has(msgid)) {
          knownMessageIds.add(msgid);
          formatMsgComment(line, comment);
          formatMsgLine("msgid", template);
          outChunks.push(`msgstr ""\n`);
          outChunks.push("\n");
        }
        break;
      }
    }

    ts.forEachChild(node, processNode);
  }
}

export function potextract() {
  const configPath = ts.findConfigFile(
    /*searchPath*/ "./",
    ts.sys.fileExists,
    "tsconfig.json",
  );
  if (!configPath) {
    throw new Error("Could not find a valid 'tsconfig.json'.");
  }

  const cmdline = ts.getParsedCommandLineOfConfigFile(
    configPath,
    {},
    {
      fileExists: ts.sys.fileExists,
      getCurrentDirectory: ts.sys.getCurrentDirectory,
      onUnRecoverableConfigFileDiagnostic: (e) => console.log(e),
      readDirectory: ts.sys.readDirectory,
      readFile: ts.sys.readFile,
      useCaseSensitiveFileNames: true,
    },
  );

  const prog = ts.createProgram({
    options: cmdline.options,
    rootNames: cmdline.fileNames,
  });

  const allFiles = prog.getSourceFiles();

  const ownFiles = allFiles.filter(
    (x) =>
      !x.isDeclarationFile &&
      !prog.isSourceFileFromExternalLibrary(x) &&
      !prog.isSourceFileDefaultLibrary(x),
  );

  let header: string
  try {
    header = fs.readFileSync("src/i18n/poheader", "utf-8")
  } catch (e) {
    header = DEFAULT_PO_HEADER
  }

  const chunks = [header];

  const knownMessageIds = new Set<string>();

  for (const f of ownFiles) {
    processFile(f, chunks, knownMessageIds);
  }

  const pot = chunks.join("");

  //console.log(pot);

  const packageJson = JSON.parse(
    fs.readFileSync("./package.json", { encoding: "utf-8" }),
  );

  const poDomain = packageJson.pogen?.domain;
  if (!poDomain) {
    console.error("missing 'pogen.domain' field in package.json");
    process.exit(1);
  }
  fs.writeFileSync(`./src/i18n/${poDomain}.pot`, pot);
}
