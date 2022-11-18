/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import {
  AbsoluteTime,
  AmountJson,
  Amounts,
  AmountString,
  DenominationInfo,
  FeeDescription,
  FeeDescriptionPair,
  TalerProtocolTimestamp,
  TimePoint,
  WireFee,
} from "@gnu-taler/taler-util";

/**
 * Given a list of denominations with the same value and same period of time:
 * return the one that will be used.
 * The best denomination is the one that will minimize the fee cost.
 *
 * @param list denominations of same value
 * @returns
 */
export function selectBestForOverlappingDenominations<
  T extends DenominationInfo,
>(list: T[]): T | undefined {
  let minDeposit: DenominationInfo | undefined = undefined;
  //TODO: improve denomination selection, this is a trivial implementation
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

export function selectMinimumFee<T extends { fee: AmountString }>(
  list: T[],
): T | undefined {
  let minFee: T | undefined = undefined;
  //TODO: improve denomination selection, this is a trivial implementation
  list.forEach((e) => {
    if (minFee === undefined) {
      minFee = e;
      return;
    }
    if (Amounts.cmp(minFee.fee, e.fee) > -1) {
      minFee = e;
    }
  });
  return minFee;
}

type PropsWithReturnType<T extends object, F> = Exclude<
  {
    [K in keyof T]: T[K] extends F ? K : never;
  }[keyof T],
  undefined
>;

/**
 * Takes two timelines and create one to compare them.
 *
 * For both lists the next condition should be true:
 * for any element in the position "idx" then
 * list[idx].until === list[idx+1].from
 *
 * @see {createTimeline}
 *
 * @param left list denominations @type {FeeDescription}
 * @param right list denominations @type {FeeDescription}
 * @returns list of pairs for the same time
 */
export function createPairTimeline(
  left: FeeDescription[],
  right: FeeDescription[],
): FeeDescriptionPair[] {
  //FIXME: we need to create a copy of the array because 
  //this algorithm is using splice, remove splice and 
  //remove this array duplication
  left = [...left]
  right = [...right]

  //both list empty, discarded
  if (left.length === 0 && right.length === 0) return [];

  const pairList: FeeDescriptionPair[] = [];

  let li = 0; //left list index
  let ri = 0; //right list index

  while (li < left.length && ri < right.length) {
    const currentGroup = Number.parseFloat(left[li].group) < Number.parseFloat(right[ri].group) ? left[li].group : right[ri].group;
    const lgs = li; //left group start index
    const rgs = ri; //right group start index

    let lgl = 0; //left group length (until next value)
    while (li + lgl < left.length && left[li + lgl].group === currentGroup) {
      lgl++;
    }
    let rgl = 0; //right group length (until next value)
    while (ri + rgl < right.length && right[ri + rgl].group === currentGroup) {
      rgl++;
    }
    const leftGroupIsEmpty = lgl === 0;
    const rightGroupIsEmpty = rgl === 0;
    //check which start after, add gap so both list starts at the same time
    // one list may be empty
    const leftStartTime: AbsoluteTime = leftGroupIsEmpty
      ? { t_ms: "never" }
      : left[li].from;
    const rightStartTime: AbsoluteTime = rightGroupIsEmpty
      ? { t_ms: "never" }
      : right[ri].from;

    //first time cut is the smallest time
    let timeCut: AbsoluteTime = leftStartTime;

    if (AbsoluteTime.cmp(leftStartTime, rightStartTime) < 0) {
      const ends = rightGroupIsEmpty ? left[li + lgl - 1].until : right[0].from;

      right.splice(ri, 0, {
        from: leftStartTime,
        until: ends,
        group: left[li].group,
      });
      rgl++;

      timeCut = leftStartTime;
    }
    if (AbsoluteTime.cmp(leftStartTime, rightStartTime) > 0) {
      const ends = leftGroupIsEmpty ? right[ri + rgl - 1].until : left[0].from;

      left.splice(li, 0, {
        from: rightStartTime,
        until: ends,
        group: right[ri].group,
      });
      lgl++;

      timeCut = rightStartTime;
    }

    //check which ends sooner, add gap so both list ends at the same time
    // here both list are non empty
    const leftEndTime: AbsoluteTime = left[li + lgl - 1].until;
    const rightEndTime: AbsoluteTime = right[ri + rgl - 1].until;

    if (AbsoluteTime.cmp(leftEndTime, rightEndTime) > 0) {
      right.splice(ri + rgl, 0, {
        from: rightEndTime,
        until: leftEndTime,
        group: left[0].group,
      });
      rgl++;
    }
    if (AbsoluteTime.cmp(leftEndTime, rightEndTime) < 0) {
      left.splice(li + lgl, 0, {
        from: leftEndTime,
        until: rightEndTime,
        group: right[0].group,
      });
      lgl++;
    }

    //now both lists are non empty and (starts,ends) at the same time
    while (li < (lgs + lgl) && ri < (rgs + rgl)) {
      if (
        AbsoluteTime.cmp(left[li].from, timeCut) !== 0 &&
        AbsoluteTime.cmp(right[ri].from, timeCut) !== 0
      ) {
        // timeCut comes from the latest "until" (expiration from the previous)
        // and this value comes from the latest left or right
        // it should be the same as the "from" from one of the latest left or right
        // otherwise it means that there is missing a gap object in the middle
        // the list is not complete and the behavior is undefined
        throw Error(
          "one of the list is not completed: list[i].until !== list[i+1].from",
        );
      }

      pairList.push({
        left: left[li].fee,
        right: right[ri].fee,
        from: timeCut,
        until: AbsoluteTime.never(),
        group: currentGroup,
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
      pairList[pairList.length - 1].until = timeCut;

      // if (
      //   (li < left.length && left[li].group !== currentGroup) ||
      //   (ri < right.length && right[ri].group !== currentGroup)
      // ) {
      //   //value changed, should break
      //   //this if will catch when both (left and right) change at the same time
      //   //if just one side changed it will catch in the while condition
      //   break;
      // }
    }
  }
  //one of the list left or right can still have elements
  if (li < left.length) {
    let timeCut =
      pairList.length > 0 &&
        pairList[pairList.length - 1].group === left[li].group
        ? pairList[pairList.length - 1].until
        : left[li].from;
    while (li < left.length) {
      pairList.push({
        left: left[li].fee,
        right: undefined,
        from: timeCut,
        until: left[li].until,
        group: left[li].group,
      });
      timeCut = left[li].until;
      li++;
    }
  }
  if (ri < right.length) {
    let timeCut =
      pairList.length > 0 &&
        pairList[pairList.length - 1].group === right[ri].group
        ? pairList[pairList.length - 1].until
        : right[ri].from;
    while (ri < right.length) {
      pairList.push({
        right: right[ri].fee,
        left: undefined,
        from: timeCut,
        until: right[ri].until,
        group: right[ri].group,
      });
      timeCut = right[ri].until;
      ri++;
    }
  }
  return pairList;
}

/**
 * Create a usage timeline with the entity given.
 *
 * If there are multiple entities that can be used in the same period,
 * the list will contain the one that minimize the fee cost.
 * @see selectBestForOverlappingDenominations
 *
 * @param list list of entities
 * @param idProp property used for identification
 * @param periodStartProp property of element of the list that will be used as start of the usage period
 * @param periodEndProp property of element of the list that will be used as end of the usage period
 * @param feeProp property of the element of the list that will be used as fee reference
 * @param groupProp property of the element of the list that will be used for grouping
 * @returns  list of @type {FeeDescription} sorted by usage period
 */
export function createTimeline<Type extends object>(
  list: Type[],
  idProp: PropsWithReturnType<Type, string>,
  periodStartProp: PropsWithReturnType<Type, TalerProtocolTimestamp>,
  periodEndProp: PropsWithReturnType<Type, TalerProtocolTimestamp>,
  feeProp: PropsWithReturnType<Type, AmountString>,
  groupProp: PropsWithReturnType<Type, string> | undefined,
  selectBestForOverlapping: (l: Type[]) => Type | undefined,
): FeeDescription[] {
  /**
   * First we create a list with with point in the timeline sorted
   * by time and categorized by starting or ending.
   */
  const sortedPointsInTime = list
    .reduce((ps, denom) => {
      //exclude denoms with bad configuration
      const id = denom[idProp] as string;
      const stampStart = denom[periodStartProp] as TalerProtocolTimestamp;
      const stampEnd = denom[periodEndProp] as TalerProtocolTimestamp;
      const fee = denom[feeProp] as AmountJson;
      const group = !groupProp ? "" : (denom[groupProp] as string);

      if (!id) {
        throw Error(
          `denomination without hash ${JSON.stringify(denom, undefined, 2)}`,
        );
      }
      if (stampStart.t_s >= stampEnd.t_s) {
        throw Error(`denom ${id} has start after the end`);
      }
      ps.push({
        type: "start",
        fee: Amounts.stringify(fee),
        group,
        id,
        moment: AbsoluteTime.fromTimestamp(stampStart),
        denom,
      });
      ps.push({
        type: "end",
        fee: Amounts.stringify(fee),
        group,
        id,
        moment: AbsoluteTime.fromTimestamp(stampEnd),
        denom,
      });
      return ps;
    }, [] as TimePoint<Type>[])
    .sort((a, b) => {
      const v = a.group == b.group ? 0 : a.group > b.group ? 1 : -1;
      if (v != 0) return v;
      const t = AbsoluteTime.cmp(a.moment, b.moment);
      if (t != 0) return t;
      if (a.type === b.type) return 0;
      return a.type === "start" ? 1 : -1;
    });

  const activeAtTheSameTime: Type[] = [];
  return sortedPointsInTime.reduce((result, cursor, idx) => {
    /**
     * Now that we have move one step forward, we should
     * update the previous element ending period with the
     * current start time.
     */
    let prev = result.length > 0 ? result[result.length - 1] : undefined;
    const prevHasSameValue = prev && prev.group == cursor.group;
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

    /**
     * With the current moment in the iteration we
     * should keep updated which entities are current
     * active in this period of time.
     */
    if (cursor.type === "end") {
      const loc = activeAtTheSameTime.findIndex((v) => v[idProp] === cursor.id);
      if (loc === -1) {
        throw Error(`denomination ${cursor.id} has an end but no start`);
      }
      activeAtTheSameTime.splice(loc, 1);
    } else if (cursor.type === "start") {
      activeAtTheSameTime.push(cursor.denom);
    } else {
      const exhaustiveCheck: never = cursor.type;
      throw new Error(`not TimePoint defined for type: ${exhaustiveCheck}`);
    }

    if (idx == sortedPointsInTime.length - 1) {
      /**
       * This is the last element in the list, if we continue
       * a gap will normally be added which is not necessary.
       * Also, the last element should be ending and the list of active
       * element should be empty
       */
      if (cursor.type !== "end") {
        throw Error(
          `denomination ${cursor.id} starts after ending or doesn't have an ending`,
        );
      }
      if (activeAtTheSameTime.length > 0) {
        throw Error(
          `there are ${activeAtTheSameTime.length} denominations without ending`,
        );
      }
      return result;
    }

    const current = selectBestForOverlapping(activeAtTheSameTime);

    if (current) {
      /**
       * We have a candidate to add in the list, check that we are
       * not adding a duplicate.
       * Next element in the list will defined the ending.
       */
      const currentFee = current[feeProp] as AmountJson;
      if (
        prev === undefined || //is the first
        !prev.fee || //is a gap
        Amounts.cmp(prev.fee, currentFee) !== 0 // prev has different fee
      ) {
        result.push({
          group: cursor.group,
          from: cursor.moment,
          until: AbsoluteTime.never(), //not yet known
          fee: Amounts.stringify(currentFee),
        });
      } else {
        prev.until = cursor.moment;
      }
    } else {
      /**
       * No active element in this period of time, so we add a gap (no fee)
       * Next element in the list will defined the ending.
       */
      result.push({
        group: cursor.group,
        from: cursor.moment,
        until: AbsoluteTime.never(), //not yet known
      });
    }

    return result;
  }, [] as FeeDescription[]);
}
