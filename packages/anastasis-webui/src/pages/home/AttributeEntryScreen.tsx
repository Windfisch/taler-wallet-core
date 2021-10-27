/* eslint-disable @typescript-eslint/camelcase */
import { UserAttributeSpec, validators } from "anastasis-core";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { useAnastasisContext } from "../../context/anastasis";
import { AnastasisClientFrame, withProcessLabel } from "./index";
import { TextInput } from "../../components/fields/TextInput";
import { DateInput } from "../../components/fields/DateInput";
import { NumberInput } from "../../components/fields/NumberInput";

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


  return (
    <AnastasisClientFrame
      title={withProcessLabel(reducer, "Who are you?")}
      onNext={() => reducer.transition("enter_user_attributes", {
        identity_attributes: attrs,
      })}
    >
      <div class="columns">
        <div class="column is-half">

          {reducer.currentReducerState.required_attributes?.map((x, i: number) => {
            const value = attrs[x.name]
            function checkIfValid(): string | undefined {
              const pattern = x['validation-regex']
              if (pattern) {
                const re = new RegExp(pattern)
                if (!re.test(value)) return 'The value is invalid'
              }
              const logic = x['validation-logic']
              if (logic) {
                const func = (validators as any)[logic];
                if (func && typeof func === 'function' && !func(value)) return 'Please check the value'
              }
              const optional = x.optional
              console.log('optiona', optional)
              if (!optional && !value) {
                return 'This value is required'
              }
              return undefined
            }

            return (
              <AttributeEntryField
                key={i}
                isFirst={i == 0}
                setValue={(v: string) => setAttrs({ ...attrs, [x.name]: v })}
                spec={x}
                isValid={checkIfValid}
                value={value} />
            );
          })}

        </div>
        <div class="column is-half" >
          <p>This personal information will help to locate your secret in the first place</p>
          <h1><b>This stay private</b></h1>
          <p>The information you have entered here:
          </p>
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
  isValid: () => string | undefined;
}
const possibleBirthdayYear: Array<number> = []
for (let i = 0; i < 100; i++ ) {
  possibleBirthdayYear.push(2020 - i)
}
function AttributeEntryField(props: AttributeEntryFieldProps): VNode {
  const errorMessage = props.isValid()

  return (
    <div>
      {props.spec.type === 'date' &&
        <DateInput
          grabFocus={props.isFirst}
          label={props.spec.label}
          years={possibleBirthdayYear}
          error={errorMessage}
          bind={[props.value, props.setValue]}
        />}
      {props.spec.type === 'number' &&
        <NumberInput
          grabFocus={props.isFirst}
          label={props.spec.label}
          error={errorMessage}
          bind={[props.value, props.setValue]}
        />
      }
      {props.spec.type === 'string' &&
        <TextInput
          grabFocus={props.isFirst}
          label={props.spec.label}
          error={errorMessage}
          bind={[props.value, props.setValue]}
        />
      }
      <span>
        <span class="icon is-right">
          <i class="mdi mdi-eye-off" />
        </span>
        This stay private
      </span>
    </div>
  );
}
