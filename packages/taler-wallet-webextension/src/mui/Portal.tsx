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
import { createPortal, forwardRef } from "preact/compat";
import {
  h,
  JSX,
  VNode,
  ComponentChildren,
  RefObject,
  isValidElement,
  cloneElement,
  Fragment,
} from "preact";
import { Ref, useEffect, useMemo, useState } from "preact/hooks";
// eslint-disable-next-line import/extensions
import { alpha } from "./colors/manipulation";
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
  // class: string;
  children: ComponentChildren;
  disablePortal?: boolean;
  container?: VNode;
}

export const Portal = forwardRef(function Portal(
  { container, disablePortal, children }: Props,
  ref: Ref<any>,
): VNode {
  const [mountNode, setMountNode] = useState<HTMLElement | undefined>(
    undefined,
  );
  const handleRef = null;
  // useForkRef(
  //   isValidElement(children) ? children.ref : null,
  //   ref,
  // );

  useEffect(() => {
    if (!disablePortal) {
      setMountNode(getContainer(container) || document.body);
    }
  }, [container, disablePortal]);

  useEffect(() => {
    if (mountNode && !disablePortal) {
      setRef(ref, mountNode);
      return () => {
        setRef(ref, null);
      };
    }

    return undefined;
  }, [ref, mountNode, disablePortal]);

  if (disablePortal) {
    if (isValidElement(children)) {
      return cloneElement(children, {
        ref: handleRef,
      });
    }
    return <Fragment>{children}</Fragment>;
  }

  return mountNode ? (
    createPortal(<Fragment>{children}</Fragment>, mountNode)
  ) : (
    <Fragment />
  );
} as any);

function getContainer(container: any): any {
  return typeof container === "function" ? container() : container;
}

// function useForkRef<Instance>(
//   refA: React.Ref<Instance> | null | undefined,
//   refB: React.Ref<Instance> | null | undefined,
// ): React.Ref<Instance> | null {
//   /**
//    * This will create a new function if the ref props change and are defined.
//    * This means react will call the old forkRef with `null` and the new forkRef
//    * with the ref. Cleanup naturally emerges from this behavior.
//    */
//   return useMemo(() => {
//     if (refA == null && refB == null) {
//       return null;
//     }
//     return (refValue) => {
//       setRef(refA, refValue);
//       setRef(refB, refValue);
//     };
//   }, [refA, refB]);
// }

function setRef<T>(
  ref: RefObject<T | null> | ((instance: T | null) => void) | null | undefined,
  value: T | null,
): void {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}
