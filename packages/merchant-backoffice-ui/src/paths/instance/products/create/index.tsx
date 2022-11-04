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
import { NotificationCard } from "../../../../components/menu.js";
import { MerchantBackend } from "../../../../declaration.js";
import { useProductAPI } from "../../../../hooks/product.js";
import { useTranslator } from '../../../../i18n';
import { Notification } from "../../../../utils/types.js";
import { CreatePage } from "./CreatePage.js";

export type Entity = MerchantBackend.Products.ProductAddDetail
interface Props {
  onBack?: () => void;
  onConfirm: () => void;
}
export default function CreateProduct({ onConfirm, onBack }: Props): VNode {
  const { createProduct } = useProductAPI()
  const [notif, setNotif] = useState<Notification | undefined>(undefined)
  const i18n = useTranslator()
  
  return <Fragment>
    <NotificationCard notification={notif} />
    <CreatePage
      onBack={onBack}
      onCreate={(request: MerchantBackend.Products.ProductAddDetail) => {
        return createProduct(request).then(() => onConfirm()).catch((error) => {
          setNotif({
            message: i18n`could not create product`,
            type: "ERROR",
            description: error.message
          })
        })
      }} />
  </Fragment>
}