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

/**
*
* @author Sebastian Javier Marchano (sebasjm)
*/

import { FunctionalComponent, h } from 'preact';
import { ShowOrderDetails as TestedComponent } from './ShowOrderDetails';
import { exampleData } from './ShowOrderDetails.examples';

export default {
  title: 'ShowOrderDetails',
  component: TestedComponent,
  argTypes: {
  },
  excludeStories: /.*Data$/,
};

function createExample<Props>(Component: FunctionalComponent<Props>, props: Partial<Props>) {
  const r = (args: any) => <Component {...args} />
  r.args = props
  return r
}

export const Simplest = createExample(TestedComponent, exampleData.Simplest);
export const WithRefundAmount = createExample(TestedComponent, exampleData.WithRefundAmount);
export const WithDeliveryDate = createExample(TestedComponent, exampleData.WithDeliveryDate);
export const WithDeliveryLocation = createExample(TestedComponent, exampleData.WithDeliveryLocation);
export const WithDeliveryLocationAndDate = createExample(TestedComponent, exampleData.WithDeliveryLocationAndDate);
export const WithThreeProducts = createExample(TestedComponent, exampleData.WithThreeProducts);
export const WithAuditorList = createExample(TestedComponent, exampleData.WithAuditorList);
export const WithExchangeList = createExample(TestedComponent, exampleData.WithExchangeList);
export const WithAutoRefund = createExample(TestedComponent, exampleData.WithAutoRefund);
export const WithProductWithTaxes = createExample(TestedComponent, exampleData.WithProductWithTaxes);
