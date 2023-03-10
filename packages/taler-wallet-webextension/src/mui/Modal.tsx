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
import { h, JSX, VNode, ComponentChildren } from "preact";
import { useCallback, useEffect, useRef, useState } from "preact/hooks";
// eslint-disable-next-line import/extensions
import { alpha } from "./colors/manipulation";
import { ModalManager } from "./ModalManager.js";
import { Portal } from "./Portal.js";
// eslint-disable-next-line import/extensions
import { theme } from "./style";

const baseStyle = css`
  position: fixed;
  z-index: ${theme.zIndex.modal};
  right: 0px;
  bottom: 0px;
  top: 0px;
  left: 0px;
`;

interface Props {
  class: string;
  children: ComponentChildren;
  open?: boolean;
  exited?: boolean;
  container?: VNode;
}

const defaultManager = new ModalManager();
const manager = defaultManager;

function getModal(): any {
  return null; //TODO: fix
}

export function Modal({
  open,
  // exited,
  class: _class,
  children,

  container,
  ...rest
}: Props): VNode {
  const [exited, setExited] = useState(true);
  const mountNodeRef = useRef<HTMLElement | undefined>(undefined);

  const isTopModal = useCallback(
    () => manager.isTopModal(getModal()),
    [manager],
  );

  const handlePortalRef = useEventCallback<HTMLElement[], void>((node) => {
    mountNodeRef.current = node;

    if (!node) {
      return;
    }

    // if (open && isTopModal()) {
    //   handleMounted();
    // } else {
    //   ariaHidden(modalRef.current, true);
    // }
  });

  return (
    <Portal
    // ref={mountNodeRef}
    // container={container}
    // disablePortal={disablePortal}
    >
      <div
        class={[_class, baseStyle].join(" ")}
        style={{
          visibility: !open && exited ? "hidden" : "visible",
        }}
      >
        {children}
      </div>
    </Portal>
  );
}

function getOffsetTop(rect: any, vertical: any): number {
  let offset = 0;

  if (typeof vertical === "number") {
    offset = vertical;
  } else if (vertical === "center") {
    offset = rect.height / 2;
  } else if (vertical === "bottom") {
    offset = rect.height;
  }

  return offset;
}

function getOffsetLeft(rect: any, horizontal: any): number {
  let offset = 0;

  if (typeof horizontal === "number") {
    offset = horizontal;
  } else if (horizontal === "center") {
    offset = rect.width / 2;
  } else if (horizontal === "right") {
    offset = rect.width;
  }

  return offset;
}

function getTransformOriginValue(transformOrigin: any): string {
  return [transformOrigin.horizontal, transformOrigin.vertical]
    .map((n) => (typeof n === "number" ? `${n}px` : n))
    .join(" ");
}

function resolveAnchorEl(anchorEl: any): any {
  return typeof anchorEl === "function" ? anchorEl() : anchorEl;
}

function useEventCallback<Args extends unknown[], Return>(
  fn: (...args: Args) => Return,
): (...args: Args) => Return {
  const ref = useRef(fn);
  useEffect(() => {
    ref.current = fn;
  });
  return useCallback(
    (...args: Args) =>
      // @ts-expect-error hide `this`
      // tslint:disable-next-line:ban-comma-operator
      (0, ref.current!)(...args),
    [],
  );
}
