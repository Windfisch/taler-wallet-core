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

import { createElement, VNode } from "preact";

function getJsonIfOk(r: Response): Promise<any> {
  if (r.ok) {
    return r.json();
  }

  if (r.status >= 400 && r.status < 500) {
    throw new Error(`URL may not be right: (${r.status}) ${r.statusText}`);
  }

  throw new Error(
    `Try another server: (${r.status}) ${
      r.statusText || "internal server error"
    }`,
  );
}

export async function queryToSlashConfig<T>(url: string): Promise<T> {
  return fetch(new URL("config", url).href)
    .catch(() => {
      throw new Error(`Network error`);
    })
    .then(getJsonIfOk);
}

function timeout<T>(ms: number, promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `Timeout: the query took longer than ${Math.floor(ms / 1000)} secs`,
        ),
      );
    }, ms);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((reason) => {
        clearTimeout(timer);
        reject(reason);
      });
  });
}

export async function queryToSlashKeys<T>(url: string): Promise<T> {
  const endpoint = new URL("keys", url);

  const query = fetch(endpoint.href)
    .catch(() => {
      throw new Error(`Network error`);
    })
    .then(getJsonIfOk);

  return timeout(3000, query);
}

export type StateFunc<S> = (p: S) => VNode;

export type StateViewMap<StateType extends { status: string }> = {
  [S in StateType as S["status"]]: StateFunc<S>;
};

export type RecursiveState<S extends object> = S | (() => RecursiveState<S>);

export function compose<SType extends { status: string }, PType>(
  name: string,
  hook: (p: PType) => RecursiveState<SType>,
  viewMap: StateViewMap<SType>,
): (p: PType) => VNode {
  function withHook(stateHook: () => RecursiveState<SType>): () => VNode {
    function TheComponent(): VNode {
      const state = stateHook();

      if (typeof state === "function") {
        const subComponent = withHook(state);
        return createElement(subComponent, {});
      }

      const statusName = state.status as unknown as SType["status"];
      const viewComponent = viewMap[statusName] as unknown as StateFunc<SType>;
      return createElement(viewComponent, state);
    }
    // TheComponent.name = `${name}`;

    return TheComponent;
  }

  return (p: PType) => {
    const h = withHook(() => hook(p));
    return h();
  };
}

export function assertUnreachable(x: never): never {
  throw new Error("Didn't expect to get here");
}
