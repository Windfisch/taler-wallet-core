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
import { NotificationCard } from "../../../components/menu/index.js";
import { MerchantBackend } from "../../../declaration.js";
import { useAdminAPI } from "../../../hooks/instance.js";
import { useTranslator } from "../../../i18n/index.js";
import { Notification } from "../../../utils/types.js";
import { CreatePage } from "./CreatePage.js";
import { InstanceCreatedSuccessfully } from "./InstanceCreatedSuccessfully.js";

interface Props {
  onBack?: () => void;
  onConfirm: () => void;
  forceId?: string;
}
export type Entity = MerchantBackend.Instances.InstanceConfigurationMessage;

export default function Create({ onBack, onConfirm, forceId }: Props): VNode {
  const { createInstance } = useAdminAPI();
  const [notif, setNotif] = useState<Notification | undefined>(undefined);
  const [createdOk, setCreatedOk] = useState<Entity | undefined>(undefined);
  const i18n = useTranslator();

  if (createdOk) {
    return (
      <InstanceCreatedSuccessfully entity={createdOk} onConfirm={onConfirm} />
    );
  }

  return (
    <Fragment>
      <NotificationCard notification={notif} />

      <CreatePage
        onBack={onBack}
        forceId={forceId}
        onCreate={(
          d: MerchantBackend.Instances.InstanceConfigurationMessage,
        ) => {
          return createInstance(d)
            .then(() => {
              setCreatedOk(d);
            })
            .catch((error) => {
              setNotif({
                message: i18n`Failed to create instance`,
                type: "ERROR",
                description: error.message,
              });
            });
        }}
      />
    </Fragment>
  );
}
