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
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
/**
 * Generate .po file from list of source files.
 *
 * Note that duplicate message IDs are NOT merged, to get the same output as
 * you would from xgettext, just run msguniq.
 *
 * @author Florian Dold
 */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_1 = require("fs");
var ts = require("typescript");
function wordwrap(str, width) {
    if (width === void 0) { width = 80; }
    var regex = '.{1,' + width + '}(\\s|$)|\\S+(\\s|$)';
    return str.match(RegExp(regex, 'g'));
}
function processFile(sourceFile) {
    processNode(sourceFile);
    var lastTokLine = 0;
    var preLastTokLine = 0;
    function getTemplate(node) {
        switch (node.kind) {
            case ts.SyntaxKind.FirstTemplateToken:
                return node.text;
            case ts.SyntaxKind.TemplateExpression:
                var te = node;
                var textFragments = [te.head.text];
                for (var _i = 0, _a = te.templateSpans; _i < _a.length; _i++) {
                    var tsp = _a[_i];
                    textFragments.push("%" + ((textFragments.length - 1) / 2 + 1) + "$s");
                    textFragments.push(tsp.literal.text.replace(/%/g, "%%"));
                }
                return textFragments.join('');
            default:
                return "(pogen.ts: unable to parse)";
        }
    }
    function getComment(node) {
        var lc = ts.getLineAndCharacterOfPosition(sourceFile, node.pos);
        var lastComments;
        for (var l = preLastTokLine; l < lastTokLine; l++) {
            var pos = ts.getPositionOfLineAndCharacter(sourceFile, l, 0);
            var comments = ts.getTrailingCommentRanges(sourceFile.text, pos);
            if (comments) {
                lastComments = comments;
            }
        }
        if (!lastComments) {
            return;
        }
        var candidate = lastComments[lastComments.length - 1];
        var candidateEndLine = ts.getLineAndCharacterOfPosition(sourceFile, candidate.end).line;
        if (candidateEndLine != lc.line - 1) {
            return;
        }
        var text = sourceFile.text.slice(candidate.pos, candidate.end);
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
    function getPath(node) {
        switch (node.kind) {
            case ts.SyntaxKind.PropertyAccessExpression:
                var pae = node;
                return Array.prototype.concat(getPath(pae.expression), [pae.name.text]);
            case ts.SyntaxKind.Identifier:
                var id = node;
                return [id.text];
        }
        return ["(other)"];
    }
    function arrayEq(a1, a2) {
        if (a1.length != a2.length) {
            return false;
        }
        for (var i = 0; i < a1.length; i++) {
            if (a1[i] != a2[i]) {
                return false;
            }
        }
        return true;
    }
    function processTaggedTemplateExpression(tte) {
        var lc = ts.getLineAndCharacterOfPosition(sourceFile, tte.pos);
        if (lc.line != lastTokLine) {
            preLastTokLine = lastTokLine;
            lastTokLine = lc.line;
        }
        var path = getPath(tte.tag);
        var res = {
            path: path,
            line: lc.line,
            comment: getComment(tte),
            template: getTemplate(tte.template).replace(/"/g, '\\"'),
        };
        return res;
    }
    function formatMsgComment(line, comment) {
        if (comment) {
            for (var _i = 0, _a = comment.split('\n'); _i < _a.length; _i++) {
                var cl = _a[_i];
                console.log("#. " + cl);
            }
        }
        console.log("#: " + sourceFile.fileName + ":" + (line + 1));
        console.log("#, c-format");
    }
    function formatMsgLine(head, msg) {
        // Do escaping, wrap break at newlines
        var parts = msg
            .match(/(.*\n|.+$)/g)
            .map(function (x) { return x.replace(/\n/g, '\\n'); })
            .map(function (p) { return wordwrap(p); })
            .reduce(function (a, b) { return a.concat(b); });
        if (parts.length == 1) {
            console.log(head + " \"" + parts[0] + "\"");
        }
        else {
            console.log(head + " \"\"");
            for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
                var p = parts_1[_i];
                console.log("\"" + p + "\"");
            }
        }
    }
    function getJsxElementPath(node) {
        var path;
        var process = function (childNode) {
            switch (childNode.kind) {
                case ts.SyntaxKind.JsxOpeningElement:
                    {
                        var e = childNode;
                        return path = getPath(e.tagName);
                    }
                default:
                    break;
            }
        };
        ts.forEachChild(node, process);
        return path;
    }
    function translateJsxExpression(node, h) {
        switch (node.kind) {
            case ts.SyntaxKind.StringLiteral:
                {
                    var e = node;
                    return e.text;
                }
            default:
                return "%" + h[0]++ + "$s";
        }
    }
    function trim(s) {
        return s.replace(/^[ \n\t]*/, "").replace(/[ \n\t]*$/, "");
    }
    function getJsxContent(node) {
        var fragments = [];
        var holeNum = [1];
        var process = function (childNode) {
            switch (childNode.kind) {
                case ts.SyntaxKind.JsxText:
                    {
                        var e = childNode;
                        var t = e.getText().split("\n").map(trim).join("\n");
                        fragments.push(t);
                    }
                case ts.SyntaxKind.JsxOpeningElement:
                    break;
                case ts.SyntaxKind.JsxElement:
                    fragments.push("%" + holeNum[0]++ + "$s");
                    break;
                case ts.SyntaxKind.JsxExpression:
                    {
                        var e = childNode;
                        fragments.push(translateJsxExpression(e.expression, holeNum));
                        break;
                    }
                case ts.SyntaxKind.JsxClosingElement:
                    break;
                default:
                    var lc = ts.getLineAndCharacterOfPosition(childNode.getSourceFile(), childNode.getStart());
                    console.error("unrecognized syntax in JSX Element " + ts.SyntaxKind[childNode.kind] + " (" + childNode.getSourceFile().fileName + ":" + (lc.line + 1) + ":" + (lc.character + 1));
                    break;
            }
        };
        ts.forEachChild(node, process);
        return fragments.join("");
    }
    function getJsxSingular(node) {
        var res;
        var process = function (childNode) {
            switch (childNode.kind) {
                case ts.SyntaxKind.JsxElement:
                    {
                        var path = getJsxElementPath(childNode);
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
    function getJsxPlural(node) {
        var res;
        var process = function (childNode) {
            switch (childNode.kind) {
                case ts.SyntaxKind.JsxElement:
                    {
                        var path = getJsxElementPath(childNode);
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
    function processNode(node) {
        switch (node.kind) {
            case ts.SyntaxKind.JsxElement:
                var path = getJsxElementPath(node);
                if (arrayEq(path, ["i18n", "Translate"])) {
                    var content = getJsxContent(node);
                    var line = ts.getLineAndCharacterOfPosition(sourceFile, node.pos).line;
                    var comment = getComment(node);
                    formatMsgComment(line, comment);
                    formatMsgLine("msgid", content);
                    console.log("msgstr \"\"");
                    console.log();
                    return;
                }
                if (arrayEq(path, ["i18n", "TranslateSwitch"])) {
                    var line = ts.getLineAndCharacterOfPosition(sourceFile, node.pos).line;
                    var comment = getComment(node);
                    formatMsgComment(line, comment);
                    var singularForm = getJsxSingular(node);
                    if (!singularForm) {
                        console.error("singular form missing");
                        process.exit(1);
                    }
                    var pluralForm = getJsxPlural(node);
                    if (!pluralForm) {
                        console.error("plural form missing");
                        process.exit(1);
                    }
                    formatMsgLine("msgid", singularForm);
                    formatMsgLine("msgid_plural", pluralForm);
                    console.log("msgstr[0] \"\"");
                    console.log("msgstr[1] \"\"");
                    console.log();
                    return;
                }
                break;
            case ts.SyntaxKind.CallExpression:
                {
                    // might be i18n.plural(i18n[.X]`...`, i18n[.X]`...`)
                    var ce = node;
                    var path_1 = getPath(ce.expression);
                    if (!arrayEq(path_1, ["i18n", "plural"])) {
                        break;
                    }
                    if (ce.arguments[0].kind != ts.SyntaxKind.TaggedTemplateExpression) {
                        break;
                    }
                    if (ce.arguments[1].kind != ts.SyntaxKind.TaggedTemplateExpression) {
                        break;
                    }
                    var line = ts.getLineAndCharacterOfPosition(sourceFile, ce.pos).line;
                    var t1 = processTaggedTemplateExpression(ce.arguments[0]);
                    var t2 = processTaggedTemplateExpression(ce.arguments[1]);
                    var comment = getComment(ce);
                    formatMsgComment(line, comment);
                    formatMsgLine("msgid", t1.template);
                    formatMsgLine("msgid_plural", t2.template);
                    console.log("msgstr[0] \"\"");
                    console.log("msgstr[1] \"\"");
                    console.log();
                    // Important: no processing for child i18n expressions here
                    return;
                }
            case ts.SyntaxKind.TaggedTemplateExpression:
                {
                    var tte = node;
                    var _a = processTaggedTemplateExpression(tte), comment = _a.comment, template = _a.template, line = _a.line, path_2 = _a.path;
                    if (path_2[0] != "i18n") {
                        break;
                    }
                    formatMsgComment(line, comment);
                    formatMsgLine("msgid", template);
                    console.log("msgstr \"\"");
                    console.log();
                    break;
                }
        }
        ts.forEachChild(node, processNode);
    }
}
exports.processFile = processFile;
var fileNames = process.argv.slice(2);
console.log("# SOME DESCRIPTIVE TITLE.\n# Copyright (C) YEAR THE PACKAGE'S COPYRIGHT HOLDER\n# This file is distributed under the same license as the PACKAGE package.\n# FIRST AUTHOR <EMAIL@ADDRESS>, YEAR.\n#\n#, fuzzy\nmsgid \"\"\nmsgstr \"\"\n\"Project-Id-Version: PACKAGE VERSION\\n\"\n\"Report-Msgid-Bugs-To: \\n\"\n\"POT-Creation-Date: 2016-11-23 00:00+0100\\n\"\n\"PO-Revision-Date: YEAR-MO-DA HO:MI+ZONE\\n\"\n\"Last-Translator: FULL NAME <EMAIL@ADDRESS>\\n\"\n\"Language-Team: LANGUAGE <LL@li.org>\\n\"\n\"Language: \\n\"\n\"MIME-Version: 1.0\\n\"\n\"Content-Type: text/plain; charset=UTF-8\\n\"\n\"Content-Transfer-Encoding: 8bit\\n\"");
console.log();
fileNames.sort();
fileNames.forEach(function (fileName) {
    var sourceFile = ts.createSourceFile(fileName, fs_1.readFileSync(fileName).toString(), ts.ScriptTarget.ES2016, /*setParentNodes */ true);
    processFile(sourceFile);
});
