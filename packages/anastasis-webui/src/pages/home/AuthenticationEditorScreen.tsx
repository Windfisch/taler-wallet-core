/* eslint-disable @typescript-eslint/camelcase */
import { AuthMethod } from "anastasis-core";
import { ComponentChildren, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { useAnastasisContext } from "../../context/anastasis";
import { authMethods, KnownAuthMethods } from "./authMethod";
import { AnastasisClientFrame } from "./index";



const getKeys = Object.keys as <T extends object>(obj: T) => Array<keyof T>

export function AuthenticationEditorScreen(): VNode {
  const [noProvidersAck, setNoProvidersAck] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState<KnownAuthMethods | undefined>(undefined);

  const reducer = useAnastasisContext()
  if (!reducer) {
    return <div>no reducer in context</div>
  }
  if (!reducer.currentReducerState || reducer.currentReducerState.backup_state === undefined) {
    return <div>invalid state</div>
  }
  const configuredAuthMethods: AuthMethod[] = reducer.currentReducerState.authentication_methods ?? [];
  const haveMethodsConfigured = configuredAuthMethods.length > 0;

  function removeByIndex(index: number): void {
    if (reducer) reducer.transition("delete_authentication", {
      authentication_method: index,
    })
  }

  const camByType: { [s: string]: AuthMethodWithRemove[] } = {}
  for (let index = 0; index < configuredAuthMethods.length; index++) {
    const cam = {
      ...configuredAuthMethods[index],
      remove: () => removeByIndex(index)
    }
    const prevValue = camByType[cam.type] || []
    prevValue.push(cam)
    camByType[cam.type] = prevValue;
  }


  const providers = reducer.currentReducerState.authentication_providers!;

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

    const AuthSetup = authMethods[selectedMethod].screen ?? AuthMethodNotImplemented;
    return (
      <AuthSetup
        cancel={cancel}
        configured={camByType[selectedMethod] || []}
        addAuthMethod={addMethod}
        method={selectedMethod} />
    );
  }
  function MethodButton(props: { method: KnownAuthMethods }): VNode {
    return (
      <div class="block">
        <button
          style={{ justifyContent: 'space-between' }}
          class="button is-fullwidth"
          onClick={() => {
            if (!authAvailableSet.has(props.method)) {
              //open add sms dialog
            } else {
              setSelectedMethod(props.method);
            }
            if (reducer) reducer.dismissError();
          }}
        >
          <div style={{ display: 'flex' }}>
            <span class="icon ">
              {authMethods[props.method].icon}
            </span>
            <span>
              {authMethods[props.method].label}
            </span>
          </div>
          {!authAvailableSet.has(props.method) &&
            <span class="icon has-text-danger" >
              <i class="mdi mdi-exclamation-thick" />
            </span>
          }
          {camByType[props.method] &&
            <span class="tag is-info" >
              {camByType[props.method].length}
            </span>
          }
        </button>
      </div>
    );
  }
  const errors = !haveMethodsConfigured ? "There is not enough authentication methods." : undefined;
  return (
    <AnastasisClientFrame title="Backup: Configure Authentication Methods" hideNext={errors}>
      <div class="columns">
        <div class="column is-half">
          <div>
            {getKeys(authMethods).map(method => <MethodButton key={method} method={method} />)}
          </div>
          {authAvailableSet.size === 0 && <ConfirmModal active={!noProvidersAck} onCancel={() => setNoProvidersAck(true)} description="No providers founds" label="Add a provider manually">
            We have found no trusted cloud providers for your recovery secret. You can add a provider manually.
            To add a provider you must know the provider URL (e.g. https://provider.com)
            <p>
              <a>More about cloud providers</a>
            </p>
          </ConfirmModal>}

          {/* {haveMethodsConfigured && (
            configuredAuthMethods.map((x, i) => {
              return (
                <p key={i}>
                  {x.type} ({x.instructions}){" "}
                  <button class="button is-danger is-small"
                    onClick={() => reducer.transition("delete_authentication", {
                      authentication_method: i,
                    })}
                  >
                    Remove
                  </button>
                </p>
              );
            })
          )} */}
        </div>
        <div class="column is-half">
          When recovering your wallet, you will be asked to verify your identity via the methods you configure here.
        </div>
      </div>
    </AnastasisClientFrame>
  );
}

type AuthMethodWithRemove = AuthMethod & { remove: () => void }
export interface AuthMethodSetupProps {
  method: string;
  addAuthMethod: (x: any) => void;
  configured: AuthMethodWithRemove[];
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


function ConfirmModal({ active, description, onCancel, onConfirm, children, danger, disabled, label = 'Confirm' }: Props): VNode {
  return <div class={active ? "modal is-active" : "modal"}>
    <div class="modal-background " onClick={onCancel} />
    <div class="modal-card" style={{ maxWidth: 700 }}>
      <header class="modal-card-head">
        {!description ? null : <p class="modal-card-title"><b>{description}</b></p>}
        <button class="delete " aria-label="close" onClick={onCancel} />
      </header>
      <section class="modal-card-body">
        {children}
      </section>
      <footer class="modal-card-foot">
        <button class="button" onClick={onCancel} >Dismiss</button>
        <div class="buttons is-right" style={{ width: '100%' }}>
          <button class={danger ? "button is-danger " : "button is-info "} disabled={disabled} onClick={onConfirm} >{label}</button>
        </div>
      </footer>
    </div>
    <button class="modal-close is-large " aria-label="close" onClick={onCancel} />
  </div>
}

interface Props {
  active?: boolean;
  description?: string;
  onCancel?: () => void;
  onConfirm?: () => void;
  label?: string;
  children?: ComponentChildren;
  danger?: boolean;
  disabled?: boolean;
}
