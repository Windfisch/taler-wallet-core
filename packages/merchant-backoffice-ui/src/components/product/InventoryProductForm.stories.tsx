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
import { InventoryProductForm as TestedComponent } from "./InventoryProductForm.js";


export default {
  title: 'Components/Product/Add',
  component: TestedComponent,
  argTypes: {
    onAddProduct: { action: 'onAddProduct' },
  },
};

function createExample<Props>(Component: FunctionalComponent<Props>, props: Partial<Props>) {
  const r = (args: any) => <Component {...args} />
  r.args = props
  return r
}

export const WithASimpleList = createExample(TestedComponent, {
  inventory:[{
    id: 'this id',
    description: 'this is the description',
  } as any]
});

export const WithAProductSelected = createExample(TestedComponent, {
  inventory:[],
  currentProducts: {
    thisid: {
      quantity: 1,
      product: {
        id: 'asd',
        description: 'asdsadsad',
      } as any
    }
  }
});
