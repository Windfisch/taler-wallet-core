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

/// <reference path="../lib/decl/preact.d.ts" />

import { IExchangeInfo } from "../lib/wallet/types";
import { ReserveRecord, Coin, PreCoin, Denomination } from "../lib/wallet/types";
import { ImplicitStateComponent, StateHolder } from "../lib/components";
import {
  getReserves, getExchanges, getCoins, getPreCoins,
  refresh
} from "../lib/wallet/wxApi";
import { prettyAmount, abbrev } from "../lib/wallet/renderHtml";

interface ReserveViewProps {
  reserve: ReserveRecord;
}

class ReserveView extends preact.Component<ReserveViewProps, void> {
  render(): JSX.Element {
    let r: ReserveRecord = this.props.reserve;
    return (
      <div className="tree-item">
        <ul>
          <li>Key: {r.reserve_pub}</li>
          <li>Created: {(new Date(r.created * 1000).toString())}</li>
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
    let show = () => {
      this.props.expanded(true);
      this.setState({});
    };
    let hide = () => {
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
      <div style="display:inline;">
        {this.renderButton()}
        {this.props.expanded() ? this.props.children : []}
      </div>);
  }
}


interface CoinViewProps {
  coin: Coin;
}

interface RefreshDialogProps {
  coin: Coin;
}

class RefreshDialog extends ImplicitStateComponent<RefreshDialogProps> {
  refreshRequested = this.makeState<boolean>(false);
  render(): JSX.Element {
    if (!this.refreshRequested()) {
      return (
        <div style="display:inline;">
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

class CoinView extends preact.Component<CoinViewProps, void> {
  render() {
    let c = this.props.coin;
    return (
      <div className="tree-item">
        <ul>
          <li>Key: {c.coinPub}</li>
          <li>Current amount: {prettyAmount(c.currentAmount)}</li>
          <li>Denomination: {abbrev(c.denomPub, 20)}</li>
          <li>Suspended: {(c.suspended || false).toString()}</li>
          <li><RefreshDialog coin={c} /></li>
        </ul>
      </div>
    );
  }
}



interface PreCoinViewProps {
  precoin: PreCoin;
}

class PreCoinView extends preact.Component<PreCoinViewProps, void> {
  render() {
    let c = this.props.precoin;
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
  coins = this.makeState<Coin[] | null>(null);
  expanded = this.makeState<boolean>(false);

  constructor(props: CoinListProps) {
    super(props);
    this.update();
  }

  async update() {
    let coins = await getCoins(this.props.exchangeBaseUrl);
    this.coins(coins);
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
  precoins = this.makeState<PreCoin[] | null>(null);
  expanded = this.makeState<boolean>(false);

  constructor(props: PreCoinListProps) {
    super(props);
    this.update();
  }

  async update() {
    let precoins = await getPreCoins(this.props.exchangeBaseUrl);
    this.precoins(precoins);
  }

  render(): JSX.Element {
    if (!this.precoins()) {
      return <div>...</div>;
    }
    return (
      <div className="tree-item">
        Pre-Coins ({this.precoins() !.length.toString()})
        {" "}
        <Toggle expanded={this.expanded}>
          {this.precoins() !.map((c) => <PreCoinView precoin={c} />)}
        </Toggle>
      </div>
    );
  }
}

interface DenominationListProps {
  exchange: IExchangeInfo;
}

class DenominationList extends ImplicitStateComponent<DenominationListProps> {
  expanded = this.makeState<boolean>(false);

  renderDenom(d: Denomination) {
    return (
      <div className="tree-item">
        <ul>
          <li>Value: {prettyAmount(d.value)}</li>
          <li>Withdraw fee: {prettyAmount(d.fee_withdraw)}</li>
          <li>Refresh fee: {prettyAmount(d.fee_refresh)}</li>
          <li>Deposit fee: {prettyAmount(d.fee_deposit)}</li>
          <li>Refund fee: {prettyAmount(d.fee_refund)}</li>
        </ul>
      </div>
    );
  }

  render(): JSX.Element {
    return (
      <div className="tree-item">
        Denominations ({this.props.exchange.active_denoms.length.toString()})
        {" "}
        <Toggle expanded={this.expanded}>
          {this.props.exchange.active_denoms.map((d) => this.renderDenom(d))}
        </Toggle>
      </div>
    );
  }
}

class ReserveList extends ImplicitStateComponent<ReserveListProps> {
  reserves = this.makeState<ReserveRecord[] | null>(null);
  expanded = this.makeState<boolean>(false);

  constructor(props: ReserveListProps) {
    super(props);
    this.update();
  }

  async update() {
    let reserves = await getReserves(this.props.exchangeBaseUrl);
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
  exchange: IExchangeInfo;
}

class ExchangeView extends preact.Component<ExchangeProps, void> {
  render(): JSX.Element {
    let e = this.props.exchange;
    return (
      <div className="tree-item">
        Url: {this.props.exchange.baseUrl}
        <DenominationList exchange={e} />
        <ReserveList exchangeBaseUrl={this.props.exchange.baseUrl} />
        <CoinList exchangeBaseUrl={this.props.exchange.baseUrl} />
        <PreCoinList exchangeBaseUrl={this.props.exchange.baseUrl} />
      </div>
    );
  }
}

interface ExchangesListState {
  exchanges: IExchangeInfo[];
}

class ExchangesList extends preact.Component<any, ExchangesListState> {
  constructor() {
    super();
    this.update();
  }

  async update() {
    let exchanges = await getExchanges();
    console.log("exchanges: ", exchanges);
    this.setState({ exchanges });
  }

  render(): JSX.Element {
    if (!this.state.exchanges) {
      return <span>...</span>;
    }
    return (
      <div className="tree-item">
        Exchanges ({this.state.exchanges.length.toString()}):
        {this.state.exchanges.map(e => <ExchangeView exchange={e} />)}
      </div>
    );
  }
}

export function main() {
  preact.render(<ExchangesList />, document.body);
}
