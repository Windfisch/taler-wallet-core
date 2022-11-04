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

import { h, VNode } from 'preact';
import { useState } from 'preact/hooks';
import { Loading } from "../../../../components/exception/loading.js";
import { MerchantBackend } from "../../../../declaration.js";
import { HttpError } from "../../../../hooks/backend.js";
import { useInstanceDetails } from "../../../../hooks/instance.js";
import { useInstanceTransfers } from "../../../../hooks/transfer.js";
import { ListPage } from "./ListPage.js";

interface Props {
  onUnauthorized: () => VNode;
  onLoadError: (error: HttpError) => VNode;
  onNotFound: () => VNode;
  onCreate: () => void;
}
interface Form {
  verified?: 'yes' | 'no';
  payto_uri?: string;
}

export default function ListTransfer({ onUnauthorized, onLoadError, onCreate, onNotFound }: Props): VNode {
  const [form, setForm] = useState<Form>({ payto_uri: '' })
  const setFilter = (s?: 'yes' | 'no') => setForm({ ...form, verified: s })

  const [position, setPosition] = useState<string | undefined>(undefined)

  const instance = useInstanceDetails()
  const accounts = !instance.ok ? [] : instance.data.accounts.map(a => a.payto_uri)

  const isVerifiedTransfers = form.verified === 'yes'
  const isNonVerifiedTransfers = form.verified === 'no'
  const isAllTransfers = form.verified === undefined

  const result = useInstanceTransfers({
    position,
    payto_uri: form.payto_uri === '' ? undefined : form.payto_uri,
    verified: form.verified,
  }, (id) => setPosition(id))

  if (result.clientError && result.isUnauthorized) return onUnauthorized()
  if (result.clientError && result.isNotfound) return onNotFound()
  if (result.loading) return <Loading />
  if (!result.ok) return onLoadError(result)

  return <ListPage
    accounts={accounts}
    transfers={result.data.transfers}
    onLoadMoreBefore={result.isReachingStart ? result.loadMorePrev : undefined}
    onLoadMoreAfter={result.isReachingEnd ? result.loadMore : undefined}
    onCreate={onCreate} 
    onDelete={() => {null}}
    // position={position} setPosition={setPosition}
    onShowAll={() => setFilter(undefined)}
    onShowUnverified={() => setFilter('no')}
    onShowVerified={() => setFilter('yes')}
    isAllTransfers={isAllTransfers}
    isVerifiedTransfers={isVerifiedTransfers}
    isNonVerifiedTransfers={isNonVerifiedTransfers}
    payTo={form.payto_uri}
    onChangePayTo={(p) => setForm(v => ({ ...v, payto_uri: p }))}
  />

}

