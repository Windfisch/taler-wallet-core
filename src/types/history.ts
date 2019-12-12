import { Timestamp } from "./walletTypes";

/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

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
 * Type and schema definitions for the wallet's history.
 */

/**
 * Activity history record.
 */
export interface HistoryEvent {
  /**
   * Type of the history event.
   */
  type: string;

  /**
   * Time when the activity was recorded.
   */
  timestamp: Timestamp;

  /**
   * Details used when rendering the history record.
   */
  detail: any;

  /**
   * Set to 'true' if the event has been explicitly created,
   * and set to 'false' if the event has been derived from the
   * state of the database.
   */
  explicit: boolean;
}


export interface HistoryQuery {
  /**
   * Verbosity of history events.
   * Level 0: Only withdraw, pay, tip and refund events.
   * Level 1: All events.
   */
  level: number;
}