import { css } from "@linaria/core";
import { ComponentChildren, h, VNode } from "preact";
import { useTranslationContext } from "../context/translation.js";
// eslint-disable-next-line import/extensions
import { theme } from "./style";

type VariantEnum =
  | "body1"
  | "body2"
  | "button"
  | "caption"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "inherit"
  | "overline"
  | "subtitle1"
  | "subtitle2";

interface Props {
  align?: "center" | "inherit" | "justify" | "left" | "right";
  gutterBottom?: boolean;
  bold?: boolean;
  inline?: boolean;
  noWrap?: boolean;
  paragraph?: boolean;
  variant?: VariantEnum;
  children: string[] | string;
  class?: string;
}

const defaultVariantMapping = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  h5: "h5",
  h6: "h6",
  subtitle1: "h6",
  subtitle2: "h6",
  body1: "p",
  body2: "p",
  inherit: "p",
};

const root = css`
  margin: 0;
`;

const noWrapStyle = css`
  overflow: "hidden";
  text-overflow: "ellipsis";
  white-space: "nowrap";
`;
const gutterBottomStyle = css`
  margin-bottom: 0.35em;
`;
const paragraphStyle = css`
  margin-bottom: 16px;
`;
const boldStyle = css`
  font-weight: bold;
`;

export function Typography({
  align,
  gutterBottom = false,
  noWrap = false,
  paragraph = false,
  variant = "body1",
  bold,
  inline,
  children,
  class: _class,
}: Props): VNode {
  const { i18n } = useTranslationContext();

  const Component = inline
    ? "span"
    : paragraph === true
    ? "p"
    : defaultVariantMapping[variant as "h1"] || "span";

  const alignStyle =
    align == "inherit"
      ? {}
      : {
          textAlign: align,
        };

  return h(
    Component,
    {
      class: [
        _class,
        root,
        noWrap && noWrapStyle,
        gutterBottom && gutterBottomStyle,
        paragraph && paragraphStyle,
        bold && boldStyle,
        theme.typography[variant as "button"], //FIXME: implement the rest of the typography and remove the casting
      ].join(" "),
      style: alignStyle,
    },
    <i18n.Translate>{children}</i18n.Translate>,
  );
}
