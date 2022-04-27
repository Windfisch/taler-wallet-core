/*
 This file is part of GNU Taler
 (C) 2020 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Imports.
 */
import { Logger } from "@gnu-taler/taler-util";
import { timer, TimerAPI, TimerHandle } from "@gnu-taler/taler-wallet-core";


const logger = new Logger("ServiceWorkerTimerGroup.ts");

/**
 * Implementation of [[TimerAPI]] using alarm API
 */
export class ServiceWorkerTimerAPI implements TimerAPI {


  /**
   * Call a function every time the delay given in milliseconds passes.
   */
  every(delayMs: number, callback: VoidFunction): TimerHandle {
    const seconds = delayMs / 1000;
    const periodInMinutes = Math.round(seconds < 61 ? 1 : seconds / 60);

    logger.info(`creating a alarm every ${periodInMinutes} min, intended delay was ${delayMs}`)
    // chrome.alarms.create("wallet-worker", { periodInMinutes })
    // chrome.alarms.onAlarm.addListener((a) => {
    //   logger.info(`alarm called, every: ${a.name}`)
    //   callback()
    // })

    const p = timer.every(delayMs, callback)
    return p;
  }

  /**
   * Call a function after the delay given in milliseconds passes.
   */
  after(delayMs: number, callback: VoidFunction): TimerHandle {
    const seconds = delayMs / 1000;
    const delayInMinutes = Math.round(seconds < 61 ? 1 : seconds / 60);

    logger.info(`creating a alarm after ${delayInMinutes} min, intended delay was ${delayMs}`)
    chrome.alarms.create("wallet-worker", { delayInMinutes })
    // chrome.alarms.onAlarm.addListener((a) => {
    //   logger.info(`alarm called, after: ${a.name}`)
    //   callback();
    // })


    const p = timer.after(delayMs, callback);

    return p
  }

}
