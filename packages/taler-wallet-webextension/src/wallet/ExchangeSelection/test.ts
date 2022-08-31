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
  Amounts, DenominationInfo
} from "@gnu-taler/taler-util";
import { expect } from "chai";
import { bitcoinExchanges } from "./example.js";
import { FeeDescription, FeeDescriptionPair } from "./index.js";
import { createDenominationPairTimeline, createDenominationTimeline } from "./state.js";

const values = Array.from({ length: 10 }).map((undef, t) => Amounts.parseOrThrow(`USD:${t}`))
const timestamps = Array.from({ length: 20 }).map((undef, t_s) => ({ t_s }))
const moments = timestamps.map(m => AbsoluteTime.fromTimestamp(m))

function normalize(list: DenominationInfo[]): DenominationInfo[] {
  return list.map((e, idx) => ({ ...e, denomPubHash: `id${idx}` }))
}

describe("Denomination timeline creation", () => {
  describe("single value example", () => {

    it("should have one row with start and exp", () => {

      const timeline = createDenominationTimeline(normalize([
        {
          value: values[1],
          stampStart: timestamps[1],
          stampExpireDeposit: timestamps[2],
          feeDeposit: values[1]
        } as Partial<DenominationInfo> as DenominationInfo,
      ]), "stampExpireDeposit", "feeDeposit");

      expect(timeline).deep.equal([{
        value: values[1],
        from: moments[1],
        until: moments[2],
        fee: values[1],
      } as FeeDescription])
    });

    it("should have two rows with the second denom in the middle if second is better", () => {
      const timeline = createDenominationTimeline(normalize([
        {
          value: values[1],
          stampStart: timestamps[1],
          stampExpireDeposit: timestamps[3],
          feeDeposit: values[1]
        } as Partial<DenominationInfo> as DenominationInfo,
        {
          value: values[1],
          stampStart: timestamps[2],
          stampExpireDeposit: timestamps[4],
          feeDeposit: values[2]
        } as Partial<DenominationInfo> as DenominationInfo,
      ]), "stampExpireDeposit", "feeDeposit");

      expect(timeline).deep.equal([{
        value: values[1],
        from: moments[1],
        until: moments[3],
        fee: values[1],
      }, {
        value: values[1],
        from: moments[3],
        until: moments[4],
        fee: values[2],
      }] as FeeDescription[])

    });

    it("should have two rows with the first denom in the middle if second is worse", () => {
      const timeline = createDenominationTimeline(normalize([
        {
          value: values[1],
          stampStart: timestamps[1],
          stampExpireDeposit: timestamps[3],
          feeDeposit: values[2]
        } as Partial<DenominationInfo> as DenominationInfo,
        {
          value: values[1],
          stampStart: timestamps[2],
          stampExpireDeposit: timestamps[4],
          feeDeposit: values[1]
        } as Partial<DenominationInfo> as DenominationInfo,
      ]), "stampExpireDeposit", "feeDeposit");

      expect(timeline).deep.equal([{
        value: values[1],
        from: moments[1],
        until: moments[2],
        fee: values[2],
      }, {
        value: values[1],
        from: moments[2],
        until: moments[4],
        fee: values[1],
      }] as FeeDescription[])

    });

    it("should add a gap when there no fee", () => {
      const timeline = createDenominationTimeline(normalize([
        {
          value: values[1],
          stampStart: timestamps[1],
          stampExpireDeposit: timestamps[2],
          feeDeposit: values[2]
        } as Partial<DenominationInfo> as DenominationInfo,
        {
          value: values[1],
          stampStart: timestamps[3],
          stampExpireDeposit: timestamps[4],
          feeDeposit: values[1]
        } as Partial<DenominationInfo> as DenominationInfo,
      ]), "stampExpireDeposit", "feeDeposit");

      expect(timeline).deep.equal([{
        value: values[1],
        from: moments[1],
        until: moments[2],
        fee: values[2],
      }, {
        value: values[1],
        from: moments[2],
        until: moments[3],

      }, {
        value: values[1],
        from: moments[3],
        until: moments[4],
        fee: values[1],
      }] as FeeDescription[])

    });

    it("should have three rows when first denom is between second and second is worse", () => {
      const timeline = createDenominationTimeline(normalize([
        {
          value: values[1],
          stampStart: timestamps[2],
          stampExpireDeposit: timestamps[3],
          feeDeposit: values[1]
        } as Partial<DenominationInfo> as DenominationInfo,
        {
          value: values[1],
          stampStart: timestamps[1],
          stampExpireDeposit: timestamps[4],
          feeDeposit: values[2]
        } as Partial<DenominationInfo> as DenominationInfo,
      ]), "stampExpireDeposit", "feeDeposit");
      expect(timeline).deep.equal([{
        value: values[1],
        from: moments[1],
        until: moments[2],
        fee: values[2],
      }, {
        value: values[1],
        from: moments[2],
        until: moments[3],
        fee: values[1],
      }, {
        value: values[1],
        from: moments[3],
        until: moments[4],
        fee: values[2],
      }] as FeeDescription[])

    });

    it("should have one row when first denom is between second and second is better", () => {
      const timeline = createDenominationTimeline(normalize([
        {
          value: values[1],
          stampStart: timestamps[2],
          stampExpireDeposit: timestamps[3],
          feeDeposit: values[2]
        } as Partial<DenominationInfo> as DenominationInfo,
        {
          value: values[1],
          stampStart: timestamps[1],
          stampExpireDeposit: timestamps[4],
          feeDeposit: values[1]
        } as Partial<DenominationInfo> as DenominationInfo,
      ]), "stampExpireDeposit", "feeDeposit");

      expect(timeline).deep.equal([{
        value: values[1],
        from: moments[1],
        until: moments[4],
        fee: values[1],
      }] as FeeDescription[])

    });

    it("should only add the best1", () => {
      const timeline = createDenominationTimeline(normalize([
        {
          value: values[1],
          stampStart: timestamps[1],
          stampExpireDeposit: timestamps[3],
          feeDeposit: values[2]
        } as Partial<DenominationInfo> as DenominationInfo,
        {
          value: values[1],
          stampStart: timestamps[2],
          stampExpireDeposit: timestamps[4],
          feeDeposit: values[1]
        } as Partial<DenominationInfo> as DenominationInfo,
        {
          value: values[1],
          stampStart: timestamps[2],
          stampExpireDeposit: timestamps[4],
          feeDeposit: values[2]
        } as Partial<DenominationInfo> as DenominationInfo,
      ]), "stampExpireDeposit", "feeDeposit");

      expect(timeline).deep.equal([{
        value: values[1],
        from: moments[1],
        until: moments[2],
        fee: values[2],
      }, {
        value: values[1],
        from: moments[2],
        until: moments[4],
        fee: values[1],
      }] as FeeDescription[])

    });

    it("should only add the best2", () => {
      const timeline = createDenominationTimeline(normalize([
        {
          value: values[1],
          stampStart: timestamps[1],
          stampExpireDeposit: timestamps[3],
          feeDeposit: values[2]
        } as Partial<DenominationInfo> as DenominationInfo,
        {
          value: values[1],
          stampStart: timestamps[2],
          stampExpireDeposit: timestamps[5],
          feeDeposit: values[1]
        } as Partial<DenominationInfo> as DenominationInfo,
        {
          value: values[1],
          stampStart: timestamps[2],
          stampExpireDeposit: timestamps[4],
          feeDeposit: values[2]
        } as Partial<DenominationInfo> as DenominationInfo,
        {
          value: values[1],
          stampStart: timestamps[5],
          stampExpireDeposit: timestamps[6],
          feeDeposit: values[3]
        } as Partial<DenominationInfo> as DenominationInfo,
      ]), "stampExpireDeposit", "feeDeposit");

      expect(timeline).deep.equal([{
        value: values[1],
        from: moments[1],
        until: moments[2],
        fee: values[2],
      }, {
        value: values[1],
        from: moments[2],
        until: moments[5],
        fee: values[1],
      }, {
        value: values[1],
        from: moments[5],
        until: moments[6],
        fee: values[3],
      }] as FeeDescription[])

    });

    it("should only add the best3", () => {
      const timeline = createDenominationTimeline(normalize([
        {
          value: values[1],
          stampStart: timestamps[2],
          stampExpireDeposit: timestamps[5],
          feeDeposit: values[3]
        } as Partial<DenominationInfo> as DenominationInfo,
        {
          value: values[1],
          stampStart: timestamps[2],
          stampExpireDeposit: timestamps[5],
          feeDeposit: values[1]
        } as Partial<DenominationInfo> as DenominationInfo,
        {
          value: values[1],
          stampStart: timestamps[2],
          stampExpireDeposit: timestamps[5],
          feeDeposit: values[2]
        } as Partial<DenominationInfo> as DenominationInfo,
      ]), "stampExpireDeposit", "feeDeposit");

      expect(timeline).deep.equal([{
        value: values[1],
        from: moments[2],
        until: moments[5],
        fee: values[1],
      }] as FeeDescription[])

    })
  })

  describe("multiple value example", () => {

    //TODO: test the same start but different value

    it("should not merge when there is different value", () => {
      const timeline = createDenominationTimeline(normalize([
        {
          value: values[1],
          stampStart: timestamps[1],
          stampExpireDeposit: timestamps[3],
          feeDeposit: values[1]
        } as Partial<DenominationInfo> as DenominationInfo,
        {
          value: values[2],
          stampStart: timestamps[2],
          stampExpireDeposit: timestamps[4],
          feeDeposit: values[2]
        } as Partial<DenominationInfo> as DenominationInfo,
      ]), "stampExpireDeposit", "feeDeposit");

      expect(timeline).deep.equal([{
        value: values[1],
        from: moments[1],
        until: moments[3],
        fee: values[1],
      }, {
        value: values[2],
        from: moments[2],
        until: moments[4],
        fee: values[2],
      }] as FeeDescription[])

    });

    it("should not merge when there is different value (with duplicates)", () => {
      const timeline = createDenominationTimeline(normalize([
        {
          value: values[1],
          stampStart: timestamps[1],
          stampExpireDeposit: timestamps[3],
          feeDeposit: values[1]
        } as Partial<DenominationInfo> as DenominationInfo,
        {
          value: values[2],
          stampStart: timestamps[2],
          stampExpireDeposit: timestamps[4],
          feeDeposit: values[2]
        } as Partial<DenominationInfo> as DenominationInfo,
        {
          value: values[1],
          stampStart: timestamps[1],
          stampExpireDeposit: timestamps[3],
          feeDeposit: values[1]
        } as Partial<DenominationInfo> as DenominationInfo,
        {
          value: values[2],
          stampStart: timestamps[2],
          stampExpireDeposit: timestamps[4],
          feeDeposit: values[2]
        } as Partial<DenominationInfo> as DenominationInfo,
      ]), "stampExpireDeposit", "feeDeposit");

      expect(timeline).deep.equal([{
        value: values[1],
        from: moments[1],
        until: moments[3],
        fee: values[1],
      }, {
        value: values[2],
        from: moments[2],
        until: moments[4],
        fee: values[2],
      }] as FeeDescription[])

    });

    it.skip("real world example: bitcoin exchange", () => {
      const timeline = createDenominationTimeline(
        bitcoinExchanges[0].denominations.filter(d => Amounts.cmp(d.value, Amounts.parseOrThrow('BITCOINBTC:0.01048576'))),
        "stampExpireDeposit", "feeDeposit");

      expect(timeline).deep.equal([{
        fee: Amounts.parseOrThrow('BITCOINBTC:0.00000001'),
        from: { t_ms: 1652978648000 },
        until: { t_ms: 1699633748000 },
        value: Amounts.parseOrThrow('BITCOINBTC:0.01048576'),
      }, {
        fee: Amounts.parseOrThrow('BITCOINBTC:0.00000003'),
        from: { t_ms: 1699633748000 },
        until: { t_ms: 1707409448000 },
        value: Amounts.parseOrThrow('BITCOINBTC:0.01048576'),
      }] as FeeDescription[])
    })

  })

})

describe("Denomination timeline pair creation", () => {

  describe("single value example", () => {

    it("should return empty", () => {

      const left = [] as FeeDescription[];
      const right = [] as FeeDescription[];

      const pairs = createDenominationPairTimeline(left, right)

      expect(pairs).deep.equals([])
    });

    it("should return first element", () => {

      const left = [{
        value: values[1],
        from: moments[1],
        until: moments[3],
        fee: values[1],
      }] as FeeDescription[];

      const right = [] as FeeDescription[];

      {
        const pairs = createDenominationPairTimeline(left, right)
        expect(pairs).deep.equals([{
          from: moments[1],
          until: moments[3],
          value: values[1],
          left: values[1],
          right: undefined,
        }] as FeeDescriptionPair[])
      }
      {
        const pairs = createDenominationPairTimeline(right, left)
        expect(pairs).deep.equals([{
          from: moments[1],
          until: moments[3],
          value: values[1],
          right: values[1],
          left: undefined,
        }] as FeeDescriptionPair[])
      }

    });

    it("should add both to the same row", () => {

      const left = [{
        value: values[1],
        from: moments[1],
        until: moments[3],
        fee: values[1],
      }] as FeeDescription[];

      const right = [{
        value: values[1],
        from: moments[1],
        until: moments[3],
        fee: values[2],
      }] as FeeDescription[];

      {
        const pairs = createDenominationPairTimeline(left, right)
        expect(pairs).deep.equals([{
          from: moments[1],
          until: moments[3],
          value: values[1],
          left: values[1],
          right: values[2],
        }] as FeeDescriptionPair[])
      }
      {
        const pairs = createDenominationPairTimeline(right, left)
        expect(pairs).deep.equals([{
          from: moments[1],
          until: moments[3],
          value: values[1],
          left: values[2],
          right: values[1],
        }] as FeeDescriptionPair[])
      }
    });

    it("should repeat the first and change the second", () => {

      const left = [{
        value: values[1],
        from: moments[1],
        until: moments[5],
        fee: values[1],
      }] as FeeDescription[];

      const right = [{
        value: values[1],
        from: moments[1],
        until: moments[2],
        fee: values[2],
      }, {
        value: values[1],
        from: moments[2],
        until: moments[3],
      }, {
        value: values[1],
        from: moments[3],
        until: moments[4],
        fee: values[3],
      }] as FeeDescription[];

      {
        const pairs = createDenominationPairTimeline(left, right)
        expect(pairs).deep.equals([{
          from: moments[1],
          until: moments[2],
          value: values[1],
          left: values[1],
          right: values[2],
        }, {
          from: moments[2],
          until: moments[3],
          value: values[1],
          left: values[1],
          right: undefined,
        }, {
          from: moments[3],
          until: moments[4],
          value: values[1],
          left: values[1],
          right: values[3],
        }, {
          from: moments[4],
          until: moments[5],
          value: values[1],
          left: values[1],
          right: undefined,
        }] as FeeDescriptionPair[])
      }


    });

  })

  describe("multiple value example", () => {

    it("should separate denominations of different value", () => {

      const left = [{
        value: values[1],
        from: moments[1],
        until: moments[3],
        fee: values[1],
      }] as FeeDescription[];

      const right = [{
        value: values[2],
        from: moments[1],
        until: moments[3],
        fee: values[2],
      }] as FeeDescription[];

      {
        const pairs = createDenominationPairTimeline(left, right)
        expect(pairs).deep.equals([{
          from: moments[1],
          until: moments[3],
          value: values[1],
          left: values[1],
          right: undefined,
        }, {
          from: moments[1],
          until: moments[3],
          value: values[2],
          left: undefined,
          right: values[2],
        }] as FeeDescriptionPair[])
      }
      {
        const pairs = createDenominationPairTimeline(right, left)
        expect(pairs).deep.equals([{
          from: moments[1],
          until: moments[3],
          value: values[1],
          left: undefined,
          right: values[1],
        }, {
          from: moments[1],
          until: moments[3],
          value: values[2],
          left: values[2],
          right: undefined,
        }] as FeeDescriptionPair[])
      }
    });

    it("should separate denominations of different value2", () => {

      const left = [{
        value: values[1],
        from: moments[1],
        until: moments[2],
        fee: values[1],
      }, {
        value: values[1],
        from: moments[2],
        until: moments[4],
        fee: values[2],
      }] as FeeDescription[];

      const right = [{
        value: values[2],
        from: moments[1],
        until: moments[3],
        fee: values[2],
      }] as FeeDescription[];

      {
        const pairs = createDenominationPairTimeline(left, right)
        expect(pairs).deep.equals([{
          from: moments[1],
          until: moments[2],
          value: values[1],
          left: values[1],
          right: undefined,
        }, {
          from: moments[2],
          until: moments[4],
          value: values[1],
          left: values[2],
          right: undefined,
        }, {
          from: moments[1],
          until: moments[3],
          value: values[2],
          left: undefined,
          right: values[2],
        }] as FeeDescriptionPair[])
      }
      // {
      //   const pairs = createDenominationPairTimeline(right, left)
      //   expect(pairs).deep.equals([{
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
    it.skip("should render real world", () => {
      const left = createDenominationTimeline(
        bitcoinExchanges[0].denominations.filter(d => Amounts.cmp(d.value, Amounts.parseOrThrow('BITCOINBTC:0.01048576'))),
        "stampExpireDeposit", "feeDeposit");
      const right = createDenominationTimeline(
        bitcoinExchanges[1].denominations.filter(d => Amounts.cmp(d.value, Amounts.parseOrThrow('BITCOINBTC:0.01048576'))),
        "stampExpireDeposit", "feeDeposit");


      const pairs = createDenominationPairTimeline(left, right)
    })
  })
})

