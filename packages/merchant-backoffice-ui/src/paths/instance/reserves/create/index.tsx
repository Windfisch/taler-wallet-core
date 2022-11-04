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

import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { NotificationCard } from "../../../../components/menu.js";
import { MerchantBackend } from "../../../../declaration.js";
import { useReservesAPI } from "../../../../hooks/reserves.js";
import { useTranslator } from "../../../../i18n";
import { Notification } from "../../../../utils/types.js";
import { CreatedSuccessfully } from "./CreatedSuccessfully.js";
import { CreatePage } from "./CreatePage.js";
interface Props {
  onBack: () => void;
  onConfirm: () => void;
}
export default function CreateReserve({ onBack, onConfirm }: Props): VNode {
  const { createReserve } = useReservesAPI();
  const [notif, setNotif] = useState<Notification | undefined>(undefined);
  const i18n = useTranslator();

  const [createdOk, setCreatedOk] = useState<
    | {
        request: MerchantBackend.Tips.ReserveCreateRequest;
        response: MerchantBackend.Tips.ReserveCreateConfirmation;
      }
    | undefined
  >(undefined);

  if (createdOk) {
    return <CreatedSuccessfully entity={createdOk} onConfirm={onConfirm} />;
  }

  return (
    <Fragment>
      <NotificationCard notification={notif} />
      <CreatePage
        onBack={onBack}
        onCreate={(request: MerchantBackend.Tips.ReserveCreateRequest) => {
          return createReserve(request)
            .then((r) => setCreatedOk({ request, response: r.data }))
            .catch((error) => {
              setNotif({
                message: i18n`could not create reserve`,
                type: "ERROR",
                description: error.message,
              });
            });
        }}
      />
    </Fragment>
  );
}
