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

import { styled } from "@linaria/react";
import { Fragment, h, VNode } from "preact";
import { Amount } from "./Amount.js";

export default {
  title: "components/amount",
  component: Amount,
};

const Table = styled.table`
  td {
    padding: 4px;
  }
  td {
    border-bottom: 1px solid black;
  }
`;

function ProductTable(
  prods: string[],
  AmountRender: (p: { value: string; index: number }) => VNode = Amount,
): VNode {
  return (
    <Table>
      <tr>
        <td>product</td>
        <td>price</td>
      </tr>
      {prods.map((value, i) => {
        return (
          <tr key={i}>
            <td>p{i}</td>
            <td>
              <AmountRender value={value} index={i} />
              {/* <Amount value={value} fracSize={fracSize} /> */}
            </td>
          </tr>
        );
      })}
    </Table>
  );
}

export const WithoutFixedSizeDefault = (): VNode =>
  ProductTable(["ARS:19", "ARS:0.1", "ARS:10.02"]);

export const WithFixedSizeZero = (): VNode =>
  ProductTable(["ARS:19", "ARS:0.1", "ARS:10.02"], ({ value }) => {
    return <Amount value={value} maxFracSize={0} />;
  });

export const WithFixedSizeFour = (): VNode =>
  ProductTable(
    ["ARS:19", "ARS:0.1", "ARS:10.02", "ARS:10.0123", "ARS:10.0123123"],
    ({ value }) => {
      return <Amount value={value} maxFracSize={4} />;
    },
  );

export const WithFixedSizeFourNegative = (): VNode =>
  ProductTable(
    ["ARS:19", "ARS:0.1", "ARS:10.02", "ARS:10.0123", "ARS:10.0123123"],
    ({ value, index }) => {
      return (
        <Amount value={value} maxFracSize={4} negative={index % 2 === 0} />
      );
    },
  );

export const WithFixedSizeFourOverflow = (): VNode =>
  ProductTable(
    ["ARS:19", "ARS:0.1", "ARS:10123123.02", "ARS:10.0123", "ARS:10.0123123"],
    ({ value, index }) => {
      return (
        <Amount value={value} maxFracSize={4} negative={index % 2 === 0} />
      );
    },
  );

export const WithFixedSizeFourAccounting = (): VNode =>
  ProductTable(
    ["ARS:19", "ARS:0.1", "ARS:10123123.02", "ARS:10.0123", "ARS:10.0123123"],
    ({ value, index }) => {
      return (
        <Amount
          value={value}
          signType="accounting"
          maxFracSize={4}
          negative={index % 2 === 0}
        />
      );
    },
  );
