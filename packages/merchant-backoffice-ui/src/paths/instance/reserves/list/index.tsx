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

import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Loading } from "../../../../components/exception/loading.js";
import { NotificationCard } from "../../../../components/menu/index.js";
import { MerchantBackend } from "../../../../declaration.js";
import { HttpError } from "../../../../hooks/backend.js";
import {
  useInstanceReserves,
  useReservesAPI,
} from "../../../../hooks/reserves.js";
import { useTranslator } from "../../../../i18n/index.js";
import { Notification } from "../../../../utils/types.js";
import { CardTable } from "./Table.js";
import { AuthorizeTipModal } from "./AutorizeTipModal.js";

interface Props {
  onUnauthorized: () => VNode;
  onLoadError: (e: HttpError) => VNode;
  onSelect: (id: string) => void;
  onNotFound: () => VNode;
  onCreate: () => void;
}

interface TipConfirmation {
  response: MerchantBackend.Tips.TipCreateConfirmation;
  request: MerchantBackend.Tips.TipCreateRequest;
}

export default function ListTips({
  onUnauthorized,
  onLoadError,
  onNotFound,
  onSelect,
  onCreate,
}: Props): VNode {
  const result = useInstanceReserves();
  const { deleteReserve, authorizeTipReserve } = useReservesAPI();
  const [notif, setNotif] = useState<Notification | undefined>(undefined);
  const i18n = useTranslator();
  const [reserveForTip, setReserveForTip] = useState<string | undefined>(
    undefined
  );
  const [tipAuthorized, setTipAuthorized] = useState<
    TipConfirmation | undefined
  >(undefined);

  if (result.clientError && result.isUnauthorized) return onUnauthorized();
  if (result.clientError && result.isNotfound) return onNotFound();
  if (result.loading) return <Loading />;
  if (!result.ok) return onLoadError(result);

  return (
    <section class="section is-main-section">
      <NotificationCard notification={notif} />

      {reserveForTip && (
        <AuthorizeTipModal
          onCancel={() => {
            setReserveForTip(undefined);
            setTipAuthorized(undefined);
          }}
          tipAuthorized={tipAuthorized}
          onConfirm={async (request) => {
            try {
              const response = await authorizeTipReserve(
                reserveForTip,
                request
              );
              setTipAuthorized({
                request,
                response: response.data,
              });
            } catch (error) {
              setNotif({
                message: i18n`could not create the tip`,
                type: "ERROR",
                description: error instanceof Error ? error.message : undefined,
              });
              setReserveForTip(undefined);
            }
          }}
        />
      )}

      <CardTable
        instances={result.data.reserves
          .filter((r) => r.active)
          .map((o) => ({ ...o, id: o.reserve_pub }))}
        onCreate={onCreate}
        onDelete={(reserve) => deleteReserve(reserve.reserve_pub)}
        onSelect={(reserve) => onSelect(reserve.id)}
        onNewTip={(reserve) => setReserveForTip(reserve.id)}
      />
    </section>
  );
}
