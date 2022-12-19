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
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Loading } from "../../../components/exception/loading.js";
import { DeleteModal } from "../../../components/modal/index.js";
import { useInstanceContext } from "../../../context/instance.js";
import { HttpError } from "../../../hooks/backend.js";
import { useInstanceAPI, useInstanceDetails } from "../../../hooks/instance.js";
import { DetailPage } from "./DetailPage.js";

interface Props {
  onUnauthorized: () => VNode;
  onLoadError: (error: HttpError) => VNode;
  onUpdate: () => void;
  onNotFound: () => VNode;
  onDelete: () => void;
}

export default function Detail({
  onUpdate,
  onLoadError,
  onUnauthorized,
  onDelete,
  onNotFound,
}: Props): VNode {
  const { id } = useInstanceContext();
  const result = useInstanceDetails();
  const [deleting, setDeleting] = useState<boolean>(false);

  const { deleteInstance } = useInstanceAPI();

  if (result.clientError && result.isUnauthorized) return onUnauthorized();
  if (result.clientError && result.isNotfound) return onNotFound();
  if (result.loading) return <Loading />;
  if (!result.ok) return onLoadError(result);

  return (
    <Fragment>
      <DetailPage
        selected={result.data}
        onUpdate={onUpdate}
        onDelete={() => setDeleting(true)}
      />
      {deleting && (
        <DeleteModal
          element={{ name: result.data.name, id }}
          onCancel={() => setDeleting(false)}
          onConfirm={async (): Promise<void> => {
            try {
              await deleteInstance();
              onDelete();
            } catch (error) {}
            setDeleting(false);
          }}
        />
      )}
    </Fragment>
  );
}
