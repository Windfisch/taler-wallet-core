/*
 This file is part of TALER
 (C) 2016 INRIA

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
 * Helpers functions to render Taler-related data structures to HTML.
 *
 * @author Florian Dold
 */


/**
 * Imports.
 */
import {
  AmountJson,
  Amounts,
  DenominationRecord,
  ReserveCreationInfo,
} from "../types";

import * as moment from "moment";

import * as i18n from "../i18n";

import * as React from "react";


/**
 * Render amount as HTML, which non-breaking space between
 * decimal value and currency.
 */
export function renderAmount(amount: AmountJson) {
  const x = amount.value + amount.fraction / Amounts.fractionalBase;
  return <span>{x}&nbsp;{amount.currency}</span>;
}

export const AmountDisplay = ({amount}: {amount: AmountJson}) => renderAmount(amount);


/**
 * Abbreviate a string to a given length, and show the full
 * string on hover as a tooltip.
 */
export function abbrev(s: string, n: number = 5) {
  let sAbbrev = s;
  if (s.length > n) {
    sAbbrev = s.slice(0, n) + "..";
  }
  return (
    <span className="abbrev" title={s}>
      {sAbbrev}
    </span>
  );
}


interface CollapsibleState {
  collapsed: boolean;
}


interface CollapsibleProps {
  initiallyCollapsed: boolean;
  title: string;
}


/**
 * Component that shows/hides its children when clicking
 * a heading.
 */
export class Collapsible extends React.Component<CollapsibleProps, CollapsibleState> {
  constructor(props: CollapsibleProps) {
    super(props);
    this.state = { collapsed: props.initiallyCollapsed };
  }
  render() {
    const doOpen = (e: any) => {
      this.setState({collapsed: false});
      e.preventDefault();
    };
    const doClose = (e: any) => {
      this.setState({collapsed: true});
      e.preventDefault();
    };
    if (this.state.collapsed) {
      return <h2><a className="opener opener-collapsed" href="#" onClick={doOpen}>{this.props.title}</a></h2>;
    }
    return (
      <div>
        <h2><a className="opener opener-open" href="#" onClick={doClose}>{this.props.title}</a></h2>
        {this.props.children}
      </div>
    );
  }
}


function AuditorDetailsView(props: {rci: ReserveCreationInfo|null}): JSX.Element {
  const rci = props.rci;
  console.log("rci", rci);
  if (!rci) {
    return (
      <p>
        Details will be displayed when a valid exchange provider URL is entered.
      </p>
    );
  }
  if (rci.exchangeInfo.auditors.length === 0) {
    return (
      <p>
        The exchange is not audited by any auditors.
      </p>
    );
  }
  return (
    <div>
      {rci.exchangeInfo.auditors.map((a) => (
        <div>
          <h3>Auditor {a.auditor_url}</h3>
          <p>Public key: {a.auditor_pub}</p>
          <p>Trusted: {rci.trustedAuditorPubs.indexOf(a.auditor_pub) >= 0 ? "yes" : "no"}</p>
          <p>Audits {a.denomination_keys.length} of {rci.numOfferedDenoms} denominations</p>
        </div>
      ))}
    </div>
  );
}

function FeeDetailsView(props: {rci: ReserveCreationInfo|null}): JSX.Element {
  const rci = props.rci;
  if (!rci) {
    return (
      <p>
        Details will be displayed when a valid exchange provider URL is entered.
      </p>
    );
  }

  const denoms = rci.selectedDenoms;

  const countByPub: {[s: string]: number} = {};
  const uniq: DenominationRecord[] = [];

  denoms.forEach((x: DenominationRecord) => {
    let c = countByPub[x.denomPub] || 0;
    if (c === 0) {
      uniq.push(x);
    }
    c += 1;
    countByPub[x.denomPub] = c;
  });

  function row(denom: DenominationRecord) {
    return (
      <tr>
        <td>{countByPub[denom.denomPub] + "x"}</td>
        <td>{renderAmount(denom.value)}</td>
        <td>{renderAmount(denom.feeWithdraw)}</td>
        <td>{renderAmount(denom.feeRefresh)}</td>
        <td>{renderAmount(denom.feeDeposit)}</td>
      </tr>
    );
  }

  function wireFee(s: string) {
    return [
      <thead>
        <tr>
        <th colSpan={3}>Wire Method {s}</th>
        </tr>
        <tr>
        <th>Applies Until</th>
        <th>Wire Fee</th>
        <th>Closing Fee</th>
        </tr>
      </thead>,
      <tbody>
      {rci!.wireFees.feesForType[s].map((f) => (
        <tr>
          <td>{moment.unix(f.endStamp).format("llll")}</td>
          <td>{renderAmount(f.wireFee)}</td>
          <td>{renderAmount(f.closingFee)}</td>
        </tr>
      ))}
      </tbody>,
    ];
  }

  const withdrawFee = renderAmount(rci.withdrawFee);
  const overhead = renderAmount(rci.overhead);

  return (
    <div>
      <h3>Overview</h3>
      <p>{i18n.str`Withdrawal fees:`} {withdrawFee}</p>
      <p>{i18n.str`Rounding loss:`} {overhead}</p>
      <p>{i18n.str`Earliest expiration (for deposit): ${moment.unix(rci.earliestDepositExpiration).fromNow()}`}</p>
      <h3>Coin Fees</h3>
      <table className="pure-table">
        <thead>
        <tr>
          <th>{i18n.str`# Coins`}</th>
          <th>{i18n.str`Value`}</th>
          <th>{i18n.str`Withdraw Fee`}</th>
          <th>{i18n.str`Refresh Fee`}</th>
          <th>{i18n.str`Deposit Fee`}</th>
        </tr>
        </thead>
        <tbody>
        {uniq.map(row)}
        </tbody>
      </table>
      <h3>Wire Fees</h3>
      <table className="pure-table">
      {Object.keys(rci.wireFees.feesForType).map(wireFee)}
      </table>
    </div>
  );
}


export function WithdrawDetailView(props: {rci: ReserveCreationInfo | null}): JSX.Element {
  const rci = props.rci;
  return (
    <div>
      <Collapsible initiallyCollapsed={true} title="Fee and Spending Details">
        <FeeDetailsView rci={rci} />
      </Collapsible>
      <Collapsible initiallyCollapsed={true} title="Auditor Details">
        <AuditorDetailsView rci={rci} />
      </Collapsible>
    </div>
  );
}
