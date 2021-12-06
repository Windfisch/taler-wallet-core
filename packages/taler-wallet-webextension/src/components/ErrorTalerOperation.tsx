/*
 This file is part of GNU Taler
 (C) 2019 Taler Systems SA

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
import { TalerErrorDetails } from "@gnu-taler/taler-util";
import { VNode, h, Fragment } from "preact";
import { useState } from "preact/hooks";
import arrowDown from "../../static/img/chevron-down.svg";
import { useDevContext } from "../context/devContext";
import { ErrorBox } from "./styled";

export function ErrorTalerOperation({
  title,
  error,
}: {
  title?: string;
  error?: TalerErrorDetails;
}): VNode | null {
  const { devMode } = useDevContext();
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  if (!title || !error) return null;
  return (
    <ErrorBox style={{ paddingTop: 0, paddingBottom: 0 }}>
      <div>
        <p>{title}</p>
        {error && (
          <button
            onClick={() => {
              setShowErrorDetail((v) => !v);
            }}
          >
            <img style={{ height: "1.5em" }} src={arrowDown} />
          </button>
        )}
      </div>
      {showErrorDetail && (
        <Fragment>
          <div style={{ padding: 5, textAlign: "left" }}>
            <div>{error.message}</div>
          </div>
          {devMode && (
            <div style={{ textAlign: "left", overflowX: "auto" }}>
              <pre>{JSON.stringify(error, undefined, 2)}</pre>
            </div>
          )}
        </Fragment>
      )}
    </ErrorBox>
  );
}
