/*
 This file is part of GNU Taler
 (C) 2021-2023 Taler Systems S.A.

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
 * This component is used when a component wants one child to have a trigger for
 * an action (a button) and other child have the action implemented (like
 * gathering information with a form). The difference with other approaches is
 * that in this case the parent component is not holding the state.
 * 
 * It will return a subscriber and activator. 
 * 
 * The activator may be undefined, if it is undefined it is indicating that the
 * subscriber is not ready to be called.
 *
 * The subscriber will receive a function (the listener) that will be call when the
 * activator runs. The listener must return the collected information.
 * 
 * As a result, when the activator is triggered by a child component, the
 * @action function is called receives the information from the listener defined by other
 * child component 
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
