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

import { classifyTalerUri, TalerUriType } from "@gnu-taler/taler-util";
import { styled } from "@linaria/react";
import { Fragment, h, VNode } from "preact";
import { Ref, useEffect, useRef, useState } from "preact/hooks";
import QrScanner from "qr-scanner";
import { Alert } from "../mui/Alert.js";
import { Button } from "../mui/Button.js";
import { TextField } from "../mui/TextField.js";

const QrVideo = styled.video`
  width: 80%;
  margin-left: auto;
  margin-right: auto;
  padding: 8px;
  background-color: black;
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  & > * {
    margin-bottom: 20px;
  }
`;

interface Props {
  onDetected: (url: string) => void;
}

export function QrReaderPage({ onDetected }: Props): VNode {
  const videoRef = useRef<HTMLVideoElement>(null);
  // const imageRef = useRef<HTMLImageElement>(null);
  const qrScanner = useRef<QrScanner | null>(null);
  const [value, onChange] = useState("");
  const [active, setActive] = useState(false);

  function start(): void {
    qrScanner.current!.start();
    onChange("");
    setActive(true);
  }
  function stop(): void {
    qrScanner.current!.stop();
    setActive(false);
  }

  function check(v: string) {
    return (
      v.startsWith("taler://") && classifyTalerUri(v) !== TalerUriType.Unknown
    );
  }

  useEffect(() => {
    if (!videoRef.current) {
      console.log("vide was not ready");
      return;
    }
    const elem = videoRef.current;
    setTimeout(() => {
      qrScanner.current = new QrScanner(
        elem,
        ({ data, cornerPoints }) => {
          if (check(data)) {
            onDetected(data);
            return;
          }
          onChange(data);
          stop();
        },
        {
          maxScansPerSecond: 5, //default 25
          highlightScanRegion: true,
        },
      );
      start();
    }, 1);
    return () => {
      qrScanner.current?.destroy();
    };
  }, []);

  const isValid = check(value);

  return (
    <Container>
      {/* <InputFile onChange={(f) => scanImage(imageRef, f)}>
        Read QR from file
      </InputFile>
      <div ref={imageRef} /> */}
      <QrVideo ref={videoRef} />
      <TextField
        label="Taler URI"
        variant="standard"
        fullWidth
        value={value}
        onChange={onChange}
      />
      {isValid && (
        <Button variant="contained" onClick={async () => onDetected(value)}>
          Open
        </Button>
      )}
      {!active && !isValid && (
        <Fragment>
          <Alert severity="error">
            URI is not valid. Taler URI should start with `taler://`
          </Alert>
          <Button variant="contained" onClick={async () => start()}>
            Try another
          </Button>
        </Fragment>
      )}
    </Container>
  );
}

async function scanImage(
  imageRef: Ref<HTMLImageElement>,
  image: string,
): Promise<void> {
  const imageEl = new Image();
  imageEl.src = image;
  imageEl.width = 200;
  imageRef.current!.appendChild(imageEl);
  QrScanner.scanImage(image, {
    alsoTryWithoutScanRegion: true,
  })
    .then((result) => console.log(result))
    .catch((error) => console.log(error || "No QR code found."));
}
