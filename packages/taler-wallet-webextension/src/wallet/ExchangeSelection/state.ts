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


import { AbsoluteTime, AmountJson, Amounts, DenominationInfo, TalerProtocolTimestamp } from "@gnu-taler/taler-util";
import { useState } from "preact/hooks";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import * as wxApi from "../../wxApi.js";
import { FeeDescription, FeeDescriptionPair, OperationMap, Props, State } from "./index.js";

export function useComponentState(
  { onCancel, onSelection, currency }: Props,
  api: typeof wxApi,
): State {
  const initialValue = 0
  const [value, setValue] = useState(String(initialValue));

  const hook = useAsyncAsHook(async () => {
    const { exchanges } = await api.listExchanges()

    const selectedIdx = parseInt(value, 10)
    const selectedExchange = exchanges.length == 0 ? undefined : exchanges[selectedIdx]
    const selected = !selectedExchange ? undefined : await api.getExchangeDetailedInfo(selectedExchange.exchangeBaseUrl)

    const initialExchange = selectedIdx === initialValue ? undefined : exchanges[initialValue]
    const original = !initialExchange ? undefined : await api.getExchangeDetailedInfo(initialExchange.exchangeBaseUrl)
    return { exchanges, selected, original }
  });

  if (!hook) {
    return {
      status: "loading",
      error: undefined,
    }
  }
  if (hook.hasError) {
    return {
      status: "loading-uri",
      error: hook,
    };
  }

  const { exchanges, selected, original } = hook.response;

  if (!selected) {
    //!selected <=> exchanges.length === 0
    return {
      status: "no-exchanges",
      error: undefined
    }
  }

  let nextFeeUpdate = TalerProtocolTimestamp.never();

  nextFeeUpdate = Object.values(selected.wireInfo.feesForType).reduce(
    (prev, cur) => {
      return cur.reduce((p, c) => nearestTimestamp(p, c.endStamp), prev);
    },
    nextFeeUpdate,
  );

  nextFeeUpdate = selected.denominations.reduce((prev, cur) => {
    return [
      cur.stampExpireWithdraw,
      cur.stampExpireLegal,
      cur.stampExpireDeposit,
    ].reduce(nearestTimestamp, prev);
  }, nextFeeUpdate);

  const timeline: OperationMap<FeeDescription[]> = {
    deposit: createDenominationTimeline(
      selected.denominations,
      "stampExpireDeposit",
      "feeDeposit",
    ),
    refresh: createDenominationTimeline(
      selected.denominations,
      "stampExpireWithdraw",
      "feeRefresh",
    ),
    refund: createDenominationTimeline(
      selected.denominations,
      "stampExpireWithdraw",
      "feeRefund",
    ),
    withdraw: createDenominationTimeline(
      selected.denominations,
      "stampExpireWithdraw",
      "feeWithdraw",
    ),
  };

  const exchangeMap = exchanges.reduce((prev, cur, idx) => ({ ...prev, [cur.exchangeBaseUrl]: String(idx) }), {} as Record<string, string>)

  if (!original) {
    // !original <=> selected == original
    return {
      status: "ready",
      exchanges: {
        list: exchangeMap,
        value: value,
        onChange: async (v) => {
          setValue(v)
        }
      },
      error: undefined,
      nextFeeUpdate: AbsoluteTime.fromTimestamp(nextFeeUpdate),
      onClose: {
        onClick: onCancel
      },
      selected,
      timeline
    }
  }

  const originalTimeline: OperationMap<FeeDescription[]> = {
    deposit: createDenominationTimeline(
      original.denominations,
      "stampExpireDeposit",
      "feeDeposit",
    ),
    refresh: createDenominationTimeline(
      original.denominations,
      "stampExpireWithdraw",
      "feeRefresh",
    ),
    refund: createDenominationTimeline(
      original.denominations,
      "stampExpireWithdraw",
      "feeRefund",
    ),
    withdraw: createDenominationTimeline(
      original.denominations,
      "stampExpireWithdraw",
      "feeWithdraw",
    ),
  };
  const pairTimeline: OperationMap<FeeDescription[]> = {
    deposit: createDenominationPairTimeline(timeline.deposit, originalTimeline.deposit),
    refresh: createDenominationPairTimeline(timeline.refresh, originalTimeline.refresh),
    refund: createDenominationPairTimeline(timeline.refund, originalTimeline.refund),
    withdraw: createDenominationPairTimeline(timeline.withdraw, originalTimeline.withdraw),
  }

  return {
    status: "comparing",
    exchanges: {
      list: exchangeMap,
      value: value,
      onChange: async (v) => {
        setValue(v)
      }
    },
    error: undefined,
    nextFeeUpdate: AbsoluteTime.fromTimestamp(nextFeeUpdate),
    onReset: {
      onClick: async () => {
        setValue(String(initialValue))
      }
    },
    onSelect: {
      onClick: async () => {
        onSelection(selected.exchangeBaseUrl)
      }
    },
    selected,
    pairTimeline,
  }

}

function nearestTimestamp(
  first: TalerProtocolTimestamp,
  second: TalerProtocolTimestamp,
): TalerProtocolTimestamp {
  const f = AbsoluteTime.fromTimestamp(first);
  const s = AbsoluteTime.fromTimestamp(second);
  const a = AbsoluteTime.min(f, s);
  return AbsoluteTime.toTimestamp(a);
}



export interface TimePoint {
  type: "start" | "end";
  moment: AbsoluteTime;
  denom: DenominationInfo;
}

/**
 * Given a list of denominations with the same value and same period of time:
 * return the one that will be used.
 * The best denomination is the one that will minimize the fee cost.
 *
 * @param list denominations of same value
 * @returns
 */
function selectBestForOverlappingDenominations(
  list: DenominationInfo[],
): DenominationInfo | undefined {
  let minDeposit: DenominationInfo | undefined = undefined;
  list.forEach((e) => {
    if (minDeposit === undefined) {
      minDeposit = e;
      return;
    }
    if (Amounts.cmp(minDeposit.feeDeposit, e.feeDeposit) > -1) {
      minDeposit = e;
    }
  });
  return minDeposit;
}

type PropsWithReturnType<T extends object, F> = Exclude<
  {
    [K in keyof T]: T[K] extends F ? K : never;
  }[keyof T],
  undefined
>;

/**
 * Takes two list and create one with one timeline.
 * For any element in the position "p" on the left or right "list", then
 * list[p].until should be equal to list[p+1].from
 * 
 * @see {createDenominationTimeline}
 * 
 * @param left list denominations @type {FeeDescription}
 * @param right list denominations @type {FeeDescription}
 * @returns list of pairs for the same time
 */
export function createDenominationPairTimeline(left: FeeDescription[], right: FeeDescription[]): FeeDescriptionPair[] {
  //both list empty, discarded
  if (left.length === 0 && right.length === 0) return [];

  const pairList: FeeDescriptionPair[] = [];

  let li = 0;
  let ri = 0;

  while (li < left.length && ri < right.length) {
    const currentValue = Amounts.cmp(left[li].value, right[ri].value) < 0 ? left[li].value : right[ri].value;

    let ll = 0 //left length (until next value)
    while (li + ll < left.length && Amounts.cmp(left[li + ll].value, currentValue) === 0) {
      ll++
    }
    let rl = 0 //right length (until next value)
    while (ri + rl < right.length && Amounts.cmp(right[ri + rl].value, currentValue) === 0) {
      rl++
    }
    const leftIsEmpty = ll === 0
    const rightIsEmpty = rl === 0
    //check which start after, add gap so both list starts at the same time
    // one list may be empty
    const leftStarts: AbsoluteTime =
      leftIsEmpty ? { t_ms: "never" } : left[li].from;
    const rightStarts: AbsoluteTime =
      rightIsEmpty ? { t_ms: "never" } : right[ri].from;

    //first time cut is the smallest time
    let timeCut: AbsoluteTime = leftStarts;

    if (AbsoluteTime.cmp(leftStarts, rightStarts) < 0) {
      const ends =
        rightIsEmpty ? left[li + ll - 1].until : right[0].from;

      right.splice(ri, 0, {
        from: leftStarts,
        until: ends,
        value: left[li].value,
      });
      rl++;

      timeCut = leftStarts
    }
    if (AbsoluteTime.cmp(leftStarts, rightStarts) > 0) {
      const ends =
        leftIsEmpty ? right[ri + rl - 1].until : left[0].from;

      left.splice(li, 0, {
        from: rightStarts,
        until: ends,
        value: right[ri].value,
      });
      ll++;

      timeCut = rightStarts
    }

    //check which ends sooner, add gap so both list ends at the same time
    // here both list are non empty
    const leftEnds: AbsoluteTime = left[li + ll - 1].until;
    const rightEnds: AbsoluteTime = right[ri + rl - 1].until;

    if (AbsoluteTime.cmp(leftEnds, rightEnds) > 0) {
      right.splice(ri + rl, 0, {
        from: rightEnds,
        until: leftEnds,
        value: left[0].value,
      });
      rl++;

    }
    if (AbsoluteTime.cmp(leftEnds, rightEnds) < 0) {
      left.splice(li + ll, 0, {
        from: leftEnds,
        until: rightEnds,
        value: right[0].value,
      });
      ll++;
    }

    //now both lists are non empty and (starts,ends) at the same time
    while (li < left.length && ri < right.length && Amounts.cmp(left[li].value, right[ri].value) === 0) {

      if (AbsoluteTime.cmp(left[li].from, timeCut) !== 0 && AbsoluteTime.cmp(right[ri].from, timeCut) !== 0) {
        // timeCut comes from the latest "until" (expiration from the previous)
        // and this value comes from the latest left or right
        // it should be the same as the "from" from one of the latest left or right
        // otherwise it means that there is missing a gap object in the middle
        // the list is not complete and the behavior is undefined
        throw Error('one of the list is not completed: list[i].until !== list[i+1].from')
      }

      pairList.push({
        left: left[li].fee,
        right: right[ri].fee,
        from: timeCut,
        until: AbsoluteTime.never(),
        value: currentValue,
      });

      if (left[li].until.t_ms === right[ri].until.t_ms) {
        timeCut = left[li].until;
        ri++;
        li++;
      } else if (left[li].until.t_ms < right[ri].until.t_ms) {
        timeCut = left[li].until;
        li++;
      } else if (left[li].until.t_ms > right[ri].until.t_ms) {
        timeCut = right[ri].until;
        ri++;
      }
      pairList[pairList.length - 1].until = timeCut

      if (li < left.length && Amounts.cmp(left[li].value, pairList[pairList.length - 1].value) !== 0) {
        //value changed, should break
        //this if will catch when both (left and right) change at the same time
        //if just one side changed it will catch in the while condition
        break;
      }

    }

  }
  //one of the list left or right can still have elements
  if (li < left.length) {
    let timeCut = pairList.length > 0 && Amounts.cmp(pairList[pairList.length - 1].value, left[li].value) === 0 ? pairList[pairList.length - 1].until : left[li].from;
    while (li < left.length) {
      pairList.push({
        left: left[li].fee,
        right: undefined,
        from: timeCut,
        until: left[li].until,
        value: left[li].value,
      })
      timeCut = left[li].until
      li++;
    }
  }
  if (ri < right.length) {
    let timeCut = pairList.length > 0 && Amounts.cmp(pairList[pairList.length - 1].value, right[ri].value) === 0 ? pairList[pairList.length - 1].until : right[ri].from;
    while (ri < right.length) {
      pairList.push({
        right: right[ri].fee,
        left: undefined,
        from: timeCut,
        until: right[ri].until,
        value: right[ri].value,
      })
      timeCut = right[ri].until
      ri++;
    }
  }
  return pairList
}

/**
 * Create a usage timeline with the denominations given.
 *
 * If there are multiple denominations that can be used, the list will
 * contain the one that minimize the fee cost. @see selectBestForOverlappingDenominations
 *
 * @param list list of denominations
 * @param periodProp property of element of the list that will be used as end of the usage period
 * @param feeProp property of the element of the list that will be used as fee reference
 * @returns  list of @type {FeeDescription} sorted by usage period
 */
export function createDenominationTimeline(
  list: DenominationInfo[],
  periodProp: PropsWithReturnType<DenominationInfo, TalerProtocolTimestamp>,
  feeProp: PropsWithReturnType<DenominationInfo, AmountJson>,
): FeeDescription[] {
  const points = list
    .reduce((ps, denom) => {
      //exclude denoms with bad configuration
      if (denom.stampStart.t_s >= denom[periodProp].t_s) {
        throw Error(`denom ${denom.denomPubHash} has start after the end`);
        // return ps;
      }
      ps.push({
        type: "start",
        moment: AbsoluteTime.fromTimestamp(denom.stampStart),
        denom,
      });
      ps.push({
        type: "end",
        moment: AbsoluteTime.fromTimestamp(denom[periodProp]),
        denom,
      });
      return ps;
    }, [] as TimePoint[])
    .sort((a, b) => {
      const v = Amounts.cmp(a.denom.value, b.denom.value);
      if (v != 0) return v;
      const t = AbsoluteTime.cmp(a.moment, b.moment);
      if (t != 0) return t;
      if (a.type === b.type) return 0;
      return a.type === "start" ? 1 : -1;
    });

  const activeAtTheSameTime: DenominationInfo[] = [];
  return points.reduce((result, cursor, idx) => {
    const hash = cursor.denom.denomPubHash;
    if (!hash)
      throw Error(
        `denomination without hash ${JSON.stringify(
          cursor.denom,
          undefined,
          2,
        )}`,
      );

    let prev = result.length > 0 ? result[result.length - 1] : undefined;
    const prevHasSameValue =
      prev && Amounts.cmp(prev.value, cursor.denom.value) === 0;
    if (prev) {
      if (prevHasSameValue) {
        prev.until = cursor.moment;

        if (prev.from.t_ms === prev.until.t_ms) {
          result.pop();
          prev = result[result.length - 1];
        }
      } else {
        // the last end adds a gap that we have to remove
        result.pop();
      }
    }

    //update the activeAtTheSameTime list
    if (cursor.type === "end") {
      const loc = activeAtTheSameTime.findIndex((v) => v.denomPubHash === hash);
      if (loc === -1) {
        throw Error(`denomination ${hash} has an end but no start`);
      }
      activeAtTheSameTime.splice(loc, 1);
    } else if (cursor.type === "start") {
      activeAtTheSameTime.push(cursor.denom);
    } else {
      const exhaustiveCheck: never = cursor.type;
      throw new Error(`not TimePoint defined for type: ${exhaustiveCheck}`);
    }

    if (idx == points.length - 1) {
      //this is the last element in the list, prevent adding
      //a gap in the end
      if (cursor.type !== "end") {
        throw Error(
          `denomination ${hash} starts after ending or doesn't have an ending`,
        );
      }
      if (activeAtTheSameTime.length > 0) {
        throw Error(
          `there are ${activeAtTheSameTime.length} denominations without ending`,
        );
      }
      return result;
    }

    const current = selectBestForOverlappingDenominations(activeAtTheSameTime);

    if (current) {
      if (
        prev === undefined || //is the first
        !prev.fee || //is a gap
        Amounts.cmp(prev.fee, current[feeProp]) !== 0 // prev has the same fee
      ) {
        result.push({
          value: cursor.denom.value,
          from: cursor.moment,
          until: AbsoluteTime.never(), //not yet known
          fee: current[feeProp],
        });
      } else {
        prev.until = cursor.moment;
      }
    } else {
      result.push({
        value: cursor.denom.value,
        from: cursor.moment,
        until: AbsoluteTime.never(), //not yet known
      });
    }

    return result;
  }, [] as FeeDescription[]);
}
