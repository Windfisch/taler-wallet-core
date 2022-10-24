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

import { ComponentChildren, h } from "preact";
import { LoadingModal } from "../modal";
import { useAsync } from "../../hooks/async";
import { Translate } from "../../i18n";

type Props = {
  children: ComponentChildren,
  disabled: boolean;
  onClick?: () => Promise<void>;
  [rest:string]: any,
};

export function AsyncButton({ onClick, disabled, children, ...rest }: Props) {
  const { isSlow, isLoading, request, cancel } = useAsync(onClick);

  if (isSlow) {
    return <LoadingModal onCancel={cancel} />;
  }
  if (isLoading) {
    return <button class="button"><Translate>Loading...</Translate></button>;
  }

  return <span {...rest}>
    <button class="button is-success" onClick={request} disabled={disabled}>
      {children}
    </button>
  </span>;
}
