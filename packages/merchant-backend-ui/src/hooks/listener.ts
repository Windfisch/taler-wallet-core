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

/**
*
* @author Sebastian Javier Marchano (sebasjm)
*/

import { useState } from "preact/hooks";

/**
 * returns subscriber and activator
 * subscriber will receive a method (listener) that will be call when the activator runs.
 * the result of calling the listener will be sent to @action
 *
 * @param action from <T> to <R>
 * @returns activator and subscriber, undefined activator means that there is not subscriber
 */

export function useListener<T, R = any>(action: (r: T) => Promise<R>): [undefined | (() => Promise<R>), (listener?: () => T) => void] {
  type RunnerHandler = { toBeRan?: () => Promise<R>; };
  const [state, setState] = useState<RunnerHandler>({});

  /**
   * subscriber will receive a method that will be call when the activator runs
   *
   * @param listener function to be run when the activator runs
   */
  const subscriber = (listener?: () => T) => {
    if (listener) {
      setState({
        toBeRan: () => {
          const whatWeGetFromTheListener = listener();
          return action(whatWeGetFromTheListener);
        }
      });
    } else {
      setState({
        toBeRan: undefined
      })
    }
  };

  /**
   * activator will call runner if there is someone subscribed
   */
  const activator = state.toBeRan ? async () => {
    if (state.toBeRan) {
      return state.toBeRan();
    }
    return Promise.reject();
  } : undefined;

  return [activator, subscriber];
}
