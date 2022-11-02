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
 * Helpers for dealing with retry timeouts.
 */

/**
 * Imports.
 */
import {
  AbsoluteTime,
  Duration,
  TalerErrorDetail,
} from "@gnu-taler/taler-util";
import {
  BackupProviderRecord,
  DepositGroupRecord,
  ExchangeRecord,
  PurchaseRecord,
  RecoupGroupRecord,
  RefreshGroupRecord,
  TipRecord,
  WalletStoresV1,
  WithdrawalGroupRecord,
} from "../db.js";
import { TalerError } from "../errors.js";
import { InternalWalletState } from "../internal-wallet-state.js";
import { PendingTaskType } from "../pending-types.js";
import { GetReadWriteAccess } from "./query.js";

export enum OperationAttemptResultType {
  Finished = "finished",
  Pending = "pending",
  Error = "error",
  Longpoll = "longpoll",
}

export type OperationAttemptResult<TSuccess = unknown, TPending = unknown> =
  | OperationAttemptFinishedResult<TSuccess>
  | OperationAttemptErrorResult
  | OperationAttemptLongpollResult
  | OperationAttemptPendingResult<TPending>;

export namespace OperationAttemptResult {
  export function finishedEmpty(): OperationAttemptResult<unknown, unknown> {
    return {
      type: OperationAttemptResultType.Finished,
      result: undefined,
    };
  }
}

export interface OperationAttemptFinishedResult<T> {
  type: OperationAttemptResultType.Finished;
  result: T;
}

export interface OperationAttemptPendingResult<T> {
  type: OperationAttemptResultType.Pending;
  result: T;
}

export interface OperationAttemptErrorResult {
  type: OperationAttemptResultType.Error;
  errorDetail: TalerErrorDetail;
}

export interface OperationAttemptLongpollResult {
  type: OperationAttemptResultType.Longpoll;
}

export interface RetryInfo {
  firstTry: AbsoluteTime;
  nextRetry: AbsoluteTime;
  retryCounter: number;
}

export interface RetryPolicy {
  readonly backoffDelta: Duration;
  readonly backoffBase: number;
  readonly maxTimeout: Duration;
}

const defaultRetryPolicy: RetryPolicy = {
  backoffBase: 1.5,
  backoffDelta: Duration.fromSpec({ seconds: 1 }),
  maxTimeout: Duration.fromSpec({ minutes: 2 }),
};

function updateTimeout(
  r: RetryInfo,
  p: RetryPolicy = defaultRetryPolicy,
): void {
  const now = AbsoluteTime.now();
  if (now.t_ms === "never") {
    throw Error("assertion failed");
  }
  if (p.backoffDelta.d_ms === "forever") {
    r.nextRetry = { t_ms: "never" };
    return;
  }

  const nextIncrement =
    p.backoffDelta.d_ms * Math.pow(p.backoffBase, r.retryCounter);

  const t =
    now.t_ms +
    (p.maxTimeout.d_ms === "forever"
      ? nextIncrement
      : Math.min(p.maxTimeout.d_ms, nextIncrement));
  r.nextRetry = { t_ms: t };
}

export namespace RetryInfo {
  export function getDuration(
    r: RetryInfo | undefined,
    p: RetryPolicy = defaultRetryPolicy,
  ): Duration {
    if (!r) {
      // If we don't have any retry info, run immediately.
      return { d_ms: 0 };
    }
    if (p.backoffDelta.d_ms === "forever") {
      return { d_ms: "forever" };
    }
    const t = p.backoffDelta.d_ms * Math.pow(p.backoffBase, r.retryCounter);
    return {
      d_ms:
        p.maxTimeout.d_ms === "forever" ? t : Math.min(p.maxTimeout.d_ms, t),
    };
  }

  export function reset(p: RetryPolicy = defaultRetryPolicy): RetryInfo {
    const now = AbsoluteTime.now();
    const info = {
      firstTry: now,
      nextRetry: now,
      retryCounter: 0,
    };
    updateTimeout(info, p);
    return info;
  }

  export function increment(
    r: RetryInfo | undefined,
    p: RetryPolicy = defaultRetryPolicy,
  ): RetryInfo {
    if (!r) {
      return reset(p);
    }
    const r2 = { ...r };
    r2.retryCounter++;
    updateTimeout(r2, p);
    return r2;
  }
}

export namespace RetryTags {
  export function forWithdrawal(wg: WithdrawalGroupRecord): string {
    return `${PendingTaskType.Withdraw}:${wg.withdrawalGroupId}`;
  }
  export function forExchangeUpdate(exch: ExchangeRecord): string {
    return `${PendingTaskType.ExchangeUpdate}:${exch.baseUrl}`;
  }
  export function forExchangeUpdateFromUrl(exchBaseUrl: string): string {
    return `${PendingTaskType.ExchangeUpdate}:${exchBaseUrl}`;
  }
  export function forExchangeCheckRefresh(exch: ExchangeRecord): string {
    return `${PendingTaskType.ExchangeCheckRefresh}:${exch.baseUrl}`;
  }
  export function forTipPickup(tipRecord: TipRecord): string {
    return `${PendingTaskType.TipPickup}:${tipRecord.walletTipId}`;
  }
  export function forRefresh(refreshGroupRecord: RefreshGroupRecord): string {
    return `${PendingTaskType.Refresh}:${refreshGroupRecord.refreshGroupId}`;
  }
  export function forPay(purchaseRecord: PurchaseRecord): string {
    return `${PendingTaskType.Purchase}:${purchaseRecord.proposalId}`;
  }
  export function forRecoup(recoupRecord: RecoupGroupRecord): string {
    return `${PendingTaskType.Recoup}:${recoupRecord.recoupGroupId}`;
  }
  export function forDeposit(depositRecord: DepositGroupRecord): string {
    return `${PendingTaskType.Deposit}:${depositRecord.depositGroupId}`;
  }
  export function forBackup(backupRecord: BackupProviderRecord): string {
    return `${PendingTaskType.Backup}:${backupRecord.baseUrl}`;
  }
  export function byPaymentProposalId(proposalId: string): string {
    return `${PendingTaskType.Purchase}:${proposalId}`;
  }
}

export async function scheduleRetryInTx(
  ws: InternalWalletState,
  tx: GetReadWriteAccess<{
    operationRetries: typeof WalletStoresV1.operationRetries;
  }>,
  opId: string,
  errorDetail?: TalerErrorDetail,
): Promise<void> {
  let retryRecord = await tx.operationRetries.get(opId);
  if (!retryRecord) {
    retryRecord = {
      id: opId,
      retryInfo: RetryInfo.reset(),
    };
    if (errorDetail) {
      retryRecord.lastError = errorDetail;
    }
  } else {
    retryRecord.retryInfo = RetryInfo.increment(retryRecord.retryInfo);
    if (errorDetail) {
      retryRecord.lastError = errorDetail;
    } else {
      delete retryRecord.lastError;
    }
  }
  await tx.operationRetries.put(retryRecord);
}

export async function scheduleRetry(
  ws: InternalWalletState,
  opId: string,
  errorDetail?: TalerErrorDetail,
): Promise<void> {
  return await ws.db
    .mktx((x) => [x.operationRetries])
    .runReadWrite(async (tx) => {
      tx.operationRetries;
      scheduleRetryInTx(ws, tx, opId, errorDetail);
    });
}

/**
 * Run an operation handler, expect a success result and extract the success value.
 */
export async function unwrapOperationHandlerResultOrThrow<T>(
  res: OperationAttemptResult<T>,
): Promise<T> {
  switch (res.type) {
    case OperationAttemptResultType.Finished:
      return res.result;
    case OperationAttemptResultType.Error:
      throw TalerError.fromUncheckedDetail(res.errorDetail);
    default:
      throw Error(`unexpected operation result (${res.type})`);
  }
}
