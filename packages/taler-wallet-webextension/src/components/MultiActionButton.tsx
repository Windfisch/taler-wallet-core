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
import { getUnpackedSettings } from "http2";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Button } from "../mui/Button.js";
import arrowDown from "../svg/chevron-down.svg";
import { ParagraphClickable } from "./styled/index.js";

export interface Props {
  label: (s: string) => VNode;
  actions: string[];
  onClick: (s: string) => Promise<void>;
}

/**
 * functionality: it will receive a list of actions, take the first actions as
 * the first chosen action
 * the user may change the chosen action
 * when the user click the button it will call onClick with the chosen action
 * as argument
 *
 * visually: it is a primary button with a select handler on the right
 *
 * @returns
 */
export function MultiActionButton({
  label,
  actions,
  onClick: doClick,
}: Props): VNode {
  const defaultAction = actions.length > 0 ? actions[0] : "";

  const [opened, setOpened] = useState(false);
  const [selected, setSelected] = useState<string>(defaultAction);

  const canChange = actions.length > 1;
  const options = canChange ? actions.filter((a) => a !== selected) : [];
  function select(m: string): void {
    setSelected(m);
    setOpened(false);
  }

  if (!canChange) {
    return (
      <Button variant="contained" onClick={() => doClick(selected)}>
        {label(selected)}
      </Button>
    );
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {opened && (
        <div
          style={{
            position: "absolute",
            bottom: 32 + 5,
            right: 0,
            marginLeft: 8,
            marginRight: 8,
            borderRadius: 5,
            border: "1px solid blue",
            background: "white",
            boxShadow: "0px 8px 16px 0px rgba(0,0,0,0.2)",
            zIndex: 1,
          }}
        >
          {options.map((m) => (
            <ParagraphClickable key={m} onClick={() => select(m)}>
              {label(m)}
            </ParagraphClickable>
          ))}
        </div>
      )}
      <Button
        variant="contained"
        onClick={() => doClick(selected)}
        style={{
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          marginRight: 0,
          // maxWidth: 170,
          overflowX: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label(selected)}
      </Button>

      <Button
        variant="outlined"
        onClick={async () => setOpened((s) => !s)}
        style={{
          marginLeft: 0,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          paddingLeft: 4,
          paddingRight: 4,
          minWidth: "unset",
        }}
      >
        <div
          style={{
            height: 24,
            width: 24,
            marginLeft: 4,
            marginRight: 4,
            // fill: "white",
          }}
          dangerouslySetInnerHTML={{ __html: arrowDown }}
        />
      </Button>
    </div>
  );
}
