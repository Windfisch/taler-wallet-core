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
 * Show wallet logs.
 *
 * @author Florian Dold
 */

import {LogEntry, getLogs} from "../../logging";

import * as React from "react";
import * as ReactDOM from "react-dom";

interface LogViewProps {
  log: LogEntry;
}

class LogView extends React.Component<LogViewProps, void> {
  render(): JSX.Element {
    let e = this.props.log;
    return (
      <div className="tree-item">
        <ul>
          <li>level: {e.level}</li>
          <li>msg: {e.msg}</li>
          <li>id: {e.id || "unknown"}</li>
          <li>file: {e.source || "(unknown)"}</li>
          <li>line: {e.line || "(unknown)"}</li>
          <li>col: {e.col || "(unknown)"}</li>
          {(e.detail ? <li> detail: <pre>{e.detail}</pre></li> : [])}
        </ul>
      </div>
    );
  }
}

interface LogsState {
  logs: LogEntry[]|undefined;
}

class Logs extends React.Component<any, LogsState> {
  constructor() {
    super();
    this.update();
    this.state = {} as any;
  }

  async update() {
    let logs = await getLogs();
    this.setState({logs});
  }

  render(): JSX.Element {
    let logs = this.state.logs;
    if (!logs) {
      return <span>...</span>;
    }
    return (
      <div className="tree-item">
        Logs:
        {logs.map(e => <LogView log={e} />)}
      </div>
    );
  }
}

document.addEventListener("DOMContentLoaded", () => {
  ReactDOM.render(<Logs />, document.getElementById("container")!);
});
