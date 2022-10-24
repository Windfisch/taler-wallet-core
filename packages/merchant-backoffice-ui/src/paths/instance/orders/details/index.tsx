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
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Loading } from "../../../../components/exception/loading";
import { NotificationCard } from "../../../../components/menu";
import { HttpError } from "../../../../hooks/backend";
import { useOrderDetails, useOrderAPI } from "../../../../hooks/order";
import { useTranslator } from "../../../../i18n";
import { Notification } from "../../../../utils/types";
import { DetailPage } from "./DetailPage";

export interface Props {
  oid: string;

  onBack: () => void;
  onUnauthorized: () => VNode;
  onNotFound: () => VNode;
  onLoadError: (error: HttpError) => VNode;
}

export default function Update({ oid, onBack, onLoadError, onNotFound, onUnauthorized }: Props): VNode {
  const { refundOrder } = useOrderAPI();
  const result = useOrderDetails(oid)
  const [notif, setNotif] = useState<Notification | undefined>(undefined)

  const i18n = useTranslator()

  if (result.clientError && result.isUnauthorized) return onUnauthorized()
  if (result.clientError && result.isNotfound) return onNotFound()
  if (result.loading) return <Loading />
  if (!result.ok) return onLoadError(result)

  return <Fragment>

    <NotificationCard notification={notif} />

    <DetailPage
      onBack={onBack}
      id={oid}
      onRefund={(id, value) => refundOrder(id, value)
        .then(() => setNotif({
          message: i18n`refund created successfully`,
          type: "SUCCESS"
        })).catch((error) => setNotif({
          message: i18n`could not create the refund`,
          type: "ERROR",
          description: error.message
        }))
      }
      selected={result.data}
    />
  </Fragment>
}