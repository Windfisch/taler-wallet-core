/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

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
import { TalerErrorDetail } from "@gnu-taler/taler-util";

/**
 * Common interface for all crypto workers.
 */
export interface CryptoWorker {
  postMessage(message: any): void;
  terminate(): void;
  onmessage: ((m: any) => void) | undefined;
  onerror: ((m: any) => void) | undefined;
}

/**
 * Type of requests sent to the crypto worker.
 */
export type CryptoWorkerRequestMessage = {
  /**
   * Operation ID to correlate request with the response.
   */
  id: number;

  /**
   * Operation to execute.
   */
  operation: string;

  /**
   * Operation-specific request payload.
   */
  req: any;
};

/**
 * Type of messages sent back by the crypto worker.
 */
export type CryptoWorkerResponseMessage =
  | {
      type: "success";
      id: number;
      result: any;
    }
  | {
      type: "error";
      id?: number;
      error: TalerErrorDetail;
    };
