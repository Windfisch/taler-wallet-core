import { h, Fragment, VNode, ComponentChildren } from "preact";

export function Grid({}: {
  container?: boolean;
  wrap?: string;
  item?: boolean;
  spacing?: number;
  alignItems?: string;
  justify?: string;
  children: ComponentChildren;
}): VNode {
  return <Fragment />;
}
