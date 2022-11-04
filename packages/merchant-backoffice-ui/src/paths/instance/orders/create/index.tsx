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
import { Loading } from "../../../../components/exception/loading.js";
import { NotificationCard } from "../../../../components/menu.js";
import { MerchantBackend } from "../../../../declaration.js";
import { HttpError } from "../../../../hooks/backend.js";
import { useInstanceDetails } from "../../../../hooks/instance.js";
import { useOrderAPI } from "../../../../hooks/order.js";
import { useInstanceProducts } from "../../../../hooks/product.js";
import { Notification } from "../../../../utils/types.js";
import { CreatePage } from "./CreatePage.js";
import { OrderCreatedSuccessfully } from "./OrderCreatedSuccessfully.js";

export type Entity = {
  request: MerchantBackend.Orders.PostOrderRequest,
  response: MerchantBackend.Orders.PostOrderResponse
}
interface Props {
  onBack?: () => void;
  onConfirm: () => void;
  onUnauthorized: () => VNode;
  onNotFound: () => VNode;
  onLoadError: (error: HttpError) => VNode;
}
export default function OrderCreate({ onConfirm, onBack, onLoadError, onNotFound, onUnauthorized }: Props): VNode {
  const { createOrder } = useOrderAPI()
  const [notif, setNotif] = useState<Notification | undefined>(undefined)

  const detailsResult = useInstanceDetails()
  const inventoryResult = useInstanceProducts()

  if (detailsResult.clientError && detailsResult.isUnauthorized) return onUnauthorized()
  if (detailsResult.clientError && detailsResult.isNotfound) return onNotFound()
  if (detailsResult.loading) return <Loading />
  if (!detailsResult.ok) return onLoadError(detailsResult)

  if (inventoryResult.clientError && inventoryResult.isUnauthorized) return onUnauthorized()
  if (inventoryResult.clientError && inventoryResult.isNotfound) return onNotFound()
  if (inventoryResult.loading) return <Loading />
  if (!inventoryResult.ok) return onLoadError(inventoryResult)

  return <Fragment>
    
    <NotificationCard notification={notif} />

    <CreatePage
      onBack={onBack}
      onCreate={(request: MerchantBackend.Orders.PostOrderRequest) => {
        createOrder(request).then(onConfirm).catch((error) => {
          setNotif({
            message: 'could not create order',
            type: "ERROR",
            description: error.message
          })
        })
      }} 
      instanceConfig={detailsResult.data}
      instanceInventory={inventoryResult.data}
      />
  </Fragment>
}
