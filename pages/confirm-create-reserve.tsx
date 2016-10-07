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

import {amountToPretty, canonicalizeBaseUrl} from "../lib/wallet/helpers";
import {AmountJson, CreateReserveResponse} from "../lib/wallet/types";
import {ReserveCreationInfo, Amounts} from "../lib/wallet/types";
import {Denomination} from "../lib/wallet/types";
import {getReserveCreationInfo} from "../lib/wallet/wxApi";

"use strict";

let h = preact.h;

/**
 * Execute something after a delay, with the possibility
 * to reset the delay.
 */
class DelayTimer {
  ms: number;
  f: () => void;
  timerId: number|undefined = undefined;

  constructor(ms: number, f: () => void) {
    this.f = f;
    this.ms = ms;
  }

  bump() {
    this.stop();
    const handler = () => {
      this.f();
    };
    this.timerId = window.setTimeout(handler, this.ms);
  }

  stop() {
    if (this.timerId != undefined) {
      window.clearTimeout(this.timerId);
    }
  }
}

interface StateHolder<T> {
  (): T;
  (newState: T): void;
}

/**
 * Component that doesn't hold its state in one object,
 * but has multiple state holders.
 */
abstract class ImplicitStateComponent<PropType> extends preact.Component<PropType, void> {
  makeState<StateType>(initial: StateType): StateHolder<StateType> {
    let state: StateType = initial;
    return (s?: StateType): StateType => {
      if (s !== undefined) {
        state = s;
        // In preact, this will always schedule a (debounced) redraw
        this.setState({} as any);
      }
      return state;
    };
  }
}


function renderReserveCreationDetails(rci: ReserveCreationInfo) {
  let denoms = rci.selectedDenoms;

  let countByPub: {[s: string]: number} = {};
  let uniq: Denomination[] = [];

  denoms.forEach((x: Denomination) => {
    let c = countByPub[x.denom_pub] || 0;
    if (c == 0) {
      uniq.push(x);
    }
    c += 1;
    countByPub[x.denom_pub] = c;
  });

  function row(denom: Denomination) {
    return (
      <tr>
        <td>{countByPub[denom.denom_pub] + "x"}</td>
        <td>{amountToPretty(denom.value)}</td>
        <td>{amountToPretty(denom.fee_withdraw)}</td>
        <td>{amountToPretty(denom.fee_refresh)}</td>
        <td>{amountToPretty(denom.fee_deposit)}</td>
      </tr>
    );
  }

  let withdrawFeeStr = amountToPretty(rci.withdrawFee);
  let overheadStr = amountToPretty(rci.overhead);

  return (
    <div>
      <p>{`Withdrawal fees: ${withdrawFeeStr}`}</p>
      <p>{`Rounding loss: ${overheadStr}`}</p>
      <table>
        <thead>
        <th># Coins</th>
        <th>Value</th>
        <th>Withdraw Fee</th>
        <th>Refresh Fee</th>
        <th>Deposit fee</th>
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

interface ExchangeSelectionProps {
  suggestedExchangeUrl: string;
  amount: AmountJson;
  callback_url: string;
  wt_types: string[];
}


class ExchangeSelection extends ImplicitStateComponent<ExchangeSelectionProps> {
  complexViewRequested: StateHolder<boolean> = this.makeState(false);
  statusString: StateHolder<string|null> = this.makeState(null);
  reserveCreationInfo: StateHolder<ReserveCreationInfo|null> = this.makeState(
    null);
  url: StateHolder<string|null> = this.makeState(null);
  detailCollapsed: StateHolder<boolean> = this.makeState(true);

  private timer: DelayTimer;

  isValidExchange: boolean;

  constructor(props: ExchangeSelectionProps) {
    super(props);
    this.timer = new DelayTimer(800, () => this.update());
    this.url(props.suggestedExchangeUrl || null);
    this.update();
  }

  render(props: ExchangeSelectionProps): JSX.Element {

    console.log("props", props);

    let header = (
      <p>
        {"You are about to withdraw "}
        <strong>{amountToPretty(props.amount)}</strong>
        {" from your bank account into your wallet."}
      </p>
    );

    if (this.complexViewRequested() || !props.suggestedExchangeUrl) {
      return (
        <div>
          {header}
          {this.viewComplex()}
        </div>);
    }

    return (
      <div>
        {header}
        {this.viewSimple()}
      </div>);
  }


  viewSimple() {
    let advancedButton = (
      <button className="linky"
              onClick={() => this.complexViewRequested(true)}>
        advanced options
      </button>
    );
    if (this.statusString()) {
      return (
        <div>
          <p>Error: {this.statusString()}</p>
          {advancedButton}
        </div>
      );
    }
    else if (this.reserveCreationInfo() != undefined) {
      let {overhead, withdrawFee} = this.reserveCreationInfo()!;
      let totalCost = Amounts.add(overhead, withdrawFee).amount;
      return (
        <div>
          <p>{`Withdraw fees: ${amountToPretty(totalCost)}`}</p>
          <button className="accept"
                  onClick={() => this.confirmReserve()}>
            Accept fees and withdraw
          </button>
          <span className="spacer"/>
          {advancedButton}
        </div>
      );
    } else {
      return <p>Please wait...</p>
    }
  }


  confirmReserve() {
    this.confirmReserveImpl(this.reserveCreationInfo()!,
                            this.url()!,
                            this.props.amount,
                            this.props.callback_url);
  }


  update() {
    this.timer.stop();
    const doUpdate = () => {
      this.reserveCreationInfo(null);
      if (!this.url()) {
        this.statusString = i18n`Error: URL is empty`;
        m.redraw(true);
        return;
      }
      this.statusString(null);
      let parsedUrl = URI(this.url()!);
      if (parsedUrl.is("relative")) {
        this.statusString = i18n`Error: URL may not be relative`;
        this.forceUpdate();
        return;
      }

      this.forceUpdate();

      console.log("doing get exchange info");

      getReserveCreationInfo(this.url()!, this.props.amount)
        .then((r: ReserveCreationInfo) => {
          console.log("get exchange info resolved");
          this.isValidExchange = true;
          this.reserveCreationInfo(r);
          console.dir(r);
        })
        .catch((e) => {
          console.log("get exchange info rejected");
          if (e.hasOwnProperty("httpStatus")) {
            this.statusString(`Error: request failed with status ${e.httpStatus}`);
          } else if (e.hasOwnProperty("errorResponse")) {
            let resp = e.errorResponse;
            this.statusString(`Error: ${resp.error} (${resp.hint})`);
          }
        });
    };

    doUpdate();

    console.log("got update", this.url());
  }

  reset() {
    this.isValidExchange = false;
    this.statusString(null);
    this.reserveCreationInfo(null);
  }

  confirmReserveImpl(rci: ReserveCreationInfo,
                     exchange: string,
                     amount: AmountJson,
                     callback_url: string) {
    const d = {exchange, amount};
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
          `Oops, something went wrong.` +
          `The wallet responded with error status (${rawResp.error}).`);
      }
    };
    chrome.runtime.sendMessage({type: 'create-reserve', detail: d}, cb);
  }

  onUrlChanged(url: string) {
    this.reset();
    this.url(url);
    this.timer.bump();
  }

  viewComplex() {
    function *f(): IterableIterator<any> {
      if (this.reserveCreationInfo()) {
        let {overhead, withdrawFee} = this.reserveCreationInfo()!;
        let totalCost = Amounts.add(overhead, withdrawFee).amount;
        yield <p>Withdraw fees: {amountToPretty(totalCost)}</p>;
      }

      yield (
        <button className="accept" disabled={!this.isValidExchange}
                onClick={() => this.confirmReserve()}>
          Accept fees and withdraw
        </button>
      );

      yield <span className="spacer"/>;

      yield (
        <button className="linky"
                onClick={() => this.complexViewRequested(true)}/>
      );

      yield <br/>;

      yield (
        <input className="url" type="text" spellCheck={false}
               value={this.url()!}
               onInput={(e) => this.onUrlChanged((e.target as HTMLInputElement).value)}/>
      );

      yield <br/>;

      if (this.statusString()) {
        yield <p>{this.statusString()}</p>;
      } else if (!this.reserveCreationInfo()) {
        yield <p>Checking URL, please wait ...</p>;
      }

      if (this.reserveCreationInfo()) {
        if (this.detailCollapsed()) {
          yield (
            <button className="linky"
                    onClick={() => this.detailCollapsed(false)}>
              show more details
            </button>
          );
        } else {
          yield (
            <button className="linky"
                    onClick={() => this.detailCollapsed(true)}>
              hide details
            </button>
          );
          yield (
            <div>
              {renderReserveCreationDetails(this.reserveCreationInfo()!)}
            </div>
          );
        }
      }
    }

    return Array.from(f.call(this));
  }
}

export async function main() {
  const url = URI(document.location.href);
  const query: any = URI.parseQuery(url.query());
  const amount = AmountJson.checked(JSON.parse(query.amount));
  const callback_url = query.callback_url;
  const bank_url = query.bank_url;
  const wt_types = JSON.parse(query.wt_types);

  try {
    const suggestedExchangeUrl = await getSuggestedExchange(amount.currency);
    let args = {
      wt_types,
      suggestedExchangeUrl,
      callback_url,
      amount
    };

    preact.render(<ExchangeSelection {...args} />, document.getElementById(
      "exchange-selection")!);

  } catch (e) {
    // TODO: provide more context information, maybe factor it out into a
    // TODO:generic error reporting function or component.
    document.body.innerText = `Fatal error: "${e.message}".`;
    console.error(`got error "${e.message}"`, e);
  }
}