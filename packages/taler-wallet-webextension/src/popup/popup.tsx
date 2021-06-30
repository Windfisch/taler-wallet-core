/*
 This file is part of TALER
 (C) 2016 GNUnet e.V.

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
 * Popup shown to the user when they click
 * the Taler browser action button.
 *
 * @author Florian Dold
 */

/**
 * Imports.
 */
import {
  classifyTalerUri, i18n, TalerUriType
} from "@gnu-taler/taler-util";
import { ComponentChildren, JSX } from "preact";
import Match from "preact-router/match";
import { useDevContext } from "../context/useDevContext";

export enum Pages {
  balance = '/balance',
  settings = '/settings',
  dev = '/dev',
  backup = '/backup',
  history = '/history',
  transaction = '/transaction/:tid',
}

interface TabProps {
  target: string;
  current?: string;
  children?: ComponentChildren;
}

function Tab(props: TabProps): JSX.Element {
  let cssClass = "";
  if (props.current === props.target) {
    cssClass = "active";
  }
  return (
    <a href={props.target} class={cssClass}>
      {props.children}
    </a>
  );
}

export function WalletNavBar() {
  const { devMode } = useDevContext()
  return <Match>{({ path }: any) => {
    console.log("current", path)
    return (
      <div class="nav" id="header">
        <Tab target="/balance" current={path}>{i18n.str`Balance`}</Tab>
        <Tab target="/history" current={path}>{i18n.str`History`}</Tab>
        <Tab target="/backup" current={path}>{i18n.str`Backup`}</Tab>
        <Tab target="/settings" current={path}>{i18n.str`Settings`}</Tab>
        {devMode && <Tab target="/dev" current={path}>{i18n.str`Dev`}</Tab>}
      </div>
    )
  }}</Match>
}

