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
import { createSVG } from '../components/QR';
import { OfferRefund as TestedComponent } from './OfferRefund';


export default {
  title: 'OfferRefund',
  component: TestedComponent,
  argTypes: {
  },
};

function createExample<Props>(Component: FunctionalComponent<Props>, props: Partial<Props>) {
  const r = (args: any) => <Component {...args} />
  r.args = props
  return r
}

const REFUND_URI_EXAMPLE = 'taler://pay/backend.demo.taler.net/instances/blog/2021.249-022NW2KG88QGA/def537eb-00c2-4a8b-8a17-0be034d118d3?c=2Y4N4PMST7KYAPS83428GTPCD4'

export const Example = createExample(TestedComponent, {
  refundURI: REFUND_URI_EXAMPLE,
  qr_code: createSVG(REFUND_URI_EXAMPLE)
});
