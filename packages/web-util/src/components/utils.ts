import { createElement, VNode } from "preact";

export type StateFunc<S> = (p: S) => VNode;

export type StateViewMap<StateType extends { status: string }> = {
  [S in StateType as S["status"]]: StateFunc<S>;
};

export type RecursiveState<S extends object> = S | (() => RecursiveState<S>);

export function compose<SType extends { status: string }, PType>(
  hook: (p: PType) => RecursiveState<SType>,
  viewMap: StateViewMap<SType>,
): (p: PType) => VNode {
  function withHook(stateHook: () => RecursiveState<SType>): () => VNode {
    function ComposedComponent(): VNode {
      const state = stateHook();

      if (typeof state === "function") {
        const subComponent = withHook(state);
        return createElement(subComponent, {});
      }

      const statusName = state.status as unknown as SType["status"];
      const viewComponent = viewMap[statusName] as unknown as StateFunc<SType>;
      return createElement(viewComponent, state);
    }

    return ComposedComponent;
  }

  return (p: PType) => {
    const h = withHook(() => hook(p));
    return h();
  };
}
