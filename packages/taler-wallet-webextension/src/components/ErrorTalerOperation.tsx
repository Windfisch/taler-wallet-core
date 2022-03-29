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
import { TalerErrorDetail } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import arrowDown from "../svg/chevron-down.svg";
import { useDevContext } from "../context/devContext.js";
import { ErrorBox } from "./styled/index.js";

export function ErrorTalerOperation({
  title,
  error,
}: {
  title?: VNode;
  error?: TalerErrorDetail;
}): VNode | null {
  const { devMode } = useDevContext();
  const [showErrorDetail, setShowErrorDetail] = useState(false);

  if (!title || !error) return null;
  // const errorCode: number | undefined = (error.details as any)?.errorResponse?.code
  const errorHint: string | undefined = (error.details as any)?.errorResponse
    ?.hint;

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
            <div
              style={{
                transform: !showErrorDetail ? undefined : "scaleY(-1)",
                height: 24,
              }}
              dangerouslySetInnerHTML={{ __html: arrowDown }}
            />
          </button>
        )}
      </div>
      {showErrorDetail && (
        <Fragment>
          <div style={{ padding: 5, textAlign: "left" }}>
            <div>
              <b>{error.hint}</b> {!errorHint ? "" : `: ${errorHint}`}{" "}
            </div>
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
