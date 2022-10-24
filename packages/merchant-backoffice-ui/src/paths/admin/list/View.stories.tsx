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
import { View } from './View';


export default {
  title: 'Pages/Instance/List',
  component: View,
  argTypes: {
    onSelect: { action: 'onSelect' },
  },
};

export const Empty = (a: any) => <View {...a} />;
Empty.args = {
  instances: []
}

export const WithDefaultInstance = (a: any) => <View {...a} />;
WithDefaultInstance.args = {
  instances: [{
    id: 'default',
    name: 'the default instance',
    merchant_pub: 'abcdef',
    payment_targets: []
  }]
}

export const WithFiveInstance = (a: any) => <View {...a} />;
WithFiveInstance.args = {
  instances: [{
    id: 'first',
    name: 'the first instance',
    merchant_pub: 'abcdefgh',
    payment_targets: ['asd']
  }, {
    id: 'second',
    name: 'the second instance',
    merchant_pub: 'zxczxcz',
    payment_targets: ['asd']
  }, {
    id: 'third',
    name: 'the third instance',
    merchant_pub: 'QWEQWEWQE',
    payment_targets: ['asd']
  }, {
    id: 'other',
    name: 'the other instance',
    merchant_pub: 'FHJHGJGHJ',
    payment_targets: ['asd']
  }, {
    id: 'another',
    name: 'the another instance',
    merchant_pub: 'abcd3423423efgh',
    payment_targets: ['asd']
  }, {
    id: 'last',
    name: 'last instance',
    merchant_pub: 'zxcvvbnm',
    payment_targets: ['pay-to', 'asd']
  }]
}
