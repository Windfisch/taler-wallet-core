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

import { createExample } from '../test-utils';
import { CreateManualWithdraw as TestedComponent } from './CreateManualWithdraw';

export default {
  title: 'wallet/manual withdraw/creation',
  component: TestedComponent,
  argTypes: {
  }
};


export const InitialState = createExample(TestedComponent, {
});

export const WithExchangeFilled = createExample(TestedComponent, {
  currency: 'COL',
  initialExchange: 'http://exchange.taler:8081',
});

export const WithExchangeAndAmountFilled = createExample(TestedComponent, {
  currency: 'COL',
  initialExchange: 'http://exchange.taler:8081',
  initialAmount: '10'
});

export const WithExchangeError = createExample(TestedComponent, {
  initialExchange: 'http://exchange.tal',
  error: 'The exchange url seems invalid'
});

export const WithAmountError = createExample(TestedComponent, {
  currency: 'COL',
  initialExchange: 'http://exchange.taler:8081',
  initialAmount: 'e'
});
