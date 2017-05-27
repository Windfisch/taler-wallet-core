/*
 This file is part of TALER
 (C) 2016 Inria

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */


/**
 * General helper React components.
 *
 * @author Florian Dold
 */


/**
 * Imports.
 */
import * as React from "react";

export interface StateHolder<T> {
  (): T;
  (newState: T): void;
}

/**
 * Component that doesn't hold its state in one object,
 * but has multiple state holders.
 */
export abstract class ImplicitStateComponent<PropType> extends React.Component<PropType, any> {
  _implicit = {needsUpdate: false, didMount: false};
  componentDidMount() {
    this._implicit.didMount = true;
    if (this._implicit.needsUpdate) {
      this.setState({} as any);
    }
  }
  makeState<StateType>(initial: StateType): StateHolder<StateType> {
    let state: StateType = initial;
    return (s?: StateType): StateType => {
      if (s !== undefined) {
        state = s;
        if (this._implicit.didMount) {
          this.setState({} as any);
        } else {
          this._implicit.needsUpdate = true;
        }
      }
      return state;
    };
  }
}
