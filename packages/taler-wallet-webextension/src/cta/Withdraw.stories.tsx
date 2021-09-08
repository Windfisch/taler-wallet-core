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

import { amountFractionalBase, Amounts } from '@gnu-taler/taler-util';
import { ExchangeRecord } from '@gnu-taler/taler-wallet-core';
import { ExchangeWithdrawDetails } from '@gnu-taler/taler-wallet-core/src/operations/withdraw';
import { createExample } from '../test-utils';
import { View as TestedComponent } from './Withdraw';


export default {
  title: 'cta/withdraw',
  component: TestedComponent,
  argTypes: {
  },
};

export const WithdrawWithFee = createExample(TestedComponent, {
  details: {
    exchangeInfo: {
      baseUrl: 'exchange.demo.taler.net'
    } as ExchangeRecord,
    withdrawFee: {
      currency: 'USD',
      fraction: amountFractionalBase*0.5,
      value: 0
    },
  } as ExchangeWithdrawDetails,
  amount: 'USD:2',
})
export const WithdrawWithoutFee = createExample(TestedComponent, {
  details: {
    exchangeInfo: {
      baseUrl: 'exchange.demo.taler.net'
    } as ExchangeRecord,
    withdrawFee: {
      currency: 'USD',
      fraction: 0,
      value: 0
    },
  } as ExchangeWithdrawDetails,
  amount: 'USD:2',
})
