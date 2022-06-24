/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
import { css } from "@linaria/core";
import { h, VNode, Fragment } from "preact";

const SelectSelect = css`
  height: "auto";
  min-height: "1.4374em";
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
`;

const SelectIcon = css``;

const SelectNativeInput = css`
  bottom: 0px;
  left: 0px;
  position: "absolute";
  opacity: 0px;
  pointer-events: "none";
  width: 100%;
  box-sizing: border-box;
`;

export function SelectStandard({ value }: any): VNode {
  return (
    <Fragment>
      <div class={SelectSelect} role="button">
        {!value ? (
          // notranslate needed while Google Translate will not fix zero-width space issue
          <span className="notranslate">&#8203;</span>
        ) : (
          value
        )}
        <input
          class={SelectNativeInput}
          aria-hidden
          tabIndex={-1}
          value={Array.isArray(value) ? value.join(",") : value}
        />
      </div>
    </Fragment>
  );
}
