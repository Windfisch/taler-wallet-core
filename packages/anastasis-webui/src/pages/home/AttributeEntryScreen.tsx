/* eslint-disable @typescript-eslint/camelcase */
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { ReducerStateRecovery, ReducerStateBackup } from "../../../../anastasis-core/lib";
import { AnastasisReducerApi } from "../../hooks/use-anastasis-reducer";
import { AnastasisClientFrame, withProcessLabel, LabeledInput } from "./index";

export function AttributeEntryScreen(props: AttributeEntryProps): VNode {
  const { reducer, reducerState: backupState } = props;
  const [attrs, setAttrs] = useState<Record<string, string>>(
    props.reducerState.identity_attributes ?? {}
  );
  return (
    <AnastasisClientFrame
      title={withProcessLabel(reducer, "Select Country")}
      onNext={() => reducer.transition("enter_user_attributes", {
        identity_attributes: attrs,
      })}
    >
      {backupState.required_attributes.map((x: any, i: number) => {
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
  spec: any;
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
