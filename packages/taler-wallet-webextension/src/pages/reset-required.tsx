/*
 This file is part of TALER
 (C) 2017 GNUnet e.V.

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
 * Page to inform the user when a database reset is required.
 *
 * @author Florian Dold
 */

import * as React from "react";

import * as wxApi from "../wxApi";

interface State {
  /**
   * Did the user check the confirmation check box?
   */
  checked: boolean;

  /**
   * Do we actually need to reset the db?
   */
  resetRequired: boolean;
}

class ResetNotification extends React.Component<any, State> {
  constructor(props: any) {
    super(props);
    this.state = { checked: false, resetRequired: true };
    setInterval(() => this.update(), 500);
  }
  async update(): Promise<void> {
    const res = await wxApi.checkUpgrade();
    this.setState({ resetRequired: res.dbResetRequired });
  }
  render(): JSX.Element {
    if (this.state.resetRequired) {
      return (
        <div>
          <h1>Manual Reset Reqired</h1>
          <p>
            The wallet&apos;s database in your browser is incompatible with the{" "}
            currently installed wallet. Please reset manually.
          </p>
          <p>
            Once the database format has stabilized, we will provide automatic
            upgrades.
          </p>
          <input
            id="check"
            type="checkbox"
            checked={this.state.checked}
            onChange={(e) => this.setState({ checked: e.target.checked })}
          />{" "}
          <label htmlFor="check">
            I understand that I will lose all my data
          </label>
          <br />
          <button
            className="pure-button"
            disabled={!this.state.checked}
            onClick={() => wxApi.resetDb()}
          >
            Reset
          </button>
        </div>
      );
    }
    return (
      <div>
        <h1>Everything is fine!</h1>A reset is not required anymore, you can
        close this page.
      </div>
    );
  }
}

export function createResetRequiredPage(): JSX.Element {
  return <ResetNotification />;
}
