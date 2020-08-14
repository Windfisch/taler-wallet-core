/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Implementation of token bucket throttling.
 */

/**
 * Imports.
 */
import { getTimestampNow, timestampDifference } from "../util/time";
import { URL } from "./url";
import { Logger } from "./logging";

const logger = new Logger("RequestThrottler.ts");

/**
 * Maximum request per second, per origin.
 */
const MAX_PER_SECOND = 50;

/**
 * Maximum request per minute, per origin.
 */
const MAX_PER_MINUTE = 100;

/**
 * Maximum request per hour, per origin.
 */
const MAX_PER_HOUR = 1000;

/**
 * Throttling state for one origin.
 */
class OriginState {
  private tokensSecond: number = MAX_PER_SECOND;
  private tokensMinute: number = MAX_PER_MINUTE;
  private tokensHour: number = MAX_PER_HOUR;
  private lastUpdate = getTimestampNow();

  private refill(): void {
    const now = getTimestampNow();
    const d = timestampDifference(now, this.lastUpdate);
    if (d.d_ms === "forever") {
      throw Error("assertion failed");
    }
    const d_s = d.d_ms / 1000;
    this.tokensSecond = Math.min(
      MAX_PER_SECOND,
      this.tokensSecond + d_s / 1000,
    );
    this.tokensMinute = Math.min(
      MAX_PER_MINUTE,
      this.tokensMinute + (d_s / 1000) * 60,
    );
    this.tokensHour = Math.min(
      MAX_PER_HOUR,
      this.tokensHour + (d_s / 1000) * 60 * 60,
    );
    this.lastUpdate = now;
  }

  /**
   * Return true if the request for this origin should be throttled.
   * Otherwise, take a token out of the respective buckets.
   */
  applyThrottle(): boolean {
    this.refill();
    if (this.tokensSecond < 1) {
      logger.warn("request throttled (per second limit exceeded)");
      return true;
    }
    if (this.tokensMinute < 1) {
      logger.warn("request throttled (per minute limit exceeded)");
      return true;
    }
    if (this.tokensHour < 1) {
      logger.warn("request throttled (per hour limit exceeded)");
      return true;
    }
    this.tokensSecond--;
    this.tokensMinute--;
    this.tokensHour--;
    return false;
  }
}

/**
 * Request throttler, used as a "last layer of defense" when some
 * other part of the re-try logic is broken and we're sending too
 * many requests to the same exchange/bank/merchant.
 */
export class RequestThrottler {
  private perOriginInfo: { [origin: string]: OriginState } = {};

  /**
   * Get the throttling state for an origin, or
   * initialize if no state is associated with the
   * origin yet.
   */
  private getState(origin: string): OriginState {
    const s = this.perOriginInfo[origin];
    if (s) {
      return s;
    }
    const ns = (this.perOriginInfo[origin] = new OriginState());
    return ns;
  }

  /**
   * Apply throttling to a request.
   *
   * @returns whether the request should be throttled.
   */
  applyThrottle(requestUrl: string): boolean {
    const origin = new URL(requestUrl).origin;
    return this.getState(origin).applyThrottle();
  }
}
