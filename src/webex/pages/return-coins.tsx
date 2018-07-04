/*
 This file is part of TALER
 (C) 2017 Inria

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
 * Return coins to own bank account.
 *
 * @author Florian Dold
 */


/**
 * Imports.
 */

import { AmountJson } from "../../amounts";
import * as Amounts from "../../amounts";

import {
  SenderWireInfos,
  WalletBalance,
} from "../../walletTypes";

import * as i18n from "../../i18n";

import * as wire from "../../wire";

import {
  getBalance,
  getSenderWireInfos,
  returnCoins,
} from "../wxApi";

import { renderAmount } from "../renderHtml";

import * as React from "react";
import * as ReactDOM from "react-dom";

interface ReturnSelectionItemProps extends ReturnSelectionListProps {
  exchangeUrl: string;
  senderWireInfos: SenderWireInfos;
}

interface ReturnSelectionItemState {
  selectedValue: string;
  supportedWires: object[];
  selectedWire: string;
  currency: string;
}

class ReturnSelectionItem extends React.Component<ReturnSelectionItemProps, ReturnSelectionItemState> {
  constructor(props: ReturnSelectionItemProps) {
    super(props);
    const exchange = this.props.exchangeUrl;
    const wireTypes = this.props.senderWireInfos.exchangeWireTypes;
    const supportedWires = this.props.senderWireInfos.senderWires.filter((x) => {
      return wireTypes[exchange] && wireTypes[exchange].indexOf((x as any).type) >= 0;
    });
    this.state = {
      currency: props.balance.byExchange[props.exchangeUrl].available.currency,
      selectedValue: Amounts.toString(props.balance.byExchange[props.exchangeUrl].available),
      selectedWire: "",
      supportedWires,
    };
  }
  render(): JSX.Element {
    const exchange = this.props.exchangeUrl;
    const byExchange = this.props.balance.byExchange;
    const wireTypes = this.props.senderWireInfos.exchangeWireTypes;
    return (
      <div key={exchange}>
        <h2>Exchange {exchange}</h2>
        <p>Available amount: {renderAmount(byExchange[exchange].available)}</p>
        <p>Supported wire methods: {wireTypes[exchange].length ? wireTypes[exchange].join(", ") : "none"}</p>
        <p>Wire {""}
            <input
              type="text"
              size={this.state.selectedValue.length || 1}
              value={this.state.selectedValue}
              onChange={(evt) => this.setState({selectedValue: evt.target.value})}
              style={{textAlign: "center"}}
            /> {this.props.balance.byExchange[exchange].available.currency} {""}
            to account {""}
            <select value={this.state.selectedWire} onChange={(evt) => this.setState({selectedWire: evt.target.value})}>
              <option style={{display: "none"}}>Select account</option>
              {this.state.supportedWires.map((w, n) =>
                <option value={n.toString()} key={JSON.stringify(w)}>{n + 1}: {wire.summarizeWire(w)}</option>,
              )}
            </select>.
        </p>
        {this.state.selectedWire
          ? <button className="pure-button button-success" onClick={() => this.select()}>
              {i18n.str`Wire to bank account`}
            </button>
          : null}
      </div>
    );
  }

  select() {
    let val: number;
    let selectedWire: number;
    try {
      val = Number.parseFloat(this.state.selectedValue);
      selectedWire = Number.parseInt(this.state.selectedWire);
    } catch (e) {
      console.error(e);
      return;
    }
    this.props.selectDetail({
      amount: Amounts.fromFloat(val, this.state.currency),
      exchange: this.props.exchangeUrl,
      senderWire: this.state.supportedWires[selectedWire],
    });
  }
}

interface ReturnSelectionListProps {
  balance: WalletBalance;
  senderWireInfos: SenderWireInfos;
  selectDetail(d: SelectedDetail): void;
}

class ReturnSelectionList extends React.Component<ReturnSelectionListProps, {}> {
  render(): JSX.Element {
    const byExchange = this.props.balance.byExchange;
    const exchanges = Object.keys(byExchange);
    if (!exchanges.length) {
      return <p className="errorbox">Currently no funds available to transfer.</p>;
    }
    return (
      <div>
      {exchanges.map((e) => <ReturnSelectionItem key={e} exchangeUrl={e} {...this.props} />)}
      </div>
    );
  }
}

interface SelectedDetail {
  amount: AmountJson;
  senderWire: any;
  exchange: string;
}


interface ReturnConfirmationProps {
  detail: SelectedDetail;
  cancel(): void;
  confirm(): void;
}

class ReturnConfirmation extends React.Component<ReturnConfirmationProps, {}> {
  render() {
    return (
      <div>
        <p>Please confirm if you want to transmit <strong>{renderAmount(this.props.detail.amount)}</strong> at {""}
           {this.props.detail.exchange} to account {""}
            <strong style={{whiteSpace: "nowrap"}}>{wire.summarizeWire(this.props.detail.senderWire)}</strong>.
        </p>
        <button className="pure-button button-success" onClick={() => this.props.confirm()}>
          {i18n.str`Confirm`}
        </button>
        <button className="pure-button" onClick={() => this.props.cancel()}>
          {i18n.str`Cancel`}
        </button>
      </div>
    );
  }
}

interface ReturnCoinsState {
  balance: WalletBalance | undefined;
  senderWireInfos: SenderWireInfos | undefined;
  selectedReturn: SelectedDetail | undefined;
  /**
   * Last confirmed detail, so we can show a nice box.
   */
  lastConfirmedDetail: SelectedDetail | undefined;
}

class ReturnCoins extends React.Component<{}, ReturnCoinsState> {
  constructor(props: {}) {
    super(props);
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
    const balance = await getBalance();
    const senderWireInfos = await getSenderWireInfos();
    console.log("got swi", senderWireInfos);
    console.log("got bal", balance);
    this.setState({ balance, senderWireInfos });
  }

  selectDetail(d: SelectedDetail) {
    this.setState({selectedReturn: d});
  }

  async confirm() {
    const selectedReturn = this.state.selectedReturn;
    if (!selectedReturn) {
      return;
    }
    await returnCoins(selectedReturn);
    await this.update();
    this.setState({selectedReturn: undefined, lastConfirmedDetail: selectedReturn});
  }

  async cancel() {
    this.setState({selectedReturn: undefined, lastConfirmedDetail: undefined});
  }

  render() {
    const balance = this.state.balance;
    const senderWireInfos = this.state.senderWireInfos;
    if (!balance || !senderWireInfos) {
      return <span>...</span>;
    }
    if (this.state.selectedReturn) {
      return (
        <div id="main">
          <ReturnConfirmation
            detail={this.state.selectedReturn}
            cancel={() => this.cancel()}
            confirm={() => this.confirm()}
          />
        </div>
      );
    }
    return (
        <div id="main">
          <h1>Wire electronic cash back to own bank account</h1>
          <p>You can send coins back into your own bank account.  Note that
          you're acting as a merchant when doing this, and thus the same fees apply.</p>
          {this.state.lastConfirmedDetail
            ? <p className="okaybox">
                Transfer of {renderAmount(this.state.lastConfirmedDetail.amount)} successfully initiated.
              </p>
            : null}
          <ReturnSelectionList
            selectDetail={(d) => this.selectDetail(d)}
            balance={balance}
            senderWireInfos={senderWireInfos} />
        </div>
    );
  }
}


function main() {
  ReactDOM.render(<ReturnCoins />, document.getElementById("container")!);
}

document.addEventListener("DOMContentLoaded", main);
