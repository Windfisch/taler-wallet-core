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
import { AbsoluteTime, Duration } from "@gnu-taler/taler-util";

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
  backoffDelta: { d_ms: 200 },
  maxTimeout: { d_ms: 6000 },
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
