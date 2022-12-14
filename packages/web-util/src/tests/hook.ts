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

import {
  ComponentChildren,
  Fragment,
  FunctionalComponent,
  h as create,
  options,
  render as renderIntoDom,
  VNode
} from "preact";

// This library is expected to be included in testing environment only
// When doing tests we want the requestAnimationFrame to be as fast as possible.
// without this option the RAF will timeout after 100ms making the tests slower
options.requestAnimationFrame = (fn: () => void) => {
  return fn();
};

export function createExample<Props>(
  Component: FunctionalComponent<Props>,
  props: Partial<Props> | (() => Partial<Props>),
): ComponentChildren {
  const evaluatedProps = typeof props === "function" ? props() : props;
  const Render = (args: any): VNode => create(Component, args);

  return {
    component: Render,
    props: evaluatedProps,
  };
}

// export function createExampleWithCustomContext<Props, ContextProps>(
//   Component: FunctionalComponent<Props>,
//   props: Partial<Props> | (() => Partial<Props>),
//   ContextProvider: FunctionalComponent<ContextProps>,
//   contextProps: Partial<ContextProps>,
// ): ComponentChildren {
//   /**
//    * FIXME:
//    * This may not be useful since the example can be created with context
//    * already
//    */
//   const evaluatedProps = typeof props === "function" ? props() : props;
//   const Render = (args: any): VNode => create(Component, args);
//   const WithContext = (args: any): VNode =>
//     create(ContextProvider, {
//       ...contextProps,
//       children: [Render(args)],
//     } as any);

//   return {
//     component: WithContext,
//     props: evaluatedProps,
//   };
// }

const isNode = typeof window === "undefined";

/**
 * To be used on automated unit test.
 * So test will run under node or browser
 * @param Component
 * @param args
 */
export function renderNodeOrBrowser(
  Component: any,
  args: any,
  Context: any,
): void {
  const vdom = !Context
    ? create(Component, args)
    : create(Context, { children: [create(Component, args)] });

  const customElement = {} as Element;
  const parentElement = isNode ? customElement : document.createElement("div");
  if (!isNode) {
    document.body.appendChild(parentElement);
  }

  // renderIntoDom works also in nodejs
  // if the VirtualDOM is composed only by functional components
  // then no called is going to be made to the DOM api.
  // vdom should not have any 'div' or other html component
  renderIntoDom(vdom, parentElement);

  if (!isNode) {
    document.body.removeChild(parentElement);
  }
}
type RecursiveState<S> = S | (() => RecursiveState<S>);

interface Mounted<T> {
  // unmount: () => void;
  pullLastResultOrThrow: () => Exclude<T, VoidFunction>;
  assertNoPendingUpdate: () => Promise<boolean>;
  // waitNextUpdate: (s?: string) => Promise<void>;
  waitForStateUpdate: () => Promise<boolean>;
}

/**
 * Manual API mount the hook and return testing API
 * Consider using hookBehaveLikeThis() function
 * 
 * @param hookToBeTested
 * @param Context
 * 
 * @returns testing API
 */
export function mountHook<T extends object>(
  hookToBeTested: () => RecursiveState<T>,
  Context?: ({ children }: { children: any }) => VNode | null,
): Mounted<T> {
  let lastResult: Exclude<T, VoidFunction> | Error | null = null;

  const listener: Array<() => void> = [];

  // component that's going to hold the hook
  function Component(): VNode {
    try {
      let componentOrResult = hookToBeTested();
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

  renderNodeOrBrowser(Component, {}, Context);

  function pullLastResult(): Exclude<T | Error | null, VoidFunction> {
    const copy: Exclude<T | Error | null, VoidFunction> = lastResult;
    lastResult = null;
    return copy;
  }

  function pullLastResultOrThrow(): Exclude<T, VoidFunction> {
    const r = pullLastResult();
    if (r instanceof Error) throw r;
    //sanity check
    if (!r) throw Error("there was no last result");
    return r;
  }

  async function assertNoPendingUpdate(): Promise<boolean> {
    await new Promise((res, rej) => {
      const tid = setTimeout(() => {
        res(true);
      }, 10);

      listener.push(() => {
        clearTimeout(tid);
        res(false);
        //   Error(`Expecting no pending result but the hook got updated.
        //  If the update was not intended you need to check the hook dependencies
        //  (or dependencies of the internal state) but otherwise make
        //  sure to consume the result before ending the test.`),
        // );
      });
    });

    const r = pullLastResult();
    if (r) {
      return Promise.resolve(false);
    }
    return Promise.resolve(true);
    // throw Error(`There are still pending results.
    //  This may happen because the hook did a new update but the test didn't consume the result using pullLastResult`);
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
    // unmount,
    pullLastResultOrThrow,
    waitForStateUpdate,
    assertNoPendingUpdate,
  };
}

export const nullFunction = (): void => {
  null;
};
export const nullAsyncFunction = (): Promise<void> => {
  return Promise.resolve();
};

type HookTestResult = HookTestResultOk | HookTestResultError;

interface HookTestResultOk {
  result: "ok";
}
interface HookTestResultError {
  result: "fail";
  error: string;
  index: number;
}

/**
 * Main testing driver.
 * It will assert that there are no more and no less hook updates than expected. 
 * 
 * @param hookFunction hook function to be tested
 * @param props initial props for the hook
 * @param checks step by step state validation
 * @param Context additional testing context for overrides
 * 
 * @returns testing result, should also be checked to be "ok"
 */
export async function hookBehaveLikeThis<T extends object, PropsType>(
  hookFunction: (p: PropsType) => RecursiveState<T>,
  props: PropsType,
  checks: Array<(state: T) => void>,
  Context?: ({ children }: { children: any }) => VNode | null,
): Promise<HookTestResult> {
  const { pullLastResultOrThrow, waitForStateUpdate, assertNoPendingUpdate } =
    mountHook<T>(() => hookFunction(props), Context);

  const [firstCheck, ...resultOfTheChecks] = checks;
  {
    const state = pullLastResultOrThrow();
    const checkError = firstCheck(state);
    if (checkError !== undefined) {
      return {
        result: "fail",
        index: 0,
        error: `Check return not undefined error: ${checkError}`,
      };
    }
  }

  let index = 1;
  for (const check of resultOfTheChecks) {
    const hasNext = await waitForStateUpdate();
    if (!hasNext) {
      return {
        result: "fail",
        error: "Component didn't update and the test expected one more state",
        index,
      };
    }
    const state = pullLastResultOrThrow();
    const checkError = check(state);
    if (checkError !== undefined) {
      return {
        result: "fail",
        index,
        error: `Check return not undefined error: ${checkError}`,
      };
    }
    index++;
  }

  const hasNext = await waitForStateUpdate();
  if (hasNext) {
    return {
      result: "fail",
      index,
      error: "Component updated and test didn't expect more states",
    };
  }
  const noMoreUpdates = await assertNoPendingUpdate();
  if (noMoreUpdates === false) {
    return {
      result: "fail",
      index,
      error: "Component was updated but the test does not cover the update",
    };
  }

  return {
    result: "ok",
  };
}
