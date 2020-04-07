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
 * Translation helpers for React components and template literals.
 */

/**
 * Imports.
 */
import { strings } from "../i18n/strings";

// @ts-ignore: no type decl for this library
import * as jedLib from "jed";

import * as React from "react";

const jed = setupJed();

const enableTracing = false;

/**
 * Set up jed library for internationalization,
 * based on browser language settings.
 */
function setupJed(): any {
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
  return new jedLib.Jed(strings[lang]);
}

/**
 * Convert template strings to a msgid
 */
function toI18nString(stringSeq: ReadonlyArray<string>): string {
  let s = "";
  for (let i = 0; i < stringSeq.length; i++) {
    s += stringSeq[i];
    if (i < stringSeq.length - 1) {
      s += `%${i + 1}$s`;
    }
  }
  return s;
}

/**
 * Internationalize a string template with arbitrary serialized values.
 */
export function str(stringSeq: TemplateStringsArray, ...values: any[]): string {
  const s = toI18nString(stringSeq);
  const tr = jed
    .translate(s)
    .ifPlural(1, s)
    .fetch(...values);
  return tr;
}

interface TranslateSwitchProps {
  target: number;
}

function stringifyChildren(children: any): string {
  let n = 1;
  const ss = React.Children.map(children, (c) => {
    if (typeof c === "string") {
      return c;
    }
    return `%${n++}$s`;
  });
  const s = ss.join("").replace(/ +/g, " ").trim();
  enableTracing && console.log("translation lookup", JSON.stringify(s));
  return s;
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

/**
 * Translate text node children of this component.
 * If a child component might produce a text node, it must be wrapped
 * in a another non-text element.
 *
 * Example:
 * ```
 * <Translate>
 * Hello.  Your score is <span><PlayerScore player={player} /></span>
 * </Translate>
 * ```
 */
export class Translate extends React.Component<TranslateProps, {}> {
  render(): JSX.Element {
    const s = stringifyChildren(this.props.children);
    const tr = jed
      .ngettext(s, s, 1)
      .split(/%(\d+)\$s/)
      .filter((e: any, i: number) => i % 2 === 0);
    const childArray = React.Children.toArray(this.props.children);
    for (let i = 0; i < childArray.length - 1; ++i) {
      if (
        typeof childArray[i] === "string" &&
        typeof childArray[i + 1] === "string"
      ) {
        childArray[i + 1] = (childArray[i] as string).concat(
          childArray[i + 1] as string,
        );
        childArray.splice(i, 1);
      }
    }
    const result = [];
    while (childArray.length > 0) {
      const x = childArray.shift();
      if (x === undefined) {
        continue;
      }
      if (typeof x === "string") {
        const t = tr.shift();
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

/**
 * Switch translation based on singular or plural based on the target prop.
 * Should only contain TranslateSingular and TransplatePlural as children.
 *
 * Example:
 * ```
 * <TranslateSwitch target={n}>
 *  <TranslateSingular>I have {n} apple.</TranslateSingular>
 *  <TranslatePlural>I have {n} apples.</TranslatePlural>
 * </TranslateSwitch>
 * ```
 */
export class TranslateSwitch extends React.Component<
  TranslateSwitchProps,
  void
> {
  render(): JSX.Element {
    let singular: React.ReactElement<TranslationPluralProps> | undefined;
    let plural: React.ReactElement<TranslationPluralProps> | undefined;
    const children = this.props.children;
    if (children) {
      React.Children.forEach(children, (child: any) => {
        if (child.type === TranslatePlural) {
          plural = child;
        }
        if (child.type === TranslateSingular) {
          singular = child;
        }
      });
    }
    if (!singular || !plural) {
      console.error("translation not found");
      return React.createElement("span", {}, ["translation not found"]);
    }
    singular.props.target = this.props.target;
    plural.props.target = this.props.target;
    // We're looking up the translation based on the
    // singular, even if we must use the plural form.
    return singular;
  }
}

interface TranslationPluralProps {
  target: number;
}

/**
 * See [[TranslateSwitch]].
 */
export class TranslatePlural extends React.Component<
  TranslationPluralProps,
  void
> {
  render(): JSX.Element {
    const s = stringifyChildren(this.props.children);
    const tr = jed
      .ngettext(s, s, 1)
      .split(/%(\d+)\$s/)
      .filter((e: any, i: number) => i % 2 === 0);
    const childArray = React.Children.toArray(this.props.children);
    for (let i = 0; i < childArray.length - 1; ++i) {
      if (
        typeof childArray[i] === "string" &&
        typeof childArray[i + 1] === "string"
      ) {
        childArray[i + i] = ((childArray[i] as string) +
          childArray[i + 1]) as string;
        childArray.splice(i, 1);
      }
    }
    const result = [];
    while (childArray.length > 0) {
      const x = childArray.shift();
      if (x === undefined) {
        continue;
      }
      if (typeof x === "string") {
        const t = tr.shift();
        result.push(t);
      } else {
        result.push(x);
      }
    }
    return <div>{result}</div>;
  }
}

/**
 * See [[TranslateSwitch]].
 */
export class TranslateSingular extends React.Component<
  TranslationPluralProps,
  void
> {
  render(): JSX.Element {
    const s = stringifyChildren(this.props.children);
    const tr = jed
      .ngettext(s, s, 1)
      .split(/%(\d+)\$s/)
      .filter((e: any, i: number) => i % 2 === 0);
    const childArray = React.Children.toArray(this.props.children);
    for (let i = 0; i < childArray.length - 1; ++i) {
      if (
        typeof childArray[i] === "string" &&
        typeof childArray[i + 1] === "string"
      ) {
        childArray[i + i] = ((childArray[i] as string) +
          childArray[i + 1]) as string;
        childArray.splice(i, 1);
      }
    }
    const result = [];
    while (childArray.length > 0) {
      const x = childArray.shift();
      if (x === undefined) {
        continue;
      }
      if (typeof x === "string") {
        const t = tr.shift();
        result.push(t);
      } else {
        result.push(x);
      }
    }
    return <div>{result}</div>;
  }
}
