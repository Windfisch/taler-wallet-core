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

import { h, VNode } from "preact";
import { Loading } from "../../../../components/exception/loading.js";
import { HttpError } from "../../../../hooks/backend.js";
import { useInstanceKYCDetails } from "../../../../hooks/instance.js";
import { ListPage } from "./ListPage.js";

interface Props {
  onUnauthorized: () => VNode;
  onLoadError: (error: HttpError) => VNode;
  onNotFound: () => VNode;
}

export default function ListKYC({
  onUnauthorized,
  onLoadError,
  onNotFound,
}: Props): VNode {
  const result = useInstanceKYCDetails();
  if (result.clientError && result.isUnauthorized) return onUnauthorized();
  if (result.clientError && result.isNotfound) return onNotFound();
  if (result.loading) return <Loading />;
  if (!result.ok) return onLoadError(result);

  const status = result.data.type === "ok" ? undefined : result.data.status;

  if (!status) {
    return <div>no kyc required</div>;
  }
  return <ListPage status={status} />;
}
