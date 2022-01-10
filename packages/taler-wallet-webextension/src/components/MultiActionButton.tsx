import { h, VNode } from "preact";
import arrowDown from "../../static/img/chevron-down.svg";
import { ButtonBoxPrimary, ButtonPrimary, ParagraphClickable } from "./styled";
import { useState } from "preact/hooks";

export interface Props {
  label: (s: string) => string;
  actions: string[];
  onClick: (s: string) => void;
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
      <ButtonPrimary onClick={() => doClick(selected)}>
        {label(selected)}
      </ButtonPrimary>
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
      <ButtonPrimary
        onClick={() => doClick(selected)}
        style={{
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
          marginRight: 0,
        }}
      >
        {label(selected)}
      </ButtonPrimary>

      <ButtonBoxPrimary
        onClick={() => setOpened((s) => !s)}
        style={{
          marginLeft: 0,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        }}
      >
        <img style={{ height: 14 }} src={arrowDown} />
      </ButtonBoxPrimary>
    </div>
  );
}
