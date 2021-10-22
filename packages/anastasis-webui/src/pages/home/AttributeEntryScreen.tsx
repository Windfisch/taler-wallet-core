/* eslint-disable @typescript-eslint/camelcase */
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { ReducerStateRecovery, ReducerStateBackup, UserAttributeSpec } from "anastasis-core/lib";
import { useAnastasisContext } from "../../context/anastasis";
import { AnastasisReducerApi } from "../../hooks/use-anastasis-reducer";
import { AnastasisClientFrame, withProcessLabel, LabeledInput } from "./index";

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
      title={withProcessLabel(reducer, "Select Country")}
      onNext={() => reducer.transition("enter_user_attributes", {
        identity_attributes: attrs,
      })}
    >
      {reducer.currentReducerState.required_attributes?.map((x, i: number) => {
        return (
          <AttributeEntryField
            key={i}
            isFirst={i == 0}
            setValue={(v: string) => setAttrs({ ...attrs, [x.name]: v })}
            spec={x}
            value={attrs[x.name]} />
        );
      })}
    </AnastasisClientFrame>
  );
}

interface AttributeEntryProps {
  reducer: AnastasisReducerApi;
  reducerState: ReducerStateRecovery | ReducerStateBackup;
}

export interface AttributeEntryFieldProps {
  isFirst: boolean;
  value: string;
  setValue: (newValue: string) => void;
  spec: UserAttributeSpec;
}

export function AttributeEntryField(props: AttributeEntryFieldProps): VNode {
  return (
    <div>
      <LabeledInput
        grabFocus={props.isFirst}
        label={props.spec.label}
        bind={[props.value, props.setValue]}
      />
    </div>
  );
}
