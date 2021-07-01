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

import { ProviderPaymentType } from '@gnu-taler/taler-wallet-core/src/operations/backup';
import { FunctionalComponent } from 'preact';
import { BackupView as TestedComponent } from './BackupPage';

export default {
  title: 'popup/backup/list',
  component: TestedComponent,
  argTypes: {
    onRetry: { action: 'onRetry' },
    onDelete: { action: 'onDelete' },
    onBack: { action: 'onBack' },
  }
};


function createExample<Props>(Component: FunctionalComponent<Props>, props: Partial<Props>) {
  const r = (args: any) => <Component {...args} />
  r.args = props
  return r
}

export const Example = createExample(TestedComponent, {
  deviceName: "somedevicename",
  providers: {
    ARS: {
      "active": true,
      "syncProviderBaseUrl": "http://sync.taler:9967/",
      "lastSuccessfulBackupTimestamp": {
        "t_ms": 1625063925078
      },
      "paymentProposalIds": [
        "43Q5WWRJPNS4SE9YKS54H9THDS94089EDGXW9EHBPN6E7M184XEG"
      ],
      "paymentStatus": {
        "type": ProviderPaymentType.Paid,
        "paidUntil": {
          "t_ms": 1656599921000
        }
      },
      "terms": {
        "annualFee": "ARS:1",
        "storageLimitInMegabytes": 16,
        "supportedProtocolVersion": "0.0"
      }
    },
    KUDOS: {
      "active": false,
      "syncProviderBaseUrl": "http://sync.demo.taler.net/",
      "paymentProposalIds": [],
      "paymentStatus": {
        "type": ProviderPaymentType.Unpaid,
      },
      "terms": {
        "annualFee": "KUDOS:0.1",
        "storageLimitInMegabytes": 16,
        "supportedProtocolVersion": "0.0"
      }
    },
    USD: undefined,
    EUR: undefined
  }
});


