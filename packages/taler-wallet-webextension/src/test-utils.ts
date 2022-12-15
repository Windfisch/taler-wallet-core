/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { NotificationType } from "@gnu-taler/taler-util";
import {
  WalletCoreApiClient,
  WalletCoreOpKeys,
  WalletCoreRequestType,
  WalletCoreResponseType,
} from "@gnu-taler/taler-wallet-core";
import {
  ComponentChildren,
  Fragment,
  FunctionalComponent,
  h as create,
  options,
  render as renderIntoDom,
  VNode,
} from "preact";
import { render as renderToString } from "preact-render-to-string";
import { BackendProvider } from "./context/backend.js";
import { BackgroundApiClient, wxApi } from "./wxApi.js";

// When doing tests we want the requestAnimationFrame to be as fast as possible.
// without this option the RAF will timeout after 100ms making the tests slower
options.requestAnimationFrame = (fn: () => void) => {
  // console.log("RAF called")
  return fn();
};

export function createExample<Props>(
  Component: FunctionalComponent<Props>,
  props: Partial<Props> | (() => Partial<Props>),
): ComponentChildren {
  //FIXME: props are evaluated on build time
  // in some cases we want to evaluated the props on render time so we can get some relative timestamp
  // check how we can build evaluatedProps in render time
  const evaluatedProps = typeof props === "function" ? props() : props;
  const Render = (args: any): VNode => create(Component, args);
  // Render.args = evaluatedProps;

  return {
    component: Render,
    props: evaluatedProps,
  };
}

export function createExampleWithCustomContext<Props, ContextProps>(
  Component: FunctionalComponent<Props>,
  props: Partial<Props> | (() => Partial<Props>),
  ContextProvider: FunctionalComponent<ContextProps>,
  contextProps: Partial<ContextProps>,
): ComponentChildren {
  const evaluatedProps = typeof props === "function" ? props() : props;
  const Render = (args: any): VNode => create(Component, args);
  const WithContext = (args: any): VNode =>
    create(ContextProvider, {
      ...contextProps,
      children: [Render(args)],
    } as any);

  return {
    component: WithContext,
    props: evaluatedProps,
  };
}

export function NullLink({
  children,
}: {
  children?: ComponentChildren;
}): VNode {
  return create("a", { children, href: "javascript:void(0);" });
}

export function renderNodeOrBrowser(Component: any, args: any): void {
  const vdom = create(Component, args);
  if (typeof window === "undefined") {
    renderToString(vdom);
  } else {
    const div = document.createElement("div");
    document.body.appendChild(div);
    renderIntoDom(vdom, div);
    renderIntoDom(null, div);
    document.body.removeChild(div);
  }
}
type RecursiveState<S> = S | (() => RecursiveState<S>);

interface Mounted<T> {
  unmount: () => void;
  pullLastResultOrThrow: () => Exclude<T, VoidFunction>;
  assertNoPendingUpdate: () => void;
  // waitNextUpdate: (s?: string) => Promise<void>;
  waitForStateUpdate: () => Promise<boolean>;
}

const isNode = typeof window === "undefined";

export function mountHook<T extends object>(
  callback: () => RecursiveState<T>,
  Context?: ({ children }: { children: any }) => VNode,
): Mounted<T> {
  let lastResult: Exclude<T, VoidFunction> | Error | null = null;

  const listener: Array<() => void> = [];

  // component that's going to hold the hook
  function Component(): VNode {
    try {
      let componentOrResult = callback();
      while (typeof componentOrResult === "function") {
        componentOrResult = componentOrResult();
      }
      //typecheck fails here
      const l: Exclude<T, () => void> = componentOrResult as any;
      lastResult = l;
    } catch (e) {
      if (e instanceof Error) {
        lastResult = e;
      } else {
        lastResult = new Error(`mounting the hook throw an exception: ${e}`);
      }
    }

    // notify to everyone waiting for an update and clean the queue
    listener.splice(0, listener.length).forEach((cb) => cb());
    return create(Fragment, {});
  }

  // create the vdom with context if required
  const vdom = !Context
    ? create(Component, {})
    : create(Context, { children: [create(Component, {})] });

  const customElement = {} as Element;
  const parentElement = isNode ? customElement : document.createElement("div");
  if (!isNode) {
    document.body.appendChild(parentElement);
  }

  renderIntoDom(vdom, parentElement);

  // clean up callback
  function unmount(): void {
    if (!isNode) {
      document.body.removeChild(parentElement);
    }
  }

  function pullLastResult(): Exclude<T | Error | null, VoidFunction> {
    const copy: Exclude<T | Error | null, VoidFunction> = lastResult;
    lastResult = null;
    return copy;
  }

  function pullLastResultOrThrow(): Exclude<T, VoidFunction> {
    const r = pullLastResult();
    if (r instanceof Error) throw r;
    if (!r) throw Error("there was no last result");
    return r;
  }

  async function assertNoPendingUpdate(): Promise<void> {
    await new Promise((res, rej) => {
      const tid = setTimeout(() => {
        res(undefined);
      }, 10);

      listener.push(() => {
        clearTimeout(tid);
        rej(
          Error(`Expecting no pending result but the hook got updated. 
        If the update was not intended you need to check the hook dependencies 
        (or dependencies of the internal state) but otherwise make 
        sure to consume the result before ending the test.`),
        );
      });
    });

    const r = pullLastResult();
    if (r)
      throw Error(`There are still pending results.
    This may happen because the hook did a new update but the test didn't consume the result using pullLastResult`);
  }
  async function waitForStateUpdate(): Promise<boolean> {
    return await new Promise((res, rej) => {
      const tid = setTimeout(() => {
        res(false);
      }, 10);

      listener.push(() => {
        clearTimeout(tid);
        res(true);
      });
    });
  }

  return {
    unmount,
    pullLastResultOrThrow,
    waitForStateUpdate,
    assertNoPendingUpdate,
  };
}

export const nullFunction: any = () => null;

interface MockHandler {
  addWalletCallResponse<Op extends WalletCoreOpKeys>(
    operation: Op,
    payload?: Partial<WalletCoreRequestType<Op>>,
    response?: WalletCoreResponseType<Op>,
    callback?: () => void,
  ): MockHandler;

  getCallingQueueState(): "empty" | string;

  notifyEventFromWallet(event: NotificationType): void;
}

type CallRecord = WalletCallRecord | BackgroundCallRecord;
interface WalletCallRecord {
  source: "wallet";
  callback: () => void;
  operation: WalletCoreOpKeys;
  payload?: WalletCoreRequestType<WalletCoreOpKeys>;
  response?: WalletCoreResponseType<WalletCoreOpKeys>;
}
interface BackgroundCallRecord {
  source: "background";
  name: string;
  args: any;
  response: any;
}

type Subscriptions = {
  [key in NotificationType]?: VoidFunction;
};

export function createWalletApiMock(): {
  handler: MockHandler;
  TestingContext: FunctionalComponent<{ children: ComponentChildren }>;
} {
  const calls = new Array<CallRecord>();
  const subscriptions: Subscriptions = {};

  const mock: typeof wxApi = {
    wallet: new Proxy<WalletCoreApiClient>({} as any, {
      get(target, name, receiver) {
        const functionName = String(name);
        if (functionName !== "call") {
          throw Error(
            `the only method in wallet api should be 'call': ${functionName}`,
          );
        }
        return function (
          operation: WalletCoreOpKeys,
          payload: WalletCoreRequestType<WalletCoreOpKeys>,
        ) {
          const next = calls.shift();

          if (!next) {
            throw Error(
              `wallet operation was called but none was expected: ${operation} (${JSON.stringify(
                payload,
                undefined,
                2,
              )})`,
            );
          }
          if (next.source !== "wallet") {
            throw Error(`wallet operation expected`);
          }
          if (operation !== next.operation) {
            //more checks, deep check payload
            throw Error(
              `wallet operation doesn't match: expected ${next.operation} actual ${operation}`,
            );
          }
          next.callback();

          return next.response ?? {};
        };
      },
    }),
    listener: {
      onUpdateNotification(
        mTypes: NotificationType[],
        callback: (() => void) | undefined,
      ): () => void {
        mTypes.forEach((m) => {
          subscriptions[m] = callback;
        });
        return nullFunction;
      },
    },
    background: new Proxy<BackgroundApiClient>({} as any, {
      get(target, name, receiver) {
        const functionName = String(name);
        return function (...args: any) {
          const next = calls.shift();
          if (!next) {
            throw Error(
              `background operation was called but none was expected: ${functionName} (${JSON.stringify(
                args,
                undefined,
                2,
              )})`,
            );
          }
          if (next.source !== "background" || functionName !== next.name) {
            //more checks, deep check args
            throw Error(`background operation doesn't match`);
          }
          return next.response;
        };
      },
    }),
  };

  const handler: MockHandler = {
    addWalletCallResponse(operation, payload, response, cb) {
      calls.push({
        source: "wallet",
        operation,
        payload,
        response,
        callback: cb
          ? cb
          : () => {
              null;
            },
      });
      return handler;
    },
    notifyEventFromWallet(event: NotificationType): void {
      const callback = subscriptions[event];
      if (!callback)
        throw Error(`Expected to have a subscription for ${event}`);
      return callback();
    },
    getCallingQueueState() {
      return calls.length === 0 ? "empty" : `${calls.length} left`;
    },
  };

  function TestingContext({
    children,
  }: {
    children: ComponentChildren;
  }): VNode {
    return create(
      BackendProvider,
      {
        wallet: mock.wallet,
        background: mock.background,
        listener: mock.listener,
        children,
      },
      children,
    );
  }

  return { handler, TestingContext };
}
