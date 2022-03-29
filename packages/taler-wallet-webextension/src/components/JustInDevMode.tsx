import { ComponentChildren, Fragment, h, VNode } from "preact";
import { useDevContext } from "../context/devContext.js";

export function JustInDevMode({
  children,
}: {
  children: ComponentChildren;
}): VNode {
  const { devMode } = useDevContext();
  if (!devMode) return <Fragment />;
  return <Fragment>{children}</Fragment>;
}
