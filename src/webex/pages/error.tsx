/*
 This file is part of TALER
 (C) 2015-2016 GNUnet e.V.

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
 * Page shown to the user to confirm creation
 * of a reserve, usually requested by the bank.
 *
 * @author Florian Dold
 */

import {ImplicitStateComponent, StateHolder} from "../components";

import * as React from "react";
import * as ReactDOM from "react-dom";
import URI = require("urijs");

interface ErrorProps {
  message: string;
}

class ErrorView extends React.Component<ErrorProps, void> {
  render(): JSX.Element {
    return (
      <div>
        An error occurred: {this.props.message}
      </div>
    );
  }
}

async function main() {
  try {
    const url = new URI(document.location.href);
    const query: any = URI.parseQuery(url.query());

    const message: string = query.message || "unknown error";

    ReactDOM.render(<ErrorView message={message} />, document.getElementById(
      "container")!);

  } catch (e) {
    // TODO: provide more context information, maybe factor it out into a
    // TODO:generic error reporting function or component.
    document.body.innerText = `Fatal error: "${e.message}".`;
    console.error(`got error "${e.message}"`, e);
  }
}
