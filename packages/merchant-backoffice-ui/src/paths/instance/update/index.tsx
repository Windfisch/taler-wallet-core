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
import { Loading } from "../../../components/exception/loading.js";
import { NotificationCard } from "../../../components/menu/index.js";
import { useInstanceContext } from "../../../context/instance.js";
import { MerchantBackend } from "../../../declaration.js";
import { HttpError, HttpResponse } from "../../../hooks/backend.js";
import {
  useInstanceAPI,
  useInstanceDetails,
  useManagedInstanceDetails,
  useManagementAPI,
} from "../../../hooks/instance.js";
import { useTranslator } from "../../../i18n/index.js";
import { Notification } from "../../../utils/types.js";
import { UpdatePage } from "./UpdatePage.js";

export interface Props {
  onBack: () => void;
  onConfirm: () => void;

  onUnauthorized: () => VNode;
  onNotFound: () => VNode;
  onLoadError: (e: HttpError) => VNode;
  onUpdateError: (e: HttpError) => void;
}

export default function Update(props: Props): VNode {
  const { updateInstance, clearToken, setNewToken } = useInstanceAPI();
  const result = useInstanceDetails();
  return CommonUpdate(props, result, updateInstance, clearToken, setNewToken);
}

export function AdminUpdate(props: Props & { instanceId: string }): VNode {
  const { updateInstance, clearToken, setNewToken } = useManagementAPI(
    props.instanceId
  );
  const result = useManagedInstanceDetails(props.instanceId);
  return CommonUpdate(props, result, updateInstance, clearToken, setNewToken);
}

function CommonUpdate(
  {
    onBack,
    onConfirm,
    onLoadError,
    onNotFound,
    onUpdateError,
    onUnauthorized,
  }: Props,
  result: HttpResponse<MerchantBackend.Instances.QueryInstancesResponse>,
  updateInstance: any,
  clearToken: any,
  setNewToken: any
): VNode {
  const { changeToken } = useInstanceContext();
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
        onBack={onBack}
        isLoading={false}
        selected={result.data}
        onUpdate={(
          d: MerchantBackend.Instances.InstanceReconfigurationMessage
        ): Promise<void> => {
          return updateInstance(d)
            .then(onConfirm)
            .catch((error: Error) =>
              setNotif({
                message: i18n`Failed to create instance`,
                type: "ERROR",
                description: error.message,
              })
            );
        }}
        onChangeAuth={(
          d: MerchantBackend.Instances.InstanceAuthConfigurationMessage
        ): Promise<void> => {
          const apiCall =
            d.method === "external" ? clearToken() : setNewToken(d.token!);
          return apiCall
            .then(() => changeToken(d.token))
            .then(onConfirm)
            .catch(onUpdateError);
        }}
      />
    </Fragment>
  );
}
