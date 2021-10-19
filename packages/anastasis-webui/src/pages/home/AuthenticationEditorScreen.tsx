/* eslint-disable @typescript-eslint/camelcase */
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { AuthMethod, ReducerStateBackup } from "anastasis-core";
import { AnastasisReducerApi } from "../../hooks/use-anastasis-reducer";
import { AuthMethodEmailSetup } from "./AuthMethodEmailSetup";
import { AuthMethodPostSetup } from "./AuthMethodPostSetup";
import { AuthMethodQuestionSetup } from "./AuthMethodQuestionSetup";
import { AuthMethodSmsSetup } from "./AuthMethodSmsSetup";
import { AnastasisClientFrame } from "./index";

export function AuthenticationEditorScreen(props: AuthenticationEditorProps): VNode {
  const [selectedMethod, setSelectedMethod] = useState<string | undefined>(
    undefined
  );
  const { reducer, backupState } = props;
  const providers = backupState.authentication_providers!;
  const authAvailableSet = new Set<string>();
  for (const provKey of Object.keys(providers)) {
    const p = providers[provKey];
    if ("http_status" in p && (!("error_code" in p)) && p.methods) {
      for (const meth of p.methods) {
        authAvailableSet.add(meth.type);
      }
    }
  }
  if (selectedMethod) {
    const cancel = (): void => setSelectedMethod(undefined);
    const addMethod = (args: any): void => {
      reducer.transition("add_authentication", args);
      setSelectedMethod(undefined);
    };
    const methodMap: Record<
      string, (props: AuthMethodSetupProps) => h.JSX.Element
    > = {
      sms: AuthMethodSmsSetup,
      question: AuthMethodQuestionSetup,
      email: AuthMethodEmailSetup,
      post: AuthMethodPostSetup,
    };
    const AuthSetup = methodMap[selectedMethod] ?? AuthMethodNotImplemented;
    return (
      <AuthSetup
        cancel={cancel}
        addAuthMethod={addMethod}
        method={selectedMethod} />
    );
  }
  function MethodButton(props: { method: string; label: string }): VNode {
    return (
      <button
        disabled={!authAvailableSet.has(props.method)}
        onClick={() => {
          setSelectedMethod(props.method);
          reducer.dismissError();
        }}
      >
        {props.label}
      </button>
    );
  }
  const configuredAuthMethods: AuthMethod[] = backupState.authentication_methods ?? [];
  const haveMethodsConfigured = configuredAuthMethods.length;
  return (
    <AnastasisClientFrame title="Backup: Configure Authentication Methods">
      <div>
        <MethodButton method="sms" label="SMS" />
        <MethodButton method="email" label="Email" />
        <MethodButton method="question" label="Question" />
        <MethodButton method="post" label="Physical Mail" />
        <MethodButton method="totp" label="TOTP" />
        <MethodButton method="iban" label="IBAN" />
      </div>
      <h2>Configured authentication methods</h2>
      {haveMethodsConfigured ? (
        configuredAuthMethods.map((x, i) => {
          return (
            <p key={i}>
              {x.type} ({x.instructions}){" "}
              <button
                onClick={() => reducer.transition("delete_authentication", {
                  authentication_method: i,
                })}
              >
                Delete
              </button>
            </p>
          );
        })
      ) : (
        <p>No authentication methods configured yet.</p>
      )}
    </AnastasisClientFrame>
  );
}

export interface AuthMethodSetupProps {
  method: string;
  addAuthMethod: (x: any) => void;
  cancel: () => void;
}

function AuthMethodNotImplemented(props: AuthMethodSetupProps): VNode {
  return (
    <AnastasisClientFrame hideNav title={`Add ${props.method} authentication`}>
      <p>This auth method is not implemented yet, please choose another one.</p>
      <button onClick={() => props.cancel()}>Cancel</button>
    </AnastasisClientFrame>
  );
}

interface AuthenticationEditorProps {
  reducer: AnastasisReducerApi;
  backupState: ReducerStateBackup;
}

