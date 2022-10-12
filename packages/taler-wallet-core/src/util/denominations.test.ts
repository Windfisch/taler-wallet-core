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
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import {
  AbsoluteTime,
  FeeDescription,
  FeeDescriptionPair,
  Amounts,
  DenominationInfo,
} from "@gnu-taler/taler-util";
// import { expect } from "chai";
import {
  createPairTimeline,
  createTimeline,
  selectBestForOverlappingDenominations,
} from "./denominations.js";
import test, { ExecutionContext } from "ava";

/**
 * Create some constants to be used as reference in the tests
 */
const VALUES = Array.from({ length: 10 }).map((undef, t) =>
  Amounts.parseOrThrow(`USD:${t}`),
);
const TIMESTAMPS = Array.from({ length: 20 }).map((undef, t_s) => ({ t_s }));
const ABS_TIME = TIMESTAMPS.map((m) => AbsoluteTime.fromTimestamp(m));

function normalize(
  list: DenominationInfo[],
): (DenominationInfo & { group: string })[] {
  return list.map((e, idx) => ({
    ...e,
    denomPubHash: `id${idx}`,
    group: Amounts.stringifyValue(e.value),
  }));
}

//Avoiding to make an error-prone/time-consuming refactor
//this function calls AVA's deepEqual from a chai interface
function expect(t: ExecutionContext, thing: any): any {
  return {
    deep: {
      equal: (another: any) => t.deepEqual(thing, another),
      equals: (another: any) => t.deepEqual(thing, another),
    },
  };
}

// describe("Denomination timeline creation", (t) => {
//   describe("single value example", (t) => {

test("should have one row with start and exp", (t) => {
  const timeline = createTimeline(
    normalize([
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[1],
        stampExpireDeposit: TIMESTAMPS[2],
        feeDeposit: VALUES[1],
      } as Partial<DenominationInfo> as DenominationInfo,
    ]),
    "denomPubHash",
    "stampStart",
    "stampExpireDeposit",
    "feeDeposit",
    "group",
    selectBestForOverlappingDenominations,
  );

  expect(t, timeline).deep.equal([
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[1],
      until: ABS_TIME[2],
      fee: VALUES[1],
    } as FeeDescription,
  ]);
});

test("should have two rows with the second denom in the middle if second is better", (t) => {
  const timeline = createTimeline(
    normalize([
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[1],
        stampExpireDeposit: TIMESTAMPS[3],
        feeDeposit: VALUES[1],
      } as Partial<DenominationInfo> as DenominationInfo,
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[2],
        stampExpireDeposit: TIMESTAMPS[4],
        feeDeposit: VALUES[2],
      } as Partial<DenominationInfo> as DenominationInfo,
    ]),
    "denomPubHash",
    "stampStart",
    "stampExpireDeposit",
    "feeDeposit",
    "group",
    selectBestForOverlappingDenominations,
  );

  expect(t, timeline).deep.equal([
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[1],
      until: ABS_TIME[3],
      fee: VALUES[1],
    },
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[3],
      until: ABS_TIME[4],
      fee: VALUES[2],
    },
  ] as FeeDescription[]);
});

test("should have two rows with the first denom in the middle if second is worse", (t) => {
  const timeline = createTimeline(
    normalize([
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[1],
        stampExpireDeposit: TIMESTAMPS[3],
        feeDeposit: VALUES[2],
      } as Partial<DenominationInfo> as DenominationInfo,
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[2],
        stampExpireDeposit: TIMESTAMPS[4],
        feeDeposit: VALUES[1],
      } as Partial<DenominationInfo> as DenominationInfo,
    ]),
    "denomPubHash",
    "stampStart",
    "stampExpireDeposit",
    "feeDeposit",
    "group",
    selectBestForOverlappingDenominations,
  );

  expect(t, timeline).deep.equal([
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[1],
      until: ABS_TIME[2],
      fee: VALUES[2],
    },
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[2],
      until: ABS_TIME[4],
      fee: VALUES[1],
    },
  ] as FeeDescription[]);
});

test("should add a gap when there no fee", (t) => {
  const timeline = createTimeline(
    normalize([
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[1],
        stampExpireDeposit: TIMESTAMPS[2],
        feeDeposit: VALUES[2],
      } as Partial<DenominationInfo> as DenominationInfo,
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[3],
        stampExpireDeposit: TIMESTAMPS[4],
        feeDeposit: VALUES[1],
      } as Partial<DenominationInfo> as DenominationInfo,
    ]),
    "denomPubHash",
    "stampStart",
    "stampExpireDeposit",
    "feeDeposit",
    "group",
    selectBestForOverlappingDenominations,
  );

  expect(t, timeline).deep.equal([
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[1],
      until: ABS_TIME[2],
      fee: VALUES[2],
    },
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[2],
      until: ABS_TIME[3],
    },
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[3],
      until: ABS_TIME[4],
      fee: VALUES[1],
    },
  ] as FeeDescription[]);
});

test("should have three rows when first denom is between second and second is worse", (t) => {
  const timeline = createTimeline(
    normalize([
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[2],
        stampExpireDeposit: TIMESTAMPS[3],
        feeDeposit: VALUES[1],
      } as Partial<DenominationInfo> as DenominationInfo,
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[1],
        stampExpireDeposit: TIMESTAMPS[4],
        feeDeposit: VALUES[2],
      } as Partial<DenominationInfo> as DenominationInfo,
    ]),
    "denomPubHash",
    "stampStart",
    "stampExpireDeposit",
    "feeDeposit",
    "group",
    selectBestForOverlappingDenominations,
  );
  expect(t, timeline).deep.equal([
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[1],
      until: ABS_TIME[2],
      fee: VALUES[2],
    },
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[2],
      until: ABS_TIME[3],
      fee: VALUES[1],
    },
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[3],
      until: ABS_TIME[4],
      fee: VALUES[2],
    },
  ] as FeeDescription[]);
});

test("should have one row when first denom is between second and second is better", (t) => {
  const timeline = createTimeline(
    normalize([
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[2],
        stampExpireDeposit: TIMESTAMPS[3],
        feeDeposit: VALUES[2],
      } as Partial<DenominationInfo> as DenominationInfo,
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[1],
        stampExpireDeposit: TIMESTAMPS[4],
        feeDeposit: VALUES[1],
      } as Partial<DenominationInfo> as DenominationInfo,
    ]),
    "denomPubHash",
    "stampStart",
    "stampExpireDeposit",
    "feeDeposit",
    "group",
    selectBestForOverlappingDenominations,
  );

  expect(t, timeline).deep.equal([
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[1],
      until: ABS_TIME[4],
      fee: VALUES[1],
    },
  ] as FeeDescription[]);
});

test("should only add the best1", (t) => {
  const timeline = createTimeline(
    normalize([
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[1],
        stampExpireDeposit: TIMESTAMPS[3],
        feeDeposit: VALUES[2],
      } as Partial<DenominationInfo> as DenominationInfo,
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[2],
        stampExpireDeposit: TIMESTAMPS[4],
        feeDeposit: VALUES[1],
      } as Partial<DenominationInfo> as DenominationInfo,
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[2],
        stampExpireDeposit: TIMESTAMPS[4],
        feeDeposit: VALUES[2],
      } as Partial<DenominationInfo> as DenominationInfo,
    ]),
    "denomPubHash",
    "stampStart",
    "stampExpireDeposit",
    "feeDeposit",
    "group",
    selectBestForOverlappingDenominations,
  );

  expect(t, timeline).deep.equal([
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[1],
      until: ABS_TIME[2],
      fee: VALUES[2],
    },
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[2],
      until: ABS_TIME[4],
      fee: VALUES[1],
    },
  ] as FeeDescription[]);
});

test("should only add the best2", (t) => {
  const timeline = createTimeline(
    normalize([
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[1],
        stampExpireDeposit: TIMESTAMPS[3],
        feeDeposit: VALUES[2],
      } as Partial<DenominationInfo> as DenominationInfo,
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[2],
        stampExpireDeposit: TIMESTAMPS[5],
        feeDeposit: VALUES[1],
      } as Partial<DenominationInfo> as DenominationInfo,
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[2],
        stampExpireDeposit: TIMESTAMPS[4],
        feeDeposit: VALUES[2],
      } as Partial<DenominationInfo> as DenominationInfo,
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[5],
        stampExpireDeposit: TIMESTAMPS[6],
        feeDeposit: VALUES[3],
      } as Partial<DenominationInfo> as DenominationInfo,
    ]),
    "denomPubHash",
    "stampStart",
    "stampExpireDeposit",
    "feeDeposit",
    "group",
    selectBestForOverlappingDenominations,
  );

  expect(t, timeline).deep.equal([
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[1],
      until: ABS_TIME[2],
      fee: VALUES[2],
    },
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[2],
      until: ABS_TIME[5],
      fee: VALUES[1],
    },
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[5],
      until: ABS_TIME[6],
      fee: VALUES[3],
    },
  ] as FeeDescription[]);
});

test("should only add the best3", (t) => {
  const timeline = createTimeline(
    normalize([
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[2],
        stampExpireDeposit: TIMESTAMPS[5],
        feeDeposit: VALUES[3],
      } as Partial<DenominationInfo> as DenominationInfo,
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[2],
        stampExpireDeposit: TIMESTAMPS[5],
        feeDeposit: VALUES[1],
      } as Partial<DenominationInfo> as DenominationInfo,
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[2],
        stampExpireDeposit: TIMESTAMPS[5],
        feeDeposit: VALUES[2],
      } as Partial<DenominationInfo> as DenominationInfo,
    ]),
    "denomPubHash",
    "stampStart",
    "stampExpireDeposit",
    "feeDeposit",
    "group",
    selectBestForOverlappingDenominations,
  );

  expect(t, timeline).deep.equal([
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[2],
      until: ABS_TIME[5],
      fee: VALUES[1],
    },
  ] as FeeDescription[]);
});
// })

// describe("multiple value example", (t) => {

//TODO: test the same start but different value

test("should not merge when there is different value", (t) => {
  const timeline = createTimeline(
    normalize([
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[1],
        stampExpireDeposit: TIMESTAMPS[3],
        feeDeposit: VALUES[1],
      } as Partial<DenominationInfo> as DenominationInfo,
      {
        value: VALUES[2],
        stampStart: TIMESTAMPS[2],
        stampExpireDeposit: TIMESTAMPS[4],
        feeDeposit: VALUES[2],
      } as Partial<DenominationInfo> as DenominationInfo,
    ]),
    "denomPubHash",
    "stampStart",
    "stampExpireDeposit",
    "feeDeposit",
    "group",
    selectBestForOverlappingDenominations,
  );

  expect(t, timeline).deep.equal([
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[1],
      until: ABS_TIME[3],
      fee: VALUES[1],
    },
    {
      group: Amounts.stringifyValue(VALUES[2]),
      from: ABS_TIME[2],
      until: ABS_TIME[4],
      fee: VALUES[2],
    },
  ] as FeeDescription[]);
});

test("should not merge when there is different value (with duplicates)", (t) => {
  const timeline = createTimeline(
    normalize([
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[1],
        stampExpireDeposit: TIMESTAMPS[3],
        feeDeposit: VALUES[1],
      } as Partial<DenominationInfo> as DenominationInfo,
      {
        value: VALUES[2],
        stampStart: TIMESTAMPS[2],
        stampExpireDeposit: TIMESTAMPS[4],
        feeDeposit: VALUES[2],
      } as Partial<DenominationInfo> as DenominationInfo,
      {
        value: VALUES[1],
        stampStart: TIMESTAMPS[1],
        stampExpireDeposit: TIMESTAMPS[3],
        feeDeposit: VALUES[1],
      } as Partial<DenominationInfo> as DenominationInfo,
      {
        value: VALUES[2],
        stampStart: TIMESTAMPS[2],
        stampExpireDeposit: TIMESTAMPS[4],
        feeDeposit: VALUES[2],
      } as Partial<DenominationInfo> as DenominationInfo,
    ]),
    "denomPubHash",
    "stampStart",
    "stampExpireDeposit",
    "feeDeposit",
    "group",
    selectBestForOverlappingDenominations,
  );

  expect(t, timeline).deep.equal([
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[1],
      until: ABS_TIME[3],
      fee: VALUES[1],
    },
    {
      group: Amounts.stringifyValue(VALUES[2]),
      from: ABS_TIME[2],
      until: ABS_TIME[4],
      fee: VALUES[2],
    },
  ] as FeeDescription[]);
});

// it.skip("real world example: bitcoin exchange", (t) => {
//   const timeline = createDenominationTimeline(
//     bitcoinExchanges[0].denominations.filter(d => Amounts.cmp(d.value, Amounts.parseOrThrow('BITCOINBTC:0.01048576'))),
//     "stampExpireDeposit", "feeDeposit");

//   expect(t,timeline).deep.equal([{
//     fee: Amounts.parseOrThrow('BITCOINBTC:0.00000001'),
//     from: { t_ms: 1652978648000 },
//     until: { t_ms: 1699633748000 },
//     value: Amounts.parseOrThrow('BITCOINBTC:0.01048576'),
//   }, {
//     fee: Amounts.parseOrThrow('BITCOINBTC:0.00000003'),
//     from: { t_ms: 1699633748000 },
//     until: { t_ms: 1707409448000 },
//     value: Amounts.parseOrThrow('BITCOINBTC:0.01048576'),
//   }] as FeeDescription[])
// })

//   })

// })

// describe("Denomination timeline pair creation", (t) => {

//   describe("single value example", (t) => {

test("should return empty", (t) => {
  const left = [] as FeeDescription[];
  const right = [] as FeeDescription[];

  const pairs = createPairTimeline(left, right);

  expect(t, pairs).deep.equals([]);
});

test("should return first element", (t) => {
  const left = [
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[1],
      until: ABS_TIME[3],
      fee: VALUES[1],
    },
  ] as FeeDescription[];

  const right = [] as FeeDescription[];

  {
    const pairs = createPairTimeline(left, right);
    expect(t, pairs).deep.equals([
      {
        from: ABS_TIME[1],
        until: ABS_TIME[3],
        group: Amounts.stringifyValue(VALUES[1]),
        left: VALUES[1],
        right: undefined,
      },
    ] as FeeDescriptionPair[]);
  }
  {
    const pairs = createPairTimeline(right, left);
    expect(t, pairs).deep.equals([
      {
        from: ABS_TIME[1],
        until: ABS_TIME[3],
        group: Amounts.stringifyValue(VALUES[1]),
        right: VALUES[1],
        left: undefined,
      },
    ] as FeeDescriptionPair[]);
  }
});

test("should add both to the same row", (t) => {
  const left = [
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[1],
      until: ABS_TIME[3],
      fee: VALUES[1],
    },
  ] as FeeDescription[];

  const right = [
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[1],
      until: ABS_TIME[3],
      fee: VALUES[2],
    },
  ] as FeeDescription[];

  {
    const pairs = createPairTimeline(left, right);
    expect(t, pairs).deep.equals([
      {
        from: ABS_TIME[1],
        until: ABS_TIME[3],
        group: Amounts.stringifyValue(VALUES[1]),
        left: VALUES[1],
        right: VALUES[2],
      },
    ] as FeeDescriptionPair[]);
  }
  {
    const pairs = createPairTimeline(right, left);
    expect(t, pairs).deep.equals([
      {
        from: ABS_TIME[1],
        until: ABS_TIME[3],
        group: Amounts.stringifyValue(VALUES[1]),
        left: VALUES[2],
        right: VALUES[1],
      },
    ] as FeeDescriptionPair[]);
  }
});

test("should repeat the first and change the second", (t) => {
  const left = [
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[1],
      until: ABS_TIME[5],
      fee: VALUES[1],
    },
  ] as FeeDescription[];

  const right = [
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[1],
      until: ABS_TIME[2],
      fee: VALUES[2],
    },
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[2],
      until: ABS_TIME[3],
    },
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[3],
      until: ABS_TIME[4],
      fee: VALUES[3],
    },
  ] as FeeDescription[];

  {
    const pairs = createPairTimeline(left, right);
    expect(t, pairs).deep.equals([
      {
        from: ABS_TIME[1],
        until: ABS_TIME[2],
        group: Amounts.stringifyValue(VALUES[1]),
        left: VALUES[1],
        right: VALUES[2],
      },
      {
        from: ABS_TIME[2],
        until: ABS_TIME[3],
        group: Amounts.stringifyValue(VALUES[1]),
        left: VALUES[1],
        right: undefined,
      },
      {
        from: ABS_TIME[3],
        until: ABS_TIME[4],
        group: Amounts.stringifyValue(VALUES[1]),
        left: VALUES[1],
        right: VALUES[3],
      },
      {
        from: ABS_TIME[4],
        until: ABS_TIME[5],
        group: Amounts.stringifyValue(VALUES[1]),
        left: VALUES[1],
        right: undefined,
      },
    ] as FeeDescriptionPair[]);
  }
});

// })

// describe("multiple value example", (t) => {

test("should separate denominations of different value", (t) => {
  const left = [
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[1],
      until: ABS_TIME[3],
      fee: VALUES[1],
    },
  ] as FeeDescription[];

  const right = [
    {
      group: Amounts.stringifyValue(VALUES[2]),
      from: ABS_TIME[1],
      until: ABS_TIME[3],
      fee: VALUES[2],
    },
  ] as FeeDescription[];

  {
    const pairs = createPairTimeline(left, right);
    expect(t, pairs).deep.equals([
      {
        from: ABS_TIME[1],
        until: ABS_TIME[3],
        group: Amounts.stringifyValue(VALUES[1]),
        left: VALUES[1],
        right: undefined,
      },
      {
        from: ABS_TIME[1],
        until: ABS_TIME[3],
        group: Amounts.stringifyValue(VALUES[2]),
        left: undefined,
        right: VALUES[2],
      },
    ] as FeeDescriptionPair[]);
  }
  {
    const pairs = createPairTimeline(right, left);
    expect(t, pairs).deep.equals([
      {
        from: ABS_TIME[1],
        until: ABS_TIME[3],
        group: Amounts.stringifyValue(VALUES[1]),
        left: undefined,
        right: VALUES[1],
      },
      {
        from: ABS_TIME[1],
        until: ABS_TIME[3],
        group: Amounts.stringifyValue(VALUES[2]),
        left: VALUES[2],
        right: undefined,
      },
    ] as FeeDescriptionPair[]);
  }
});

test("should separate denominations of different value2", (t) => {
  const left = [
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[1],
      until: ABS_TIME[2],
      fee: VALUES[1],
    },
    {
      group: Amounts.stringifyValue(VALUES[1]),
      from: ABS_TIME[2],
      until: ABS_TIME[4],
      fee: VALUES[2],
    },
  ] as FeeDescription[];

  const right = [
    {
      group: Amounts.stringifyValue(VALUES[2]),
      from: ABS_TIME[1],
      until: ABS_TIME[3],
      fee: VALUES[2],
    },
  ] as FeeDescription[];

  {
    const pairs = createPairTimeline(left, right);
    expect(t, pairs).deep.equals([
      {
        from: ABS_TIME[1],
        until: ABS_TIME[2],
        group: Amounts.stringifyValue(VALUES[1]),
        left: VALUES[1],
        right: undefined,
      },
      {
        from: ABS_TIME[2],
        until: ABS_TIME[4],
        group: Amounts.stringifyValue(VALUES[1]),
        left: VALUES[2],
        right: undefined,
      },
      {
        from: ABS_TIME[1],
        until: ABS_TIME[3],
        group: Amounts.stringifyValue(VALUES[2]),
        left: undefined,
        right: VALUES[2],
      },
    ] as FeeDescriptionPair[]);
  }
  // {
  //   const pairs = createDenominationPairTimeline(right, left)
  //   expect(t,pairs).deep.equals([{
  //     from: moments[1],
  //     until: moments[3],
  //     value: values[1],
  //     left: undefined,
  //     right: values[1],
  //   }, {
  //     from: moments[1],
  //     until: moments[3],
  //     value: values[2],
  //     left: values[2],
  //     right: undefined,
  //   }] as FeeDescriptionPair[])
  // }
});
// it.skip("should render real world", (t) => {
//   const left = createDenominationTimeline(
//     bitcoinExchanges[0].denominations.filter(d => Amounts.cmp(d.value, Amounts.parseOrThrow('BITCOINBTC:0.01048576'))),
//     "stampExpireDeposit", "feeDeposit");
//   const right = createDenominationTimeline(
//     bitcoinExchanges[1].denominations.filter(d => Amounts.cmp(d.value, Amounts.parseOrThrow('BITCOINBTC:0.01048576'))),
//     "stampExpireDeposit", "feeDeposit");

//   const pairs = createDenominationPairTimeline(left, right)
// })

//   })
// })
