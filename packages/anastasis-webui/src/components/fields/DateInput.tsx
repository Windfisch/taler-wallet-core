import { format } from "date-fns";
import { h, VNode } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import { DatePicker } from "../picker/DatePicker";

export interface DateInputProps {
  label: string;
  grabFocus?: boolean;
  tooltip?: string;
  error?: string;
  bind: [string, (x: string) => void];
}

export function DateInput(props: DateInputProps): VNode {
  const inputRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (props.grabFocus) {
      inputRef.current?.focus();
    }
  }, [props.grabFocus]);
  const [opened, setOpened2] = useState(false)
  function setOpened(v: boolean) {
    console.log('dale', v)
    setOpened2(v)
  }

  const value = props.bind[0];
  const [dirty, setDirty] = useState(false)
  const showError = dirty && props.error

  return <div class="field">
    <label class="label">
      {props.label}
      {props.tooltip && <span class="icon has-tooltip-right" data-tooltip={props.tooltip}>
        <i class="mdi mdi-information" />
      </span>}
    </label>
    <div class="control has-icons-right">
      <input
        type="text"
        class={showError ? 'input is-danger' : 'input'}
        onClick={() => { setOpened(true) }}
        value={value}
        ref={inputRef} />

      <span class="control icon is-right">
        <span class="icon"><i class="mdi mdi-calendar" /></span>
      </span>
    </div>
    {showError && <p class="help is-danger">{props.error}</p>}
    <DatePicker
      opened={opened}
      closeFunction={() => setOpened(false)}
      dateReceiver={(d) => {
        setDirty(true)
        const v = format(d, 'yyyy/MM/dd')
        props.bind[1](v);
      }}
    />
  </div>
    ;

}
