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
import { Loading } from "../../../components/exception/loading.js";
import { NotificationCard } from "../../../components/menu/index.js";
import { DeleteModal, PurgeModal } from "../../../components/modal/index.js";
import { MerchantBackend } from "../../../declaration.js";
import { HttpError } from "../../../hooks/backend.js";
import { useAdminAPI, useBackendInstances } from "../../../hooks/instance.js";
import { useTranslator } from "../../../i18n/index.js";
import { Notification } from "../../../utils/types.js";
import { View } from "./View.js";

interface Props {
  onCreate: () => void;
  onUpdate: (id: string) => void;
  instances: MerchantBackend.Instances.Instance[];
  onUnauthorized: () => VNode;
  onNotFound: () => VNode;
  onLoadError: (error: HttpError) => VNode;
  setInstanceName: (s: string) => void;
}

export default function Instances({
  onUnauthorized,
  onLoadError,
  onNotFound,
  onCreate,
  onUpdate,
  setInstanceName,
}: Props): VNode {
  const result = useBackendInstances();
  const [deleting, setDeleting] =
    useState<MerchantBackend.Instances.Instance | null>(null);
  const [purging, setPurging] =
    useState<MerchantBackend.Instances.Instance | null>(null);
  const { deleteInstance, purgeInstance } = useAdminAPI();
  const [notif, setNotif] = useState<Notification | undefined>(undefined);
  const i18n = useTranslator();

  if (result.clientError && result.isUnauthorized) return onUnauthorized();
  if (result.clientError && result.isNotfound) return onNotFound();
  if (result.loading) return <Loading />;
  if (!result.ok) return onLoadError(result);

  return (
    <Fragment>
      <NotificationCard notification={notif} />
      <View
        instances={result.data.instances}
        onDelete={setDeleting}
        onCreate={onCreate}
        onPurge={setPurging}
        onUpdate={onUpdate}
        setInstanceName={setInstanceName}
        selected={!!deleting}
      />
      {deleting && (
        <DeleteModal
          element={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={async (): Promise<void> => {
            try {
              await deleteInstance(deleting.id);
              // pushNotification({ message: 'delete_success', type: 'SUCCESS' })
              setNotif({
                message: i18n`Instance "${deleting.name}" (ID: ${deleting.id}) has been deleted`,
                type: "SUCCESS",
              });
            } catch (error) {
              setNotif({
                message: i18n`Failed to delete instance`,
                type: "ERROR",
                description: error instanceof Error ? error.message : undefined,
              });
              // pushNotification({ message: 'delete_error', type: 'ERROR' })
            }
            setDeleting(null);
          }}
        />
      )}
      {purging && (
        <PurgeModal
          element={purging}
          onCancel={() => setPurging(null)}
          onConfirm={async (): Promise<void> => {
            try {
              await purgeInstance(purging.id);
              setNotif({
                message: i18n`Instance "${purging.name}" (ID: ${purging.id}) has been disabled`,
                type: "SUCCESS",
              });
            } catch (error) {
              setNotif({
                message: i18n`Failed to purge instance`,
                type: "ERROR",
                description: error instanceof Error ? error.message : undefined,
              });
            }
            setPurging(null);
          }}
        />
      )}
    </Fragment>
  );
}
