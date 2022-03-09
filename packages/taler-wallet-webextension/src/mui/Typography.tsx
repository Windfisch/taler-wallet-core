import { h, Fragment, VNode, ComponentChildren } from "preact";

interface Props {
  children: ComponentChildren;
}

export function Typography({ children }: Props): VNode {
  return <p>{children}</p>;
}
