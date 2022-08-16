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
import { useRef } from "preact/hooks";
import { Paper } from "../Paper.js";

function hasValue(value: any): boolean {
  return value != null && !(Array.isArray(value) && value.length === 0);
}

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

// export function SelectStandard({ value }: any): VNode {
//   return (
//     <Fragment>
//       <div class={SelectSelect} role="button">
//         {!value ? (
//           // notranslate needed while Google Translate will not fix zero-width space issue
//           <span className="notranslate">&#8203;</span>
//         ) : (
//           value
//         )}
//         <input
//           class={SelectNativeInput}
//           aria-hidden
//           tabIndex={-1}
//           value={Array.isArray(value) ? value.join(",") : value}
//         />
//       </div>
//     </Fragment>
//   );
// }
function isFilled(obj: any, SSR = false): boolean {
  return (
    obj &&
    ((hasValue(obj.value) && obj.value !== "") ||
      (SSR && hasValue(obj.defaultValue) && obj.defaultValue !== ""))
  );
}
function isEmpty(display: any): boolean {
  return display == null || (typeof display === "string" && !display.trim());
}

export function SelectStandard({
  value,
  multiple,
  displayEmpty,
  onBlur,
  onChange,
  onClose,
  onFocus,
  onOpen,
  renderValue,
  menuMinWidthState,
}: any): VNode {
  const inputRef = useRef(null);
  const displayRef = useRef(null);

  let display;
  let computeDisplay = false;
  let foundMatch = false;
  let displaySingle;
  const displayMultiple: any[] = [];
  if (isFilled({ value }) || displayEmpty) {
    if (renderValue) {
      display = renderValue(value);
    } else {
      computeDisplay = true;
    }
  }
  if (computeDisplay) {
    if (multiple) {
      if (displayMultiple.length === 0) {
        display = null;
      } else {
        display = displayMultiple.reduce((output, child, index) => {
          output.push(child);
          if (index < displayMultiple.length - 1) {
            output.push(", ");
          }
          return output;
        }, []);
      }
    } else {
      display = displaySingle;
    }
  }

  // Avoid performing a layout computation in the render method.
  let menuMinWidth = menuMinWidthState;

  // if (!autoWidth && isOpenControlled && displayNode) {
  //   menuMinWidth = displayNode.clientWidth;
  // }

  // let tabIndex;
  // if (typeof tabIndexProp !== "undefined") {
  //   tabIndex = tabIndexProp;
  // } else {
  //   tabIndex = disabled ? null : 0;
  // }
  const update = (open: any, event: any) => {
    if (open) {
      if (onOpen) {
        onOpen(event);
      }
    } else if (onClose) {
      onClose(event);
    }

    // if (!isOpenControlled) {
    //   setMenuMinWidthState(autoWidth ? null : displayNode.clientWidth);
    //   setOpenState(open);
    // }
  };

  const handleMouseDown = (event: any) => {
    // Ignore everything but left-click
    if (event.button !== 0) {
      return;
    }
    // Hijack the default focus behavior.
    event.preventDefault();
    // displayRef.current.focus();

    update(true, event);
  };
  return (
    <Fragment>
      <div
        class={css`
          height: auto;
          min-height: 14375em;
          text-overflow: ellipsis;
          white-space: nowrap;
          overflow: hidden;
        `}
      >
        {isEmpty(display) ? (
          // notranslate needed while Google Translate will not fix zero-width space issue
          <span class="notranslate">&#8203;</span>
        ) : (
          display
        )}
      </div>
      <input
        class={css`
          bottom: 0px;
          left: 0px;
          position: "absolute";
          opacity: 0;
          pointer-events: none;
          width: 100%;
          box-sizing: border-box;
        `}
      />
      <svg />
    </Fragment>
  );
}

// function Popover(): VNode {
//   return;
// }

// function Menu(): VNode {
//   return <Paper></Paper>;
// }
