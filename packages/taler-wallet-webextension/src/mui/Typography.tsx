import { css } from "@linaria/core";
import { h, Fragment, VNode, ComponentChildren } from "preact";
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
  noWrap?: boolean;
  paragraph?: boolean;
  variant?: VariantEnum;
  children?: ComponentChildren;
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

export function Typography({
  align,
  gutterBottom = false,
  noWrap = false,
  paragraph = false,
  variant = "body1",
  children,
}: Props): VNode {
  const cmp = paragraph
    ? "p"
    : defaultVariantMapping[variant as "h1"] || "span";

  const alignStyle =
    align == "inherit"
      ? {}
      : {
          textAlign: align,
        };
  console.log("typograph", cmp, variant);
  return h(
    cmp,
    {
      class: [
        root,
        noWrap && noWrapStyle,
        gutterBottom && gutterBottomStyle,
        paragraph && paragraphStyle,
        theme.typography[variant as "button"], //FIXME: implement the rest of the typography and remove the casting
      ].join(" "),
      style: {
        ...alignStyle,
      },
    },
    children,
  );
}
