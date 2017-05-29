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
 * Show contents of the wallet as a tree.
 *
 * @author Florian Dold
 */


import { amountToPretty, getTalerStampDate } from "../../helpers";
import {
  CoinRecord,
  CoinStatus,
  DenominationRecord,
  ExchangeRecord,
  PreCoinRecord,
  ReserveRecord,
} from "../../types";

import { ImplicitStateComponent, StateHolder } from "../components";
import {
  getCoins,
  getDenoms,
  getExchanges,
  getPreCoins,
  getReserves,
  payback,
  refresh,
} from "../wxApi";

import * as React from "react";
import * as ReactDOM from "react-dom";

interface ReserveViewProps {
  reserve: ReserveRecord;
}

class ReserveView extends React.Component<ReserveViewProps, void> {
  render(): JSX.Element {
    const r: ReserveRecord = this.props.reserve;
    return (
      <div className="tree-item">
        <ul>
          <li>Key: {r.reserve_pub}</li>
          <li>Created: {(new Date(r.created * 1000).toString())}</li>
          <li>Current: {r.current_amount ? amountToPretty(r.current_amount!) : "null"}</li>
          <li>Requested: {amountToPretty(r.requested_amount)}</li>
          <li>Confirmed: {r.confirmed}</li>
        </ul>
      </div>
    );
  }
}

interface ReserveListProps {
  exchangeBaseUrl: string;
}

interface ToggleProps {
  expanded: StateHolder<boolean>;
}

class Toggle extends ImplicitStateComponent<ToggleProps> {
  renderButton() {
    const show = () => {
      this.props.expanded(true);
      this.setState({});
    };
    const hide = () => {
      this.props.expanded(false);
      this.setState({});
    };
    if (this.props.expanded()) {
      return <button onClick={hide}>hide</button>;
    }
    return <button onClick={show}>show</button>;

  }
  render() {
    return (
      <div style={{display: "inline"}}>
        {this.renderButton()}
        {this.props.expanded() ? this.props.children : []}
      </div>);
  }
}


interface CoinViewProps {
  coin: CoinRecord;
}

interface RefreshDialogProps {
  coin: CoinRecord;
}

class RefreshDialog extends ImplicitStateComponent<RefreshDialogProps> {
  private refreshRequested = this.makeState<boolean>(false);
  render(): JSX.Element {
    if (!this.refreshRequested()) {
      return (
        <div style={{display: "inline"}}>
          <button onClick={() => this.refreshRequested(true)}>refresh</button>
        </div>
      );
    }
    return (
      <div>
        Refresh amount: <input type="text" size={10} />
        <button onClick={() => refresh(this.props.coin.coinPub)}>ok</button>
        <button onClick={() => this.refreshRequested(false)}>cancel</button>
      </div>
      );
  }
}

class CoinView extends React.Component<CoinViewProps, void> {
  render() {
    const c = this.props.coin;
    return (
      <div className="tree-item">
        <ul>
          <li>Key: {c.coinPub}</li>
          <li>Current amount: {amountToPretty(c.currentAmount)}</li>
          <li>Denomination: <ExpanderText text={c.denomPub} /></li>
          <li>Suspended: {(c.suspended || false).toString()}</li>
          <li>Status: {CoinStatus[c.status]}</li>
          <li><RefreshDialog coin={c} /></li>
          <li><button onClick={() => payback(c.coinPub)}>Payback</button></li>
        </ul>
      </div>
    );
  }
}


interface PreCoinViewProps {
  precoin: PreCoinRecord;
}

class PreCoinView extends React.Component<PreCoinViewProps, void> {
  render() {
    const c = this.props.precoin;
    return (
      <div className="tree-item">
        <ul>
          <li>Key: {c.coinPub}</li>
        </ul>
      </div>
    );
  }
}

interface CoinListProps {
  exchangeBaseUrl: string;
}

class CoinList extends ImplicitStateComponent<CoinListProps> {
  private coins = this.makeState<CoinRecord[] | null>(null);
  private expanded = this.makeState<boolean>(false);

  constructor(props: CoinListProps) {
    super(props);
    this.update(props);
  }

  async update(props: CoinListProps) {
    const coins = await getCoins(props.exchangeBaseUrl);
    this.coins(coins);
  }

  componentWillReceiveProps(newProps: CoinListProps) {
    this.update(newProps);
  }

  render(): JSX.Element {
    if (!this.coins()) {
      return <div>...</div>;
    }
    return (
      <div className="tree-item">
        Coins ({this.coins() !.length.toString()})
        {" "}
        <Toggle expanded={this.expanded}>
          {this.coins() !.map((c) => <CoinView coin={c} />)}
        </Toggle>
      </div>
    );
  }
}


interface PreCoinListProps {
  exchangeBaseUrl: string;
}

class PreCoinList extends ImplicitStateComponent<PreCoinListProps> {
  private precoins = this.makeState<PreCoinRecord[] | null>(null);
  private expanded = this.makeState<boolean>(false);

  constructor(props: PreCoinListProps) {
    super(props);
    this.update();
  }

  async update() {
    const precoins = await getPreCoins(this.props.exchangeBaseUrl);
    this.precoins(precoins);
  }

  render(): JSX.Element {
    if (!this.precoins()) {
      return <div>...</div>;
    }
    return (
      <div className="tree-item">
        Planchets ({this.precoins() !.length.toString()})
        {" "}
        <Toggle expanded={this.expanded}>
          {this.precoins() !.map((c) => <PreCoinView precoin={c} />)}
        </Toggle>
      </div>
    );
  }
}

interface DenominationListProps {
  exchange: ExchangeRecord;
}

interface ExpanderTextProps {
  text: string;
}

class ExpanderText extends ImplicitStateComponent<ExpanderTextProps> {
  private expanded = this.makeState<boolean>(false);
  private textArea: any = undefined;

  componentDidUpdate() {
    if (this.expanded() && this.textArea) {
      this.textArea.focus();
      this.textArea.scrollTop = 0;
    }
  }

  render(): JSX.Element {
    if (!this.expanded()) {
      return (
        <span onClick={() => { this.expanded(true); }}>
          {(this.props.text.length <= 10)
            ?  this.props.text
            : (
                <span>
                  {this.props.text.substring(0, 10)}
                  <span style={{textDecoration: "underline"}}>...</span>
                </span>
              )
          }
        </span>
      );
    }
    return (
      <textarea
        readOnly
        style={{display: "block"}}
        onBlur={() => this.expanded(false)}
        ref={(e) => this.textArea = e}>
        {this.props.text}
      </textarea>
    );
  }
}

class DenominationList extends ImplicitStateComponent<DenominationListProps> {
  private expanded = this.makeState<boolean>(false);
  private denoms = this.makeState<undefined|DenominationRecord[]>(undefined);

  constructor(props: DenominationListProps) {
    super(props);
    this.update();
  }

  async update() {
    const d = await getDenoms(this.props.exchange.baseUrl);
    this.denoms(d);
  }

  renderDenom(d: DenominationRecord) {
    return (
      <div className="tree-item">
        <ul>
          <li>Offered: {d.isOffered ? "yes" : "no"}</li>
          <li>Value: {amountToPretty(d.value)}</li>
          <li>Withdraw fee: {amountToPretty(d.feeWithdraw)}</li>
          <li>Refresh fee: {amountToPretty(d.feeRefresh)}</li>
          <li>Deposit fee: {amountToPretty(d.feeDeposit)}</li>
          <li>Refund fee: {amountToPretty(d.feeRefund)}</li>
          <li>Start: {getTalerStampDate(d.stampStart)!.toString()}</li>
          <li>Withdraw expiration: {getTalerStampDate(d.stampExpireWithdraw)!.toString()}</li>
          <li>Legal expiration: {getTalerStampDate(d.stampExpireLegal)!.toString()}</li>
          <li>Deposit expiration: {getTalerStampDate(d.stampExpireDeposit)!.toString()}</li>
          <li>Denom pub: <ExpanderText text={d.denomPub} /></li>
        </ul>
      </div>
    );
  }

  render(): JSX.Element {
    const denoms = this.denoms();
    if (!denoms) {
      return (
        <div className="tree-item">
        Denominations (...)
        {" "}
        <Toggle expanded={this.expanded}>
          ...
        </Toggle>
      </div>
      );
    }
    return (
      <div className="tree-item">
        Denominations ({denoms.length.toString()})
        {" "}
        <Toggle expanded={this.expanded}>
          {denoms.map((d) => this.renderDenom(d))}
        </Toggle>
      </div>
    );
  }
}


class ReserveList extends ImplicitStateComponent<ReserveListProps> {
  private reserves = this.makeState<ReserveRecord[] | null>(null);
  private expanded = this.makeState<boolean>(false);

  constructor(props: ReserveListProps) {
    super(props);
    this.update();
  }

  async update() {
    const reserves = await getReserves(this.props.exchangeBaseUrl);
    this.reserves(reserves);
  }

  render(): JSX.Element {
    if (!this.reserves()) {
      return <div>...</div>;
    }
    return (
      <div className="tree-item">
        Reserves ({this.reserves() !.length.toString()})
        {" "}
        <Toggle expanded={this.expanded}>
          {this.reserves() !.map((r) => <ReserveView reserve={r} />)}
        </Toggle>
      </div>
    );
  }
}

interface ExchangeProps {
  exchange: ExchangeRecord;
}

class ExchangeView extends React.Component<ExchangeProps, void> {
  render(): JSX.Element {
    const e = this.props.exchange;
    return (
      <div className="tree-item">
        <ul>
          <li>Exchange Base Url: {this.props.exchange.baseUrl}</li>
          <li>Master public key: <ExpanderText text={this.props.exchange.masterPublicKey} /></li>
        </ul>
        <DenominationList exchange={e} />
        <ReserveList exchangeBaseUrl={this.props.exchange.baseUrl} />
        <CoinList exchangeBaseUrl={this.props.exchange.baseUrl} />
        <PreCoinList exchangeBaseUrl={this.props.exchange.baseUrl} />
      </div>
    );
  }
}

interface ExchangesListState {
  exchanges?: ExchangeRecord[];
}

class ExchangesList extends React.Component<any, ExchangesListState> {
  constructor() {
    super();
    const port = chrome.runtime.connect();
    port.onMessage.addListener((msg: any) => {
      if (msg.notify) {
        console.log("got notified");
        this.update();
      }
    });
    this.update();
    this.state = {} as any;
  }

  async update() {
    const exchanges = await getExchanges();
    console.log("exchanges: ", exchanges);
    this.setState({ exchanges });
  }

  render(): JSX.Element {
    const exchanges = this.state.exchanges;
    if (!exchanges) {
      return <span>...</span>;
    }
    return (
      <div className="tree-item">
        Exchanges ({exchanges.length.toString()}):
        {exchanges.map((e) => <ExchangeView exchange={e} />)}
      </div>
    );
  }
}

function main() {
  ReactDOM.render(<ExchangesList />, document.getElementById("container")!);
}

document.addEventListener("DOMContentLoaded", main);
