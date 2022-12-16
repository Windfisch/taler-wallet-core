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
import { Loading } from "../../../../components/exception/loading.js";
import { HttpError } from "../../../../hooks/backend.js";
import { useReserveDetails } from "../../../../hooks/reserves.js";
import { DetailPage } from "./DetailPage.js";

interface Props {
  rid: string;

  onUnauthorized: () => VNode;
  onLoadError: (error: HttpError) => VNode;
  onNotFound: () => VNode;
  onDelete: () => void;
  onBack: () => void;
}
export default function DetailReserve({
  rid,
  onUnauthorized,
  onLoadError,
  onNotFound,
  onBack,
  onDelete,
}: Props): VNode {
  const result = useReserveDetails(rid);

  if (result.clientError && result.isUnauthorized) return onUnauthorized();
  if (result.clientError && result.isNotfound) return onNotFound();
  if (result.loading) return <Loading />;
  if (!result.ok) return onLoadError(result);
  return (
    <Fragment>
      <DetailPage selected={result.data} onBack={onBack} id={rid} />
    </Fragment>
  );
}
