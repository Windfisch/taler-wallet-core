/*
 This file is part of GNU Anastasis
 (C) 2021-2022 Anastasis SARL

 GNU Anastasis is free software; you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Anastasis is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with
 GNU Anastasis; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
import { h, VNode } from "preact";
import { useAnastasisContext } from "../../context/anastasis.js";
import { AnastasisClientFrame } from "./index.js";

export function TruthsPayingScreen(): VNode {
  const reducer = useAnastasisContext();
  if (!reducer) {
    return <div>no reducer in context</div>;
  }
  if (reducer.currentReducerState?.reducer_type !== "backup") {
    return <div>invalid state</div>;
  }
  const payments = reducer.currentReducerState.payments ?? [];
  return (
    <AnastasisClientFrame hideNext={"FIXME"} title="Backup: Truths Paying">
      <p>
        Some of the providers require a payment to store the encrypted
        authentication information.
      </p>
      <ul>
        {payments.map((x, i) => {
          return <li key={i}>{x}</li>;
        })}
      </ul>
      <button onClick={() => reducer.transition("pay", {})}>
        Check payment status now
      </button>
    </AnastasisClientFrame>
  );
}
