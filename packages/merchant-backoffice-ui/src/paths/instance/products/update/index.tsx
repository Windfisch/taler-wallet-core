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

import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Loading } from "../../../../components/exception/loading.js";
import { NotificationCard } from "../../../../components/menu/index.js";
import { MerchantBackend } from "../../../../declaration.js";
import { HttpError } from "../../../../hooks/backend.js";
import { useProductAPI, useProductDetails } from "../../../../hooks/product.js";
import { useTranslator } from "../../../../i18n/index.js";
import { Notification } from "../../../../utils/types.js";
import { UpdatePage } from "./UpdatePage.js";

export type Entity = MerchantBackend.Products.ProductAddDetail;
interface Props {
  onBack?: () => void;
  onConfirm: () => void;
  onUnauthorized: () => VNode;
  onNotFound: () => VNode;
  onLoadError: (e: HttpError) => VNode;
  pid: string;
}
export default function UpdateProduct({
  pid,
  onConfirm,
  onBack,
  onUnauthorized,
  onNotFound,
  onLoadError,
}: Props): VNode {
  const { updateProduct } = useProductAPI();
  const result = useProductDetails(pid);
  const [notif, setNotif] = useState<Notification | undefined>(undefined);

  const i18n = useTranslator();

  if (result.clientError && result.isUnauthorized) return onUnauthorized();
  if (result.clientError && result.isNotfound) return onNotFound();
  if (result.loading) return <Loading />;
  if (!result.ok) return onLoadError(result);

  return (
    <Fragment>
      <NotificationCard notification={notif} />
      <UpdatePage
        product={{ ...result.data, product_id: pid }}
        onBack={onBack}
        onUpdate={(data) => {
          return updateProduct(pid, data)
            .then(onConfirm)
            .catch((error) => {
              setNotif({
                message: i18n`could not create product`,
                type: "ERROR",
                description: error.message,
              });
            });
        }}
      />
    </Fragment>
  );
}
