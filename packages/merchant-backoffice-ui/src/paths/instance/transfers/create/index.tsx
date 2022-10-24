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

import { Fragment, h, VNode } from 'preact';
import { useState } from 'preact/hooks';
import { NotificationCard } from '../../../../components/menu';
import { MerchantBackend } from '../../../../declaration';
import { useInstanceDetails } from '../../../../hooks/instance';
import { useTransferAPI } from '../../../../hooks/transfer';
import { useTranslator } from '../../../../i18n';
import { Notification } from '../../../../utils/types';
import { CreatePage } from './CreatePage';

export type Entity = MerchantBackend.Transfers.TransferInformation
interface Props {
  onBack?: () => void;
  onConfirm: () => void;
}

export default function CreateTransfer({onConfirm, onBack}:Props): VNode {
  const { informTransfer } = useTransferAPI()
  const [notif, setNotif] = useState<Notification | undefined>(undefined)
  const i18n = useTranslator()
  const instance = useInstanceDetails()
  const accounts = !instance.ok ? [] : instance.data.accounts.map(a => a.payto_uri)

  return <>
    <NotificationCard notification={notif} />
    <CreatePage
      onBack={onBack}
      accounts={accounts}
      onCreate={(request: MerchantBackend.Transfers.TransferInformation) => {
        return informTransfer(request).then(() => onConfirm()).catch((error) => {
          setNotif({
            message: i18n`could not inform transfer`,
            type: "ERROR",
            description: error.message
          })
        })
      }} />
  </>
}