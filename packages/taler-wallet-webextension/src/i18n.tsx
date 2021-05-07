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
 * Imports
 */

import * as i18nCore from "@gnu-taler/taler-wallet-core";
import { Component, ComponentChildren, h, JSX, toChildArray, VNode } from "preact";
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


export const str = i18nCore.str;
export const internalSetStrings = i18nCore.internalSetStrings;
export const strings = i18nCore.strings;


interface TranslateSwitchProps {
  target: number;
}

function stringifyChildren(children: any): string {
  let n = 1;
  const ss = toChildArray(children).map((c) => {
    if (typeof c === "string") {
      return c;
    }
    return `%${n++}$s`;
  });
  const s = ss.join("").replace(/ +/g, " ").trim();
  console.log("translation lookup", JSON.stringify(s));
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

function getTranslatedChildren(
  translation: string,
  children: ComponentChildren,
): ComponentChildren {
  const tr = translation.split(/%(\d+)\$s/);
  const childArray = toChildArray(children);
  // Merge consecutive string children.
  const placeholderChildren = [];
  for (let i = 0; i < childArray.length; i++) {
    const x = childArray[i];
    if (x === undefined) {
      continue;
    } else if (typeof x === "string") {
      continue;
    } else {
      placeholderChildren.push(x);
    }
  }
  const result = [];
  for (let i = 0; i < tr.length; i++) {
    if (i % 2 == 0) {
      // Text
      result.push(tr[i]);
    } else {
      const childIdx = Number.parseInt(tr[i]) - 1;
      result.push(placeholderChildren[childIdx]);
    }
  }
  return result;
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
export class Translate extends Component<TranslateProps, any> {
  render() {
    const s = stringifyChildren(this.props.children);
    const translation: string = i18nCore.jed.ngettext(s, s, 1);
    const result = getTranslatedChildren(translation, this.props.children);
    if (!this.props.wrap) {
      return <div>{result}</div>;
    }
    return h(this.props.wrap, this.props.wrapProps, result);
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
export class TranslateSwitch extends Component<
  TranslateSwitchProps,
  void
> {
  render(): JSX.Element {
    let singular: VNode<TranslationPluralProps> | undefined;
    let plural: VNode<TranslationPluralProps> | undefined;
    const children = this.props.children;
    if (children) {
      toChildArray(children).forEach((child: any) => {
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
      return h("span", {}, ["translation not found"]);
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
export class TranslatePlural extends Component<
  TranslationPluralProps,
  void
> {
  render(): JSX.Element {
    const s = stringifyChildren(this.props.children);
    const translation = i18nCore.jed.ngettext(s, s, 1);
    const result = getTranslatedChildren(translation, this.props.children);
    return <div>{result}</div>;
  }
}

/**
 * See [[TranslateSwitch]].
 */
export class TranslateSingular extends Component<
  TranslationPluralProps,
  void
> {
  render(): JSX.Element {
    const s = stringifyChildren(this.props.children);
    const translation = i18nCore.jed.ngettext(s, s, this.props.target);
    const result = getTranslatedChildren(translation, this.props.children);
    return <div>{result}</div>;
  }
}
