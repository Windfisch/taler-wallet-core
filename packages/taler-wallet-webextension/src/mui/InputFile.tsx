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

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */
import { ComponentChildren, h, VNode } from "preact";
import { useRef, useState } from "preact/hooks";
import { Button } from "./Button.js";
// import { MAX_IMAGE_SIZE as MAX_IMAGE_UPLOAD_SIZE } from "../../utils/constants";
// import { InputProps, useField } from "./useField";

const MAX_IMAGE_UPLOAD_SIZE = 1024 * 1024;

interface Props {
  children: ComponentChildren;
  onChange: (v: string) => void;
}

export function InputFile<T>({ onChange, children }: Props): VNode {
  const image = useRef<HTMLInputElement>(null);

  const [sizeError, setSizeError] = useState(false);

  return (
    <div>
      <p>
        <Button
          variant="contained"
          onClick={async () => image.current?.click()}
        >
          {children}
        </Button>
        <input
          ref={image}
          style={{ display: "none" }}
          type="file"
          name={String(name)}
          onChange={(e) => {
            const f: FileList | null = e.currentTarget.files;
            if (!f || f.length != 1) {
              return;
            }
            if (f[0].size > MAX_IMAGE_UPLOAD_SIZE) {
              setSizeError(true);
              return;
            }
            setSizeError(false);
            return f[0].arrayBuffer().then((b) => {
              const b64 = btoa(
                new Uint8Array(b).reduce(
                  (data, byte) => data + String.fromCharCode(byte),
                  "",
                ),
              );
              return onChange(`data:${f[0].type};base64,${b64}` as any);
            });
          }}
        />
      </p>
      {sizeError && <p>Image should be smaller than 1 MB</p>}
    </div>
  );
}
