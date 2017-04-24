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

"use strict";

import * as jedLib from "jed";
import {strings} from "./i18n/strings";

import * as React from "react";

console.log("jed:", jedLib);

/**
 * Information about the last two i18n results, used by plural()
 * 2-element array, each element contains { stringFound: boolean, pluralValue: number }
 */
const i18nResult = [] as any;

let lang: string;
try {
  lang = chrome.i18n.getUILanguage();
  // Chrome gives e.g. "en-US", but Firefox gives us "en_US"
  lang = lang.replace("_", "-");
} catch (e) {
  lang = "en";
  console.warn("i18n default language not available");
}

if (!strings[lang]) {
  lang = "en-US";
  console.log(`language ${lang} not found, defaulting to english`);
}

let jed = new jedLib.Jed(strings[lang]);


class PluralNumber {
  n: number;

  constructor(n: number) {
    this.n = n;
  }

  valueOf () {
    return this.n;
  }

  toString () {
    return this.n.toString();
  }
}


/**
 * Convert template strings to a msgid
 */
function toI18nString(strings: ReadonlyArray<string>) {
  let str = "";
  for (let i = 0; i < strings.length; i++) {
    str += strings[i];
    if (i < strings.length - 1) {
      str += "%"+ (i+1) +"$s";
    }
  }
  return str;
}


/**
 * Use the first number in values to determine plural form
 */
function getPluralValue (values: any) {
  let n = null;
  for (let i = 0; i < values.length; i++) {
    if ("number" === typeof values[i] || values[i] instanceof PluralNumber) {
      if (null === n || values[i] instanceof PluralNumber) {
        n = values[i].valueOf();
      }
    }
  }
  return (null === n) ? 1 : n;
}


/**
 * Store information about the result of the last to i18n().
 *
 * @param i18nString   the string template as found in i18n.strings
 * @param pluralValue  value returned by getPluralValue()
 */
function setI18nResult (i18nString: string, pluralValue: number) {
  i18nResult[1] = i18nResult[0];
  i18nResult[0] = {
    stringFound: i18nString in strings[lang].locale_data[lang],
    pluralValue: pluralValue
  };
}


/**
 * Internationalize a string template with arbitrary serialized values.
 */
export function str(strings: TemplateStringsArray, ...values: any[]) {
  let str = toI18nString(strings);
  let n = getPluralValue(values);
  let tr = jed.translate(str).ifPlural(n, str).fetch(...values);

  setI18nResult(str, n);
  return tr;
}


/**
 * Pluralize based on first numeric parameter in the template.
 * @todo The plural argument is used for extraction by pogen.js
 */
function plural(singular: any, plural: any) {
  if (i18nResult[1].stringFound) { // string found in translation file?
    // 'singular' has the correctly translated & pluralized text
    return singular;
  } else {
    // return appropriate form based on value found in 'singular'
    return (1 == i18nResult[1].pluralValue) ? singular : plural;
  }
};

interface TranslateSwitchProps {
  target: number;
}

/**
 * Return a number that is used to determine the plural form for a template.
 */
function number(n : number) {
  return new PluralNumber (n);
};

function stringifyChildren(children: any): string {
  let n = 1;
  let ss = React.Children.map(children, (c) => {
    if (typeof c === "string") {
      return c;
    }
    return `%${n++}$s`;
  });
  return ss.join("");
}


interface TranslateProps {
  /**
   * Component that the translated element should be wrapped in.
   * Defaults to "div".
   */
  wrap?: any;

  /**
   * Props to give to the wrapped component.
   */
  wrapProps?: any;
}


export class Translate extends React.Component<TranslateProps,void> {
  render(): JSX.Element {
    let s = stringifyChildren(this.props.children);
    let tr = jed.ngettext(s, s, 1).split(/%(\d+)\$s/).filter((e: any, i: number) => i % 2 == 0);
    let childArray = React.Children.toArray(this.props.children!);
    for (let i = 0; i < childArray.length - 1; ++i) {
      if ((typeof childArray[i]) == "string" && (typeof childArray[i+1]) == "string") {
        childArray[i+i] = childArray[i] as string + childArray[i+1] as string;
        childArray.splice(i,1);
      }
    }
    let result = [];
    while (childArray.length > 0) {
      let x = childArray.shift();
      if (x === undefined) {
        continue;
      }
      if (typeof x === "string") {
        let t = tr.shift();
        result.push(t);
      } else {
        result.push(x);
      }
    }
    if (!this.props.wrap) {
      return <div>{result}</div>;
    }
    return React.createElement(this.props.wrap, this.props.wrapProps, result);
  }
}


export class TranslateSwitch extends React.Component<TranslateSwitchProps,void>{
  render(): JSX.Element {
    let singular: React.ReactElement<TranslationPluralProps> | undefined;
    let plural: React.ReactElement<TranslationPluralProps> | undefined;
    let children = this.props.children;
    if (children) {
      React.Children.forEach(children, (child: any) => {
        if (child.type == TranslatePlural) {
          plural = child;
        }
        if (child.type == TranslateSingular) {
          singular = child;
        }
      }); 
    }
    if ((!singular) || (!plural)) {
      console.error("translation not found");
      return React.createElement("span", {}, ["translation not found"]);
    }
    singular.props.target = this.props.target;
    plural.props.target = this.props.target;;
    // We're looking up the translation based on the
    // singular, even if we must use the plural form.
    return singular;
  }
}


interface TranslationPluralProps {
  target: number;
}


export class TranslatePlural extends React.Component<TranslationPluralProps,void> {
  render(): JSX.Element {
    let s = stringifyChildren(this.props.children);
    let tr = jed.ngettext(s, s, 1).split(/%(\d+)\$s/).filter((e: any, i: number) => i % 2 == 0);
    let childArray = React.Children.toArray(this.props.children!);
    for (let i = 0; i < childArray.length - 1; ++i) {
      if ((typeof childArray[i]) == "string" && (typeof childArray[i+1]) == "string") {
        childArray[i+i] = childArray[i] as string + childArray[i+1] as string;
        childArray.splice(i,1);
      }
    }
    let result = [];
    while (childArray.length > 0) {
      let x = childArray.shift();
      if (x === undefined) {
        continue;
      }
      if (typeof x === "string") {
        let t = tr.shift();
        result.push(t);
      } else {
        result.push(x);
      }
    }
    return <div>{result}</div>;
  }
}


export class TranslateSingular extends React.Component<TranslationPluralProps,void> {
  render(): JSX.Element {
    let s = stringifyChildren(this.props.children);
    let tr = jed.ngettext(s, s, 1).split(/%(\d+)\$s/).filter((e: any, i: number) => i % 2 == 0);
    let childArray = React.Children.toArray(this.props.children!);
    for (let i = 0; i < childArray.length - 1; ++i) {
      if ((typeof childArray[i]) == "string" && (typeof childArray[i+1]) == "string") {
        childArray[i+i] = childArray[i] as string + childArray[i+1] as string;
        childArray.splice(i,1);
      }
    }
    let result = [];
    while (childArray.length > 0) {
      let x = childArray.shift();
      if (x === undefined) {
        continue;
      }
      if (typeof x === "string") {
        let t = tr.shift();
        result.push(t);
      } else {
        result.push(x);
      }
    }
    return <div>{result}</div>;
  }
}
