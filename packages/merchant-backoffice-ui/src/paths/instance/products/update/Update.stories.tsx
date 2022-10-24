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

import { h, VNode, FunctionalComponent } from 'preact';
import { UpdatePage as TestedComponent } from './UpdatePage';


export default {
  title: 'Pages/Product/Update',
  component: TestedComponent,
  argTypes: {
    onUpdate: { action: 'onUpdate' },
    onBack: { action: 'onBack' },
  },
};

function createExample<Props>(Component: FunctionalComponent<Props>, props: Partial<Props>) {
  const r = (args: any) => <Component {...args} />
  r.args = props
  return r
}

export const WithManagedStock = createExample(TestedComponent, {
  product: {
    product_id: '20102-ASDAS-QWE',
    description: 'description1',
    description_i18n: {} as any,
    image: '',
    price: 'TESTKUDOS:10',
    taxes: [],
    total_lost: 10,
    total_sold: 5,
    total_stock: 15,
    unit: 'bar',
    address: {}
  }
});

export const WithInfiniteStock = createExample(TestedComponent, {
  product: {
    product_id: '20102-ASDAS-QWE',
    description: 'description1',
    description_i18n: {} as any,
    image: '',
    price: 'TESTKUDOS:10',
    taxes: [],
    total_lost: 10,
    total_sold: 5,
    total_stock: -1,
    unit: 'bar',
    address: {}
  }
});
