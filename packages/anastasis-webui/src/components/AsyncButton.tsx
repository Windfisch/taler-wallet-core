/*
 This file is part of GNU Anastasis
 (C) 2021-2022 Anastasis SARL

 GNU Anastasis is free software; you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Anastasis is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with
 GNU Anastasis; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { ComponentChildren, h, VNode } from "preact";
import { useLayoutEffect, useRef } from "preact/hooks";
import { useAsync } from "../hooks/async.js";

type Props = {
  children: ComponentChildren;
  disabled?: boolean;
  onClick?: () => Promise<void>;
  grabFocus?: boolean;
  [rest: string]: any;
};

export function AsyncButton({
  onClick,
  grabFocus,
  disabled,
  children,
  ...rest
}: Props): VNode {
  const { isLoading, request } = useAsync(onClick);

  const buttonRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    if (grabFocus) {
      buttonRef.current?.focus();
    }
  }, [grabFocus]);

  // if (isSlow) {
  //   return <LoadingModal onCancel={cancel} />;
  // }
  if (isLoading) {
    return <button class="button">Loading...</button>;
  }

  return (
    <span data-tooltip={rest["data-tooltip"]} style={{ marginLeft: 5 }}>
      <button {...rest} ref={buttonRef} onClick={request} disabled={disabled}>
        {children}
      </button>
    </span>
  );
}
