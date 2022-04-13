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
import { TimerAPI, TimerHandle } from "@gnu-taler/taler-wallet-core";


const nullTimerHandle = {
  clear() {
    // do nothing
    return;
  },
  unref() {
    // do nothing
    return;
  },
};

const logger = new Logger("ServiceWorkerTimerGroup.ts");
/**
 * Implementation of [[TimerAPI]] using alarm API
 */
export class ServiceWorkerTimerAPI implements TimerAPI {

  /**
   * Call a function every time the delay given in milliseconds passes.
   */
  every(delayMs: number, callback: () => void): TimerHandle {
    const seconds = delayMs / 1000;
    const periodInMinutes = Math.round(seconds < 61 ? 1 : seconds / 60);

    logger.trace(`creating a alarm every ${periodInMinutes} ${delayMs}`)
    chrome.alarms.create("wallet-worker", { periodInMinutes })
    chrome.alarms.onAlarm.addListener((a) => {
      logger.trace(`alarm called, every: ${a.name}`)
      callback()
    })

    return new AlarmHandle();
  }

  /**
   * Call a function after the delay given in milliseconds passes.
   */
  after(delayMs: number, callback: () => void): TimerHandle {
    const seconds = delayMs / 1000;
    const delayInMinutes = Math.round(seconds < 61 ? 1 : seconds / 60);

    logger.trace(`creating a alarm after ${delayInMinutes} ${delayMs}`)
    chrome.alarms.create("wallet-worker", { delayInMinutes })
    chrome.alarms.onAlarm.addListener((a) => {
      logger.trace(`alarm called, after: ${a.name}`)
      callback();
    })
    return new AlarmHandle();
  }

}

class AlarmHandle implements TimerHandle {

  clear(): void {
    chrome.alarms.clear("wallet-worker", (result) => {
      logger.info(`Alarm 'wallet-worker' was cleared: ${result}`)
    })
    return;
  }
  unref(): void {
    return;
  }

}
