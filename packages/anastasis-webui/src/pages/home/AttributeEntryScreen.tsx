/* eslint-disable @typescript-eslint/camelcase */
import { UserAttributeSpec, validators } from "anastasis-core";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { useAnastasisContext } from "../../context/anastasis";
import { AnastasisClientFrame, withProcessLabel } from "./index";
import { TextInput } from "../../components/fields/TextInput";
import { DateInput } from "../../components/fields/DateInput";
import { NumberInput } from "../../components/fields/NumberInput";
import { isAfter, parse } from "date-fns";

export function AttributeEntryScreen(): VNode {
  const reducer = useAnastasisContext()
  const state = reducer?.currentReducerState
  const currentIdentityAttributes = state && "identity_attributes" in state ? (state.identity_attributes || {}) : {}
  const [attrs, setAttrs] = useState<Record<string, string>>(currentIdentityAttributes);

  if (!reducer) {
    return <div>no reducer in context</div>
  }
  if (!reducer.currentReducerState || !("required_attributes" in reducer.currentReducerState)) {
    return <div>invalid state</div>
  }
  const reqAttr = reducer.currentReducerState.required_attributes || []
  let hasErrors = false;

  const fieldList: VNode[] = reqAttr.map((spec, i: number) => {
    const value = attrs[spec.name]
    const error = checkIfValid(value, spec)
    hasErrors = hasErrors || error !== undefined
    return (
      <AttributeEntryField
        key={i}
        isFirst={i == 0}
        setValue={(v: string) => setAttrs({ ...attrs, [spec.name]: v })}
        spec={spec}
        errorMessage={error}
        value={value} />
    );
  })

  return (
    <AnastasisClientFrame
      title={withProcessLabel(reducer, "Who are you?")}
      hideNext={hasErrors ? "Complete the form." : undefined}
      onNext={() => reducer.transition("enter_user_attributes", {
        identity_attributes: attrs,
      })}
    >
      <div class="columns" style={{ maxWidth: 'unset' }}>
        <div class="column is-one-third">
          {fieldList}
        </div>
        <div class="column is-two-third" >
          <p>This personal information will help to locate your secret.</p>
          <h1 class="title">This stays private</h1>
          <p>The information you have entered here:</p>
          <ul>
            <li>
              <span class="icon is-right">
                <i class="mdi mdi-circle-small" />
              </span>
              Will be hashed, and therefore unreadable
            </li>
            <li><span class="icon is-right">
              <i class="mdi mdi-circle-small" />
            </span>The non-hashed version is not shared</li>
          </ul>
        </div>
      </div>
    </AnastasisClientFrame>
  );
}

interface AttributeEntryFieldProps {
  isFirst: boolean;
  value: string;
  setValue: (newValue: string) => void;
  spec: UserAttributeSpec;
  errorMessage: string | undefined;
}
const possibleBirthdayYear: Array<number> = []
for (let i = 0; i < 100; i++) {
  possibleBirthdayYear.push(2020 - i)
}
function AttributeEntryField(props: AttributeEntryFieldProps): VNode {

  return (
    <div>
      {props.spec.type === 'date' &&
        <DateInput
          grabFocus={props.isFirst}
          label={props.spec.label}
          years={possibleBirthdayYear}
          error={props.errorMessage}
          bind={[props.value, props.setValue]}
        />}
      {props.spec.type === 'number' &&
        <NumberInput
          grabFocus={props.isFirst}
          label={props.spec.label}
          error={props.errorMessage}
          bind={[props.value, props.setValue]}
        />
      }
      {props.spec.type === 'string' &&
        <TextInput
          grabFocus={props.isFirst}
          label={props.spec.label}
          error={props.errorMessage}
          bind={[props.value, props.setValue]}
        />
      }
      <div class="block">
        This stays private
        <span class="icon is-right">
          <i class="mdi mdi-eye-off" />
        </span>
      </div>
    </div>
  );
}
const YEAR_REGEX = /^[0-9]+-[0-9]+-[0-9]+$/


function checkIfValid(value: string, spec: UserAttributeSpec): string | undefined {
  const pattern = spec['validation-regex']
  if (pattern) {
    const re = new RegExp(pattern)
    if (!re.test(value)) return 'The value is invalid'
  }
  const logic = spec['validation-logic']
  if (logic) {
    const func = (validators as any)[logic];
    if (func && typeof func === 'function' && !func(value)) return 'Please check the value'
  }
  const optional = spec.optional
  if (!optional && !value) {
    return 'This value is required'
  }
  if ("date" === spec.type) {
    if (!YEAR_REGEX.test(value)) {
      return "The date doesn't follow the format"
    }

    try {
      const v = parse(value, 'yyyy-MM-dd', new Date());
      if (Number.isNaN(v.getTime())) {
        return "Some numeric values seems out of range for a date"
      }
      if ("birthdate" === spec.name && isAfter(v, new Date())) {
        return "A birthdate cannot be in the future"
      }
    } catch (e) {
      return "Could not parse the date"
    }
  }
  return undefined
}
