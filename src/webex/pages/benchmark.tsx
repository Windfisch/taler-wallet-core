/*
 This file is part of TALER
 (C) 2015 GNUnet e.V.

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
 * Benchmarks for the wallet.
 *
 * @author Florian Dold
 */

import * as i18n from "../i18n";

import { BenchmarkResult } from "../../types/walletTypes";

import * as wxApi from "../wxApi";

import * as React from "react";

interface BenchmarkRunnerState {
  repetitions: number;
  result?: BenchmarkResult;
  running: boolean;
}

function BenchmarkDisplay(props: BenchmarkRunnerState) {
  const result = props.result;
  if (!result) {
    if (props.running) {
      return <div>Waiting for results ...</div>;
    } else {
      return <div></div>;
    }
  }
  return (
    <>
      <h2>Results for {result.repetitions} repetitions</h2>
      <table className="pure-table">
        <thead>
          <tr>
            <th>{i18n.str`Operation`}</th>
            <th>{i18n.str`time (ms/op)`}</th>
          </tr>
          {Object.keys(result.time)
            .sort()
            .map((k) => (
              <tr>
                <td>{k}</td>
                <td>{result.time[k] / result.repetitions}</td>
              </tr>
            ))}
        </thead>
      </table>
    </>
  );
}

class BenchmarkRunner extends React.Component<any, BenchmarkRunnerState> {
  constructor(props: any) {
    super(props);
    this.state = {
      repetitions: 10,
      running: false,
    };
  }

  async run() {
    this.setState({ result: undefined, running: true });
    let result = await wxApi.benchmarkCrypto(this.state.repetitions);
    this.setState({ result, running: false });
  }

  render() {
    return (
      <div>
        <label>Repetitions:</label>
        <input
          type="number"
          value={this.state.repetitions}
          onChange={(evt) =>
            this.setState({ repetitions: Number.parseInt(evt.target.value) })
          }
        />{" "}
        <button onClick={() => this.run()}>Run</button>
        <BenchmarkDisplay {...this.state} />
      </div>
    );
  }
}

export function makeBenchmarkPage() {
  return <BenchmarkRunner />;
}
