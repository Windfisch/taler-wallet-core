/*
 This file is part of GNU Taler
 (C) 2021-2023 Taler Systems S.A.

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

import { h, VNode } from 'preact';
import { useState } from 'preact/hooks';
import { Loading } from "../../../../components/exception/loading.js";
import { NotificationCard } from "../../../../components/menu/index.js";
import { MerchantBackend, WithId } from "../../../../declaration.js";
import { HttpError } from "../../../../hooks/backend.js";
import { useInstanceProducts, useProductAPI } from "../../../../hooks/product.js";
import { useTranslator } from '../../../../i18n/index.js';
import { Notification } from "../../../../utils/types.js";
import { CardTable } from "./Table.js";

interface Props {
  onUnauthorized: () => VNode;
  onNotFound: () => VNode;
  onCreate: () => void;
  onSelect: (id: string) => void;
  onLoadError: (e: HttpError) => VNode;
}
export default function ProductList({ onUnauthorized, onLoadError, onCreate, onSelect, onNotFound }: Props): VNode {
  const result = useInstanceProducts()
  const { deleteProduct, updateProduct } = useProductAPI()
  const [notif, setNotif] = useState<Notification | undefined>(undefined)

  const i18n = useTranslator()

  if (result.clientError && result.isUnauthorized) return onUnauthorized()
  if (result.clientError && result.isNotfound) return onNotFound()
  if (result.loading) return <Loading />
  if (!result.ok) return onLoadError(result)

  return <section class="section is-main-section">
    <NotificationCard notification={notif} />

    <CardTable instances={result.data}
      onCreate={onCreate}
      onUpdate={(id, prod) => updateProduct(id, prod)
        .then(() => setNotif({
          message: i18n`product updated successfully`,
          type: "SUCCESS"
        })).catch((error) => setNotif({
          message: i18n`could not update the product`,
          type: "ERROR",
          description: error.message
        }))
      }
      onSelect={(product) => onSelect(product.id)}
      onDelete={(prod: (MerchantBackend.Products.ProductDetail & WithId)) => deleteProduct(prod.id)
        .then(() => setNotif({
          message: i18n`product delete successfully`,
          type: "SUCCESS"
        })).catch((error) => setNotif({
          message: i18n`could not delete the product`,
          type: "ERROR",
          description: error.message
        }))
      }
    />
  </section>
}