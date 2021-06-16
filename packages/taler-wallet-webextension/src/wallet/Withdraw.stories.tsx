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

import { h } from 'preact';
import { View, ViewProps } from './Withdraw';


export default {
  title: 'wallet/withdraw',
  component: View,
  argTypes: {
  },
};

export const WithoutURI = (a: any) => <View {...a} />;
WithoutURI.args = {
} as ViewProps

export const WithoutDetails = (a: any) => <View {...a} />;
WithoutDetails.args = {
  talerWithdrawUri: 'http://something'
} as ViewProps

export const Cancelled = (a: any) => <View {...a} />;
Cancelled.args = {
  talerWithdrawUri: 'http://something',
  details: {
    amount: 'USD:2',
  },
  cancelled: true
} as ViewProps

export const CompleteWithExchange = (a: any) => <View {...a} />;
CompleteWithExchange.args = {
  talerWithdrawUri: 'http://something',
  details: {
    amount: 'USD:2',
  },
  selectedExchange: 'Some exchange'
} as ViewProps

export const CompleteWithoutExchange = (a: any) => <View {...a} />;
CompleteWithoutExchange.args = {
  talerWithdrawUri: 'http://something',
  details: {
    amount: 'USD:2',
  },
} as ViewProps
