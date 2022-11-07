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

import { h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { CopiedIcon, CopyIcon } from "../svg/index.js";
import { ButtonBox, TooltipLeft } from "./styled/index.js";

export function CopyButton({
  getContent,
}: {
  getContent: () => string;
}): VNode {
  const [copied, setCopied] = useState(false);
  function copyText(): void {
    navigator.clipboard.writeText(getContent() || "");
    setCopied(true);
  }
  useEffect(() => {
    if (copied) {
      setTimeout(() => {
        setCopied(false);
      }, 1000);
    }
  }, [copied]);

  if (!copied) {
    return (
      <ButtonBox onClick={copyText}>
        <CopyIcon />
      </ButtonBox>
    );
  }
  return (
    <TooltipLeft content="Copied">
      <ButtonBox disabled>
        <CopiedIcon />
      </ButtonBox>
    </TooltipLeft>
  );
}
