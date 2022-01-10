/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { PendingTestFunction, TestFunction } from "mocha";
import { ComponentChildren, Fragment, FunctionalComponent, h as create, render as renderIntoDom, VNode } from "preact";
import { render as renderToString } from "preact-render-to-string";

export function createExample<Props>(
  Component: FunctionalComponent<Props>,
  props: Partial<Props>,
): ComponentChildren {
  const Render = (args: any): VNode => create(Component, args);
  Render.args = props;
  return Render;
}

export function createExampleWithCustomContext<Props, ContextProps>(
  Component: FunctionalComponent<Props>,
  props: Partial<Props>,
  ContextProvider: FunctionalComponent<ContextProps>,
  contextProps: Partial<ContextProps>,
): ComponentChildren {
  const Render = (args: any): VNode => create(Component, args);
  const WithContext = (args: any): VNode => create(ContextProvider, { ...contextProps, children: [Render(args)] } as any);
  WithContext.args = props
  return WithContext
}

export function NullLink({ children }: { children?: ComponentChildren }): VNode {
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

interface Mounted<T> {
  unmount: () => void;
  result: { current: T | null };
  waitNextUpdate: () => Promise<void>;
}

export function mountBrowser<T>(callback: () => T, Context?: ({ children }: { children: any }) => VNode): Mounted<T> {
  const result: { current: T | null } = {
    current: null
  }
  const listener: Array<() => void> = []

  // component that's going to hold the hook
  function Component(): VNode {
    const hookResult = callback()
    // save the hook result
    result.current = hookResult
    // notify to everyone waiting for an update and clean the queue
    listener.splice(0, listener.length).forEach(cb => cb())
    return create(Fragment, {})
  }

  // create the vdom with context if required
  const vdom = !Context ? create(Component, {}) : create(Context, { children: [create(Component, {})] },);

  // in non-browser environment (server side rendering) just serialize to 
  // string and exit
  if (typeof window === "undefined") {
    renderToString(vdom);
    return { unmount: () => null, result } as any
  }

  // do the render into the DOM
  const div = document.createElement("div");
  document.body.appendChild(div);
  renderIntoDom(vdom, div);

  // clean up callback
  function unmount(): any {
    document.body.removeChild(div);
  }

  // waiter callback
  async function waitNextUpdate(): Promise<void> {
    await new Promise((res, rej) => {
      const tid = setTimeout(() => {
        rej(Error("waiting for an update but the hook didn't make one"))
      }, 100)

      listener.push(() => {
        clearTimeout(tid)
        res(undefined)
      })
    })
  }

  return {
    unmount, result, waitNextUpdate
  }
}

const nullTestFunction = {} as TestFunction
export const justBrowser_it: PendingTestFunction | TestFunction =
  typeof it === 'undefined' ? nullTestFunction : (typeof window === 'undefined' ? it.skip : it)