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

document.addEventListener(
  "DOMContentLoaded",
  function () {
    try {
      document.body.lang = chrome.i18n.getUILanguage();
    } catch (e) {
      // chrome.* not available?
    }
  });

declare var i18n: any;

/**
 * Information about the last two i18n results, used by plural()
 * 2-element array, each element contains { stringFound: boolean, pluralValue: number }
 */
var i18nResult = [] as any;

const JedModule: any = (window as any)["Jed"];
var jed: any;


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
 * Initialize Jed
 */
function init () {
  if ("object" === typeof jed) {
    return;
  }
  if ("function" !== typeof JedModule) {
    return;
  }
  if (!(i18n.lang in i18n.strings)) {
    i18n.lang = "en-US";
    return;
  }
  jed = new JedModule(i18n.strings[i18n.lang]);
}


/**
 * Convert template strings to a msgid
 */
function toI18nString(strings: string[]) {
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
 * Store information about the result of the last to i18n() or i18n.parts()
 *
 * @param i18nString   the string template as found in i18n.strings
 * @param pluralValue  value returned by getPluralValue()
 */
function setI18nResult (i18nString: string, pluralValue: number) {
  i18nResult[1] = i18nResult[0];
  i18nResult[0] = {
    stringFound: i18nString in i18n.strings[i18n.lang].locale_data[i18n.lang],
    pluralValue: pluralValue
  };
}


/**
 * Internationalize a string template with arbitrary serialized values.
 */
var i18n = (function i18n(strings: string[], ...values: any[]) {
  init();
  //console.log('i18n:', strings, values);
  if ("object" !== typeof jed) {
    // Fallback implementation in case i18n lib is not there
    return String.raw(strings as any, ...values);
  }

  let str = toI18nString (strings);
  let n = getPluralValue (values);
  let tr = jed.translate(str).ifPlural(n, str).fetch(...values);

  setI18nResult (str, n);
  return tr;
}) as any;

try {
  i18n.lang = chrome.i18n.getUILanguage();
} catch (e) {
  console.warn("i18n default language not available");
}
i18n.strings = {};


/**
 * Interpolate i18nized values with arbitrary objects.
 * @return Array of strings/objects.
 */
i18n.parts = function(strings: string[], ...values: any[]) {
  init();
  if ("object" !== typeof jed) {
    // Fallback implementation in case i18n lib is not there
    let parts: string[] = [];

    for (let i = 0; i < strings.length; i++) {
      parts.push(strings[i]);
      if (i < values.length) {
        parts.push(values[i]);
      }
    }
    return parts;
  }

  let str = toI18nString(strings);
  let n = getPluralValue(values);
  let tr = jed.ngettext(str, str, n).split(/%(\d+)\$s/);
  let parts: string[] = [];
  for (let i = 0; i < tr.length; i++) {
    if (0 == i % 2) {
      parts.push(tr[i]);
    } else {
      parts.push(values[parseInt(tr[i]) - 1]);
    }
  }

  setI18nResult(str, n);
  return parts;
};


/**
 * Pluralize based on first numeric parameter in the template.
 * @todo The plural argument is used for extraction by pogen.js
 */
i18n.plural = function (singular: any, plural: any) {
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
i18n.number = function (n : number) {
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

i18n.Translate = class extends React.Component<void,void> {
  render(): JSX.Element {
    init();
    if (typeof jed !== "object") {
      return <div>{this.props.children}</div>;
    }
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

i18n.TranslateSwitch = class extends React.Component<TranslateSwitchProps,void>{
  render(): JSX.Element {
    let singular: React.ReactElement<TranslationProps> | undefined;
    let plural: React.ReactElement<TranslationProps> | undefined;
    let children = this.props.children;
    if (children) {
      React.Children.forEach(children, (child: any) => {
        if (child.type == i18n.TranslatePlural) {
          plural = child;
        }
        if (child.type == i18n.TranslateSingular) {
          singular = child;
        }
      }); 
    }
    if ((!singular) || (!plural)) {
      console.error("translation not found");
      return React.createElement("span", {}, ["translation not found"]);
    }
    init();
    singular.props.target = this.props.target;
    plural.props.target = this.props.target;;
    if (typeof "jed" !== "object") {
      if (this.props.target == 1) {
        return singular;
      } else {
        return plural;
      }
    } else {
      // We're looking up the translation based on the
      // singular, even if we must use the plural form.
      return singular;
    }
  }
}

interface TranslationProps {
  target: number;
}

class TranslatePlural extends React.Component<TranslationProps,void> {
  render(): JSX.Element {
    init();
    if (typeof jed !== "object") {
      return <div>{this.props.children}</div>;
    }
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

i18n.TranslatePlural = TranslatePlural;

class TranslateSingular extends React.Component<TranslationProps,void> {
  render(): JSX.Element {
    init();
    if (typeof jed !== "object") {
      return <div>{this.props.children}</div>;
    }
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

i18n.TranslateSingular = TranslateSingular;
