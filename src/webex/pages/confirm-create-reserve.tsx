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

import { canonicalizeBaseUrl } from "../../helpers";
import * as i18n from "../../i18n";
import {
  AmountJson,
  Amounts,
  CreateReserveResponse,
  CurrencyRecord,
  ReserveCreationInfo,
} from "../../types";

import { ImplicitStateComponent, StateHolder } from "../components";
import {
  createReserve,
  getCurrency,
  getExchangeInfo,
  getReserveCreationInfo,
} from "../wxApi";

import { renderAmount, WithdrawDetailView } from "../renderHtml";

import * as React from "react";
import * as ReactDOM from "react-dom";
import URI = require("urijs");


function delay<T>(delayMs: number, value: T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    setTimeout(() => resolve(value), delayMs);
  });
}

class EventTrigger {
  private triggerResolve: any;
  private triggerPromise: Promise<boolean>;

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




interface ExchangeSelectionProps {
  suggestedExchangeUrl: string;
  amount: AmountJson;
  callback_url: string;
  wt_types: string[];
  currencyRecord: CurrencyRecord|null;
  sender_wire: object | undefined;
}

interface ManualSelectionProps {
  onSelect(url: string): void;
  initialUrl: string;
}

class ManualSelection extends ImplicitStateComponent<ManualSelectionProps> {
  private url: StateHolder<string> = this.makeState("");
  private errorMessage: StateHolder<string|null> = this.makeState(null);
  private isOkay: StateHolder<boolean> = this.makeState(false);
  private updateEvent = new EventTrigger();
  constructor(p: ManualSelectionProps) {
    super(p);
    this.url(p.initialUrl);
    this.update();
  }
  render() {
    return (
      <div className="pure-g pure-form pure-form-stacked">
        <div className="pure-u-1">
          <label>URL</label>
          <input className="url" type="text" spellCheck={false}
                 value={this.url()}
                 key="exchange-url-input"
                 onInput={(e) => this.onUrlChanged((e.target as HTMLInputElement).value)} />
        </div>
        <div className="pure-u-1">
          <button className="pure-button button-success"
                  disabled={!this.isOkay()}
                  onClick={() => this.props.onSelect(this.url())}>
            {i18n.str`Select`}
          </button>
          {this.errorMessage()}
        </div>
      </div>
    );
  }

  async update() {
    this.errorMessage(null);
    this.isOkay(false);
    if (!this.url()) {
      return;
    }
    const parsedUrl = new URI(this.url()!);
    if (parsedUrl.is("relative")) {
      this.errorMessage(i18n.str`Error: URL may not be relative`);
      this.isOkay(false);
      return;
    }
    try {
      const url = canonicalizeBaseUrl(this.url()!);
      await getExchangeInfo(url);
      console.log("getExchangeInfo returned");
      this.isOkay(true);
    } catch (e) {
      console.log("got error", e);
      if (e.hasOwnProperty("httpStatus")) {
        this.errorMessage(`Error: request failed with status ${e.httpStatus}`);
      } else if (e.hasOwnProperty("errorResponse")) {
        const resp = e.errorResponse;
        this.errorMessage(`Error: ${resp.error} (${resp.hint})`);
      } else {
        this.errorMessage("invalid exchange URL");
      }
    }
  }

  async onUrlChanged(s: string) {
    this.url(s);
    this.errorMessage(null);
    this.isOkay(false);
    this.updateEvent.trigger();
    const waited = await this.updateEvent.wait(200);
    if (waited) {
      // Run the actual update if nobody else preempted us.
      this.update();
    }
  }
}


class ExchangeSelection extends ImplicitStateComponent<ExchangeSelectionProps> {
  private statusString: StateHolder<string|null> = this.makeState(null);
  private reserveCreationInfo: StateHolder<ReserveCreationInfo|null> = this.makeState(
    null);
  private url: StateHolder<string|null> = this.makeState(null);

  private selectingExchange: StateHolder<boolean> = this.makeState(false);

  constructor(props: ExchangeSelectionProps) {
    super(props);
    const prefilledExchangesUrls = [];
    if (props.currencyRecord) {
      const exchanges = props.currencyRecord.exchanges.map((x) => x.baseUrl);
      prefilledExchangesUrls.push(...exchanges);
    }
    if (props.suggestedExchangeUrl) {
      prefilledExchangesUrls.push(props.suggestedExchangeUrl);
    }
    if (prefilledExchangesUrls.length !== 0) {
      this.url(prefilledExchangesUrls[0]);
      this.forceReserveUpdate();
    } else {
      this.selectingExchange(true);
    }
  }

  renderFeeStatus() {
    const rci = this.reserveCreationInfo();
    if (rci) {
      const totalCost = Amounts.add(rci.overhead, rci.withdrawFee).amount;
      let trustMessage;
      if (rci.isTrusted) {
        trustMessage = (
          <i18n.Translate wrap="p">
            The exchange is trusted by the wallet.
          </i18n.Translate>
        );
      } else if (rci.isAudited) {
        trustMessage = (
          <i18n.Translate wrap="p">
            The exchange is audited by a trusted auditor.
          </i18n.Translate>
        );
      } else {
        trustMessage = (
          <i18n.Translate wrap="p">
            Warning:  The exchange is neither directly trusted nor audited by a trusted auditor.
            If you withdraw from this exchange, it will be trusted in the future.
          </i18n.Translate>
        );
      }
      return (
        <div>
        <i18n.Translate wrap="p">
          Using exchange provider <strong>{this.url()}</strong>.
          The exchange provider will charge
          {" "}
          <span>{renderAmount(totalCost)}</span>
          {" "}
          in fees.
        </i18n.Translate>
        {trustMessage}
        </div>
      );
    }
    if (this.url() && !this.statusString()) {
      const shortName = new URI(this.url()!).host();
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
          <strong style={{color: "red"}}>{this.statusString()}</strong>
        </p>
      );
    }
    return (
      <p>
        {i18n.str`Information about fees will be available when an exchange provider is selected.`}
      </p>
    );
  }

  renderUpdateStatus() {
    const rci = this.reserveCreationInfo();
    if (!rci) {
      return null;
    }
    if (!rci.versionMatch) {
      return null;
    }
    if (rci.versionMatch.compatible) {
      return null;
    }
    if (rci.versionMatch.currentCmp === -1) {
      return (
        <p className="errorbox">
          Your wallet might be outdated.  The exchange has a higher, incompatible
          protocol version.
        </p>
      );
    }
    if (rci.versionMatch.currentCmp === 1) {
      return (
        <p className="errorbox">
          The chosen exchange might be outdated.  The exchange has a lower, incompatible
          protocol version.
        </p>
      );
    }
    throw Error("not reached");
  }

  renderConfirm() {
    return (
      <div>
        {this.renderFeeStatus()}
        <p>
        <button className="pure-button button-success"
                disabled={this.reserveCreationInfo() === null}
                onClick={() => this.confirmReserve()}>
          {i18n.str`Accept fees and withdraw`}
        </button>
        { " " }
        <button className="pure-button button-secondary"
                onClick={() => this.selectingExchange(true)}>
          {i18n.str`Change Exchange Provider`}
        </button>
        </p>
        {this.renderUpdateStatus()}
        <WithdrawDetailView rci={this.reserveCreationInfo()} />
      </div>
    );
  }

  select(url: string) {
    this.reserveCreationInfo(null);
    this.url(url);
    this.selectingExchange(false);
    this.forceReserveUpdate();
  }

  renderSelect() {
    const exchanges = (this.props.currencyRecord && this.props.currencyRecord.exchanges) || [];
    console.log(exchanges);
    return (
      <div>
        Please select an exchange.  You can review the details before after your selection.

        {this.props.suggestedExchangeUrl && (
          <div>
            <h2>Bank Suggestion</h2>
            <button className="pure-button button-success" onClick={() => this.select(this.props.suggestedExchangeUrl)}>
              Select <strong>{this.props.suggestedExchangeUrl}</strong>
            </button>
          </div>
        )}

        {exchanges.length > 0 && (
          <div>
            <h2>Known Exchanges</h2>
            {exchanges.map((e) => (
              <button className="pure-button button-success" onClick={() => this.select(e.baseUrl)}>
              Select <strong>{e.baseUrl}</strong>
              </button>
            ))}
          </div>
        )}

        <h2>Manual Selection</h2>
        <ManualSelection initialUrl={this.url() || ""} onSelect={(url: string) => this.select(url)} />
      </div>
    );
  }

  render(): JSX.Element {
    return (
      <div>
        <i18n.Translate wrap="p">
          {"You are about to withdraw "}
          <strong>{renderAmount(this.props.amount)}</strong>
          {" from your bank account into your wallet."}
        </i18n.Translate>
        {this.selectingExchange() ? this.renderSelect() : this.renderConfirm()}
      </div>
    );
  }


  confirmReserve() {
    this.confirmReserveImpl(this.reserveCreationInfo()!,
                            this.url()!,
                            this.props.amount,
                            this.props.callback_url,
                            this.props.sender_wire);
  }

  /**
   * Do an update of the reserve creation info, without any debouncing.
   */
  async forceReserveUpdate() {
    this.reserveCreationInfo(null);
    try {
      const url = canonicalizeBaseUrl(this.url()!);
      const r = await getReserveCreationInfo(url,
                                           this.props.amount);
      console.log("get exchange info resolved");
      this.reserveCreationInfo(r);
      console.dir(r);
    } catch (e) {
      console.log("get exchange info rejected", e);
      this.statusString(`Error: ${e.message}`);
      // Re-try every 5 seconds as long as there is a problem
      setTimeout(() => this.statusString() ? this.forceReserveUpdate() : undefined, 5000);
    }
  }

  async confirmReserveImpl(rci: ReserveCreationInfo,
                           exchange: string,
                           amount: AmountJson,
                           callback_url: string,
                           sender_wire: object | undefined) {
    const rawResp = await createReserve({
      amount,
      exchange: canonicalizeBaseUrl(exchange),
      senderWire: sender_wire,
    });
    if (!rawResp) {
      throw Error("empty response");
    }
    // FIXME: filter out types that bank/exchange don't have in common
    const wireDetails = rci.wireInfo;
    const filteredWireDetails: any = {};
    for (const wireType in wireDetails) {
      if (this.props.wt_types.findIndex((x) => x.toLowerCase() === wireType.toLowerCase()) < 0) {
        continue;
      }
      const obj = Object.assign({}, wireDetails[wireType]);
      // The bank doesn't need to know about fees
      delete obj.fees;
      // Consequently the bank can't verify signatures anyway, so
      // we delete this extra data, to make the request URL shorter.
      delete obj.salt;
      delete obj.sig;
      filteredWireDetails[wireType] = obj;
    }
    if (!rawResp.error) {
      const resp = CreateReserveResponse.checked(rawResp);
      const q: {[name: string]: string|number} = {
        amount_currency: amount.currency,
        amount_fraction: amount.fraction,
        amount_value: amount.value,
        exchange: resp.exchange,
        reserve_pub: resp.reservePub,
        wire_details: JSON.stringify(filteredWireDetails),
      };
      const url = new URI(callback_url).addQuery(q);
      if (!url.is("absolute")) {
        throw Error("callback url is not absolute");
      }
      console.log("going to", url.href());
      document.location.href = url.href();
    } else {
      this.statusString(
        i18n.str`Oops, something went wrong. The wallet responded with error status (${rawResp.error}).`);
    }
  }

  renderStatus(): any {
    if (this.statusString()) {
      return <p><strong style={{color: "red"}}>{this.statusString()}</strong></p>;
    } else if (!this.reserveCreationInfo()) {
      return <p>{i18n.str`Checking URL, please wait ...`}</p>;
    }
    return "";
  }
}

async function main() {
  try {
    const url = new URI(document.location.href);
    const query: any = URI.parseQuery(url.query());
    let amount;
    try {
      amount = AmountJson.checked(JSON.parse(query.amount));
    } catch (e) {
      throw Error(i18n.str`Can't parse amount: ${e.message}`);
    }
    const callback_url = query.callback_url;
    let wt_types;
    try {
      wt_types = JSON.parse(query.wt_types);
    } catch (e) {
      throw Error(i18n.str`Can't parse wire_types: ${e.message}`);
    }

    let sender_wire;
    if (query.sender_wire) {
      sender_wire = JSON.parse(query.sender_wire);
    }

    const suggestedExchangeUrl = query.suggested_exchange_url;
    const currencyRecord = await getCurrency(amount.currency);

    const args = {
      amount,
      callback_url,
      currencyRecord,
      sender_wire,
      suggestedExchangeUrl,
      wt_types,
    };

    ReactDOM.render(<ExchangeSelection {...args} />, document.getElementById(
      "exchange-selection")!);

  } catch (e) {
    // TODO: provide more context information, maybe factor it out into a
    // TODO:generic error reporting function or component.
    document.body.innerText = i18n.str`Fatal error: "${e.message}".`;
    console.error(`got error "${e.message}"`, e);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  main();
});
