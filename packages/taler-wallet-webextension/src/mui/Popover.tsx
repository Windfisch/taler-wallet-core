import { css } from "@linaria/core";
import { h, JSX, VNode, ComponentChildren } from "preact";
// eslint-disable-next-line import/extensions
import { alpha } from "./colors/manipulation";
// eslint-disable-next-line import/extensions
import { theme } from "./style";

const baseStyle = css``;

interface Props {
  class: string;
  children: ComponentChildren;
}

export function Popover({ class: _class, children, ...rest }: Props): VNode {
  return (
    <div class={[_class, baseStyle].join(" ")} style={{}} {...rest}>
      {children}
    </div>
  );
}

function getOffsetTop(rect: any, vertical: any): number {
  let offset = 0;

  if (typeof vertical === "number") {
    offset = vertical;
  } else if (vertical === "center") {
    offset = rect.height / 2;
  } else if (vertical === "bottom") {
    offset = rect.height;
  }

  return offset;
}

function getOffsetLeft(rect: any, horizontal: any): number {
  let offset = 0;

  if (typeof horizontal === "number") {
    offset = horizontal;
  } else if (horizontal === "center") {
    offset = rect.width / 2;
  } else if (horizontal === "right") {
    offset = rect.width;
  }

  return offset;
}

function getTransformOriginValue(transformOrigin): string {
  return [transformOrigin.horizontal, transformOrigin.vertical]
    .map((n) => (typeof n === "number" ? `${n}px` : n))
    .join(" ");
}

function resolveAnchorEl(anchorEl: any): any {
  return typeof anchorEl === "function" ? anchorEl() : anchorEl;
}
