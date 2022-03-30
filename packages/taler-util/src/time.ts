/*
 This file is part of GNU Taler
 (C) 2017-2019 Taler Systems S.A.

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
 * Helpers for relative and absolute time.
 */

/**
 * Imports.
 */
import { Codec, renderContext, Context } from "./codec.js";

export interface AbsoluteTime {
  /**
   * Timestamp in milliseconds.
   */
  readonly t_ms: number | "never";
}

export interface TalerProtocolTimestamp {
  readonly t_s: number | "never";
}

export namespace TalerProtocolTimestamp {
  export function now(): TalerProtocolTimestamp {
    return AbsoluteTime.toTimestamp(AbsoluteTime.now());
  }

  export function zero(): TalerProtocolTimestamp {
    return {
      t_s: 0,
    };
  }

  export function never(): TalerProtocolTimestamp {
    return {
      t_s: "never",
    };
  }

  export function fromSeconds(s: number): TalerProtocolTimestamp {
    return {
      t_s: s,
    };
  }
}

export interface Duration {
  /**
   * Duration in milliseconds.
   */
  readonly d_ms: number | "forever";
}

export interface TalerProtocolDuration {
  readonly d_us: number | "forever";
}

let timeshift = 0;

export function setDangerousTimetravel(dt: number): void {
  timeshift = dt;
}

export namespace Duration {
  export function getRemaining(
    deadline: AbsoluteTime,
    now = AbsoluteTime.now(),
  ): Duration {
    if (deadline.t_ms === "never") {
      return { d_ms: "forever" };
    }
    if (now.t_ms === "never") {
      throw Error("invalid argument for 'now'");
    }
    if (deadline.t_ms < now.t_ms) {
      return { d_ms: 0 };
    }
    return { d_ms: deadline.t_ms - now.t_ms };
  }
  export function toIntegerYears(d: Duration): number {
    if (typeof d.d_ms !== "number") {
      throw Error("infinite duration");
    }
    return Math.ceil(d.d_ms / 1000 / 60 / 60 / 24 / 365);
  }
  export const fromSpec = durationFromSpec;
  export function getForever(): Duration {
    return { d_ms: "forever" };
  }
  export function getZero(): Duration {
    return { d_ms: 0 };
  }
  export function fromTalerProtocolDuration(
    d: TalerProtocolDuration,
  ): Duration {
    if (d.d_us === "forever") {
      return {
        d_ms: "forever",
      };
    }
    return {
      d_ms: d.d_us / 1000,
    };
  }
  export function toTalerProtocolDuration(d: Duration): TalerProtocolDuration {
    if (d.d_ms === "forever") {
      return {
        d_us: "forever",
      };
    }
    return {
      d_us: d.d_ms * 1000,
    };
  }
}

export namespace AbsoluteTime {
  export function now(): AbsoluteTime {
    return {
      t_ms: new Date().getTime() + timeshift,
    };
  }

  export function never(): AbsoluteTime {
    return {
      t_ms: "never",
    };
  }

  export function cmp(t1: AbsoluteTime, t2: AbsoluteTime): number {
    if (t1.t_ms === "never") {
      if (t2.t_ms === "never") {
        return 0;
      }
      return 1;
    }
    if (t2.t_ms === "never") {
      return -1;
    }
    if (t1.t_ms == t2.t_ms) {
      return 0;
    }
    if (t1.t_ms > t2.t_ms) {
      return 1;
    }
    return -1;
  }

  export function min(t1: AbsoluteTime, t2: AbsoluteTime): AbsoluteTime {
    if (t1.t_ms === "never") {
      return { t_ms: t2.t_ms };
    }
    if (t2.t_ms === "never") {
      return { t_ms: t2.t_ms };
    }
    return { t_ms: Math.min(t1.t_ms, t2.t_ms) };
  }

  export function max(t1: AbsoluteTime, t2: AbsoluteTime): AbsoluteTime {
    if (t1.t_ms === "never") {
      return { t_ms: "never" };
    }
    if (t2.t_ms === "never") {
      return { t_ms: "never" };
    }
    return { t_ms: Math.max(t1.t_ms, t2.t_ms) };
  }

  export function difference(t1: AbsoluteTime, t2: AbsoluteTime): Duration {
    if (t1.t_ms === "never") {
      return { d_ms: "forever" };
    }
    if (t2.t_ms === "never") {
      return { d_ms: "forever" };
    }
    return { d_ms: Math.abs(t1.t_ms - t2.t_ms) };
  }

  export function isExpired(t: AbsoluteTime) {
    return cmp(t, now()) <= 0;
  }

  export function fromTimestamp(t: TalerProtocolTimestamp): AbsoluteTime {
    if (t.t_s === "never") {
      return { t_ms: "never" };
    }
    return {
      t_ms: t.t_s * 1000,
    };
  }

  export function toTimestamp(at: AbsoluteTime): TalerProtocolTimestamp {
    if (at.t_ms === "never") {
      return { t_s: "never" };
    }
    return {
      t_s: Math.floor(at.t_ms / 1000),
    };
  }

  export function isBetween(
    t: AbsoluteTime,
    start: AbsoluteTime,
    end: AbsoluteTime,
  ): boolean {
    if (cmp(t, start) < 0) {
      return false;
    }
    if (cmp(t, end) > 0) {
      return false;
    }
    return true;
  }

  export function toIsoString(t: AbsoluteTime): string {
    if (t.t_ms === "never") {
      return "<never>";
    } else {
      return new Date(t.t_ms).toISOString();
    }
  }

  export function addDuration(t1: AbsoluteTime, d: Duration): AbsoluteTime {
    if (t1.t_ms === "never" || d.d_ms === "forever") {
      return { t_ms: "never" };
    }
    return { t_ms: t1.t_ms + d.d_ms };
  }

  export function subtractDuraction(
    t1: AbsoluteTime,
    d: Duration,
  ): AbsoluteTime {
    if (t1.t_ms === "never") {
      return { t_ms: "never" };
    }
    if (d.d_ms === "forever") {
      return { t_ms: 0 };
    }
    return { t_ms: Math.max(0, t1.t_ms - d.d_ms) };
  }

  export function stringify(t: AbsoluteTime): string {
    if (t.t_ms === "never") {
      return "never";
    }
    return new Date(t.t_ms).toISOString();
  }
}

const SECONDS = 1000;
const MINUTES = SECONDS * 60;
const HOURS = MINUTES * 60;
const DAYS = HOURS * 24;
const MONTHS = DAYS * 30;
const YEARS = DAYS * 365;

export function durationFromSpec(spec: {
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
  months?: number;
  years?: number;
}): Duration {
  let d_ms = 0;
  d_ms += (spec.seconds ?? 0) * SECONDS;
  d_ms += (spec.minutes ?? 0) * MINUTES;
  d_ms += (spec.hours ?? 0) * HOURS;
  d_ms += (spec.days ?? 0) * DAYS;
  d_ms += (spec.months ?? 0) * MONTHS;
  d_ms += (spec.years ?? 0) * YEARS;
  return { d_ms };
}

export function durationMin(d1: Duration, d2: Duration): Duration {
  if (d1.d_ms === "forever") {
    return { d_ms: d2.d_ms };
  }
  if (d2.d_ms === "forever") {
    return { d_ms: d2.d_ms };
  }
  return { d_ms: Math.min(d1.d_ms, d2.d_ms) };
}

export function durationMax(d1: Duration, d2: Duration): Duration {
  if (d1.d_ms === "forever") {
    return { d_ms: "forever" };
  }
  if (d2.d_ms === "forever") {
    return { d_ms: "forever" };
  }
  return { d_ms: Math.max(d1.d_ms, d2.d_ms) };
}

export function durationMul(d: Duration, n: number): Duration {
  if (d.d_ms === "forever") {
    return { d_ms: "forever" };
  }
  return { d_ms: Math.round(d.d_ms * n) };
}

export function durationAdd(d1: Duration, d2: Duration): Duration {
  if (d1.d_ms === "forever" || d2.d_ms === "forever") {
    return { d_ms: "forever" };
  }
  return { d_ms: d1.d_ms + d2.d_ms };
}

export const codecForTimestamp: Codec<TalerProtocolTimestamp> = {
  decode(x: any, c?: Context): TalerProtocolTimestamp {
    // Compatibility, should be removed soon.
    const t_ms = x.t_ms;
    if (typeof t_ms === "string") {
      if (t_ms === "never") {
        return { t_s: "never" };
      }
    } else if (typeof t_ms === "number") {
      return { t_s: Math.floor(t_ms / 1000) };
    }
    const t_s = x.t_s;
    if (typeof t_s === "string") {
      if (t_s === "never") {
        return { t_s: "never" };
      }
      throw Error(`expected timestamp at ${renderContext(c)}`);
    }
    if (typeof t_s === "number") {
      return { t_s };
    }
    throw Error(`expected timestamp at ${renderContext(c)}`);
  },
};

export const codecForDuration: Codec<TalerProtocolDuration> = {
  decode(x: any, c?: Context): TalerProtocolDuration {
    const d_us = x.d_us;
    if (typeof d_us === "string") {
      if (d_us === "forever") {
        return { d_us: "forever" };
      }
      throw Error(`expected duration at ${renderContext(c)}`);
    }
    if (typeof d_us === "number") {
      return { d_us };
    }
    throw Error(`expected duration at ${renderContext(c)}`);
  },
};
