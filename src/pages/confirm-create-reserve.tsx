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

import {amountToPretty, canonicalizeBaseUrl} from "src/helpers";
import {
  AmountJson, CreateReserveResponse,
  ReserveCreationInfo, Amounts,
  Denomination, DenominationRecord,
} from "src/types";
import {getReserveCreationInfo} from "src/wxApi";
import {ImplicitStateComponent, StateHolder} from "src/components";

"use strict";


function delay<T>(delayMs: number, value: T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    setTimeout(() => resolve(value), delayMs);
  });
}

class EventTrigger {
  triggerResolve: any;
  triggerPromise: Promise<boolean>;

  constructor() {
    this.reset();
  }

  private reset() {
    this.triggerPromise = new Promise<boolean>((resolve, reject) => {
      this.triggerResolve = resolve;
    });
  }

  trigger() {
    this.triggerResolve(false);
    this.reset();
  }

  async wait(delayMs: number): Promise<boolean> {
    return await Promise.race([this.triggerPromise, delay(delayMs, true)]);
  }
}


function renderReserveCreationDetails(rci: ReserveCreationInfo|null) {
  if (!rci) {
    return <p>
      Details will be displayed when a valid exchange provider URL is entered.</p>
  }

  let denoms = rci.selectedDenoms;

  let countByPub: {[s: string]: number} = {};
  let uniq: DenominationRecord[] = [];

  denoms.forEach((x: DenominationRecord) => {
    let c = countByPub[x.denomPub] || 0;
    if (c == 0) {
      uniq.push(x);
    }
    c += 1;
    countByPub[x.denomPub] = c;
  });

  function row(denom: DenominationRecord) {
    return (
      <tr>
        <td>{countByPub[denom.denomPub] + "x"}</td>
        <td>{amountToPretty(denom.value)}</td>
        <td>{amountToPretty(denom.feeWithdraw)}</td>
        <td>{amountToPretty(denom.feeRefresh)}</td>
        <td>{amountToPretty(denom.feeDeposit)}</td>
      </tr>
    );
  }

  let withdrawFeeStr = amountToPretty(rci.withdrawFee);
  let overheadStr = amountToPretty(rci.overhead);

  return (
    <div>
      <p>{i18n`Withdrawal fees: ${withdrawFeeStr}`}</p>
      <p>{i18n`Rounding loss: ${overheadStr}`}</p>
      <table>
        <thead>
        <th>{i18n`# Coins`}</th>
        <th>{i18n`Value`}</th>
        <th>{i18n`Withdraw Fee`}</th>
        <th>{i18n`Refresh Fee`}</th>
        <th>{i18n`Deposit Fee`}</th>
        </thead>
        <tbody>
        {uniq.map(row)}
        </tbody>
      </table>
    </div>
  );
}


function getSuggestedExchange(currency: string): Promise<string> {
  // TODO: make this request go to the wallet backend
  // Right now, this is a stub.
  const defaultExchange: {[s: string]: string} = {
    "KUDOS": "https://exchange.demo.taler.net",
    "PUDOS": "https://exchange.test.taler.net",
  };

  let exchange = defaultExchange[currency];

  if (!exchange) {
    exchange = ""
  }

  return Promise.resolve(exchange);
}


function WithdrawFee(props: {reserveCreationInfo: ReserveCreationInfo|null}): JSX.Element {
  if (props.reserveCreationInfo) {
    let {overhead, withdrawFee} = props.reserveCreationInfo;
    let totalCost = Amounts.add(overhead, withdrawFee).amount;
    return <p>{i18n`Withdraw fees:`} {amountToPretty(totalCost)}</p>;
  }
  return <p />;
}


interface ExchangeSelectionProps {
  suggestedExchangeUrl: string;
  amount: AmountJson;
  callback_url: string;
  wt_types: string[];
}


class ExchangeSelection extends ImplicitStateComponent<ExchangeSelectionProps> {
  statusString: StateHolder<string|null> = this.makeState(null);
  reserveCreationInfo: StateHolder<ReserveCreationInfo|null> = this.makeState(
    null);
  url: StateHolder<string|null> = this.makeState(null);
  detailCollapsed: StateHolder<boolean> = this.makeState(true);

  updateEvent = new EventTrigger();

  constructor(props: ExchangeSelectionProps) {
    super(props);
    this.onUrlChanged(props.suggestedExchangeUrl || null);
  }


  renderAdvanced(): JSX.Element {
    if (this.detailCollapsed() && this.url() !== null && !this.statusString()) {
      return (
        <button className="linky"
                onClick={() => this.detailCollapsed(false)}>
          {i18n`view fee structure / select different exchange provider`}
        </button>
      );
    }
    return (
      <div>
        <h2>Provider Selection</h2>
        <label>URL: </label>
        <input className="url" type="text" spellCheck={false}
               value={this.url()!}
               key="exchange-url-input"
               onInput={(e) => this.onUrlChanged((e.target as HTMLInputElement).value)}/>
        <br />
        {this.renderStatus()}
        <h2>{i18n`Detailed Fee Structure`}</h2>
        {renderReserveCreationDetails(this.reserveCreationInfo())}
      </div>)
  }

  renderFee() {
    if (!this.reserveCreationInfo()) {
      return "??";
    }
    let rci = this.reserveCreationInfo()!;
    let totalCost = Amounts.add(rci.overhead, rci.withdrawFee).amount;
    return `${amountToPretty(totalCost)}`;
  }

  renderFeeStatus() {
    if (this.reserveCreationInfo()) {
      return (
        <i18n.Translate wrap="p">
          The exchange provider will charge
          {" "}
          <span>{this.renderFee()}</span>
          {" "}
          in fees.
        </i18n.Translate>
      );
    }
    if (this.url() && !this.statusString()) {
      let shortName = URI(this.url()!).host();
      return (
        <i18n.Translate wrap="p">
          Waiting for a response from
          {" "}
          <em>{shortName}</em>
        </i18n.Translate>
      );
    }
    if (this.statusString()) {
      return (
        <p>
          <strong style={{color: "red"}}>{i18n`A problem occured, see below.`}</strong>
        </p>
      );
    }
    return (
      <p>
        {i18n`Information about fees will be available when an exchange provider is selected.`}
      </p>
    );
  }

  render(): JSX.Element {
    return (
      <div>
        <i18n.Translate wrap="p">
          {"You are about to withdraw "}
          <strong>{amountToPretty(this.props.amount)}</strong>
          {" from your bank account into your wallet."}
        </i18n.Translate>
        {this.renderFeeStatus()}
        <button className="accept"
                disabled={this.reserveCreationInfo() == null}
                onClick={() => this.confirmReserve()}>
          {i18n`Accept fees and withdraw`}
        </button>
        <br/>
        {this.renderAdvanced()}
      </div>
    );
  }


  confirmReserve() {
    this.confirmReserveImpl(this.reserveCreationInfo()!,
                            this.url()!,
                            this.props.amount,
                            this.props.callback_url);
  }

  /**
   * Do an update of the reserve creation info, without any debouncing.
   */
  async forceReserveUpdate() {
    this.reserveCreationInfo(null);
    if (!this.url()) {
      this.statusString(i18n`Error: URL is empty`);
      this.detailCollapsed(false);
      return;
    }

    this.statusString(null);
    let parsedUrl = URI(this.url()!);
    if (parsedUrl.is("relative")) {
      this.statusString(i18n`Error: URL may not be relative`);
      this.detailCollapsed(false);
      return;
    }

    try {
      let url = canonicalizeBaseUrl(this.url()!);
      let r = await getReserveCreationInfo(url,
                                           this.props.amount);
      console.log("get exchange info resolved");
      this.reserveCreationInfo(r);
      console.dir(r);
    } catch (e) {
      console.log("get exchange info rejected");
      if (e.hasOwnProperty("httpStatus")) {
        this.statusString(`Error: request failed with status ${e.httpStatus}`);
        this.detailCollapsed(false);
      } else if (e.hasOwnProperty("errorResponse")) {
        let resp = e.errorResponse;
        this.statusString(`Error: ${resp.error} (${resp.hint})`);
        this.detailCollapsed(false);
      }
    }
  }

  reset() {
    this.statusString(null);
    this.reserveCreationInfo(null);
  }

  confirmReserveImpl(rci: ReserveCreationInfo,
                     exchange: string,
                     amount: AmountJson,
                     callback_url: string) {
    const d = {exchange: canonicalizeBaseUrl(exchange), amount};
    const cb = (rawResp: any) => {
      if (!rawResp) {
        throw Error("empty response");
      }
      // FIXME: filter out types that bank/exchange don't have in common
      let wire_details = rci.wireInfo;
      if (!rawResp.error) {
        const resp = CreateReserveResponse.checked(rawResp);
        let q: {[name: string]: string|number} = {
          wire_details: JSON.stringify(wire_details),
          exchange: resp.exchange,
          reserve_pub: resp.reservePub,
          amount_value: amount.value,
          amount_fraction: amount.fraction,
          amount_currency: amount.currency,
        };
        let url = URI(callback_url).addQuery(q);
        if (!url.is("absolute")) {
          throw Error("callback url is not absolute");
        }
        console.log("going to", url.href());
        document.location.href = url.href();
      } else {
        this.reset();
        this.statusString(
          i18n`Oops, something went wrong. The wallet responded with error status (${rawResp.error}).`);
        this.detailCollapsed(false);
      }
    };
    chrome.runtime.sendMessage({type: 'create-reserve', detail: d}, cb);
  }

  async onUrlChanged(url: string|null) {
    this.reset();
    this.url(url);
    if (url == undefined) {
      return;
    }
    this.updateEvent.trigger();
    let waited = await this.updateEvent.wait(200);
    if (waited) {
      // Run the actual update if nobody else preempted us.
      this.forceReserveUpdate();
      this.forceUpdate();
    }
  }

  renderStatus(): any {
    if (this.statusString()) {
      return <p><strong style={{color: "red"}}>{this.statusString()}</strong></p>;
    } else if (!this.reserveCreationInfo()) {
      return <p>{i18n`Checking URL, please wait ...`}</p>;
    }
    return "";
  }
}

export async function main() {
  try {
    const url = URI(document.location.href);
    const query: any = URI.parseQuery(url.query());
    let amount;
    try {
      amount = AmountJson.checked(JSON.parse(query.amount));
    } catch (e) {
      throw Error(i18n`Can't parse amount: ${e.message}`);
    }
    const callback_url = query.callback_url;
    const bank_url = query.bank_url;
    let wt_types;
    try {
      wt_types = JSON.parse(query.wt_types);
    } catch (e) {
      throw Error(i18n`Can't parse wire_types: ${e.message}`);
    }

    const suggestedExchangeUrl = await getSuggestedExchange(amount.currency);
    let args = {
      wt_types,
      suggestedExchangeUrl,
      callback_url,
      amount
    };

    ReactDOM.render(<ExchangeSelection {...args} />, document.getElementById(
      "exchange-selection")!);

  } catch (e) {
    // TODO: provide more context information, maybe factor it out into a
    // TODO:generic error reporting function or component.
    document.body.innerText = i18n`Fatal error: "${e.message}".`;
    console.error(`got error "${e.message}"`, e);
  }
}
