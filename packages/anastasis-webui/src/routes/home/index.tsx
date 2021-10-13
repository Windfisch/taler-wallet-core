import { encodeCrock, stringToBytes } from "@gnu-taler/taler-util";
import { FunctionalComponent, h } from "preact";
import { useState } from "preact/hooks";
import {
  AnastasisReducerApi,
  AuthMethod,
  BackupStates,
  ReducerStateBackup,
  ReducerStateRecovery,
  useAnastasisReducer,
} from "../../hooks/use-anastasis-reducer";
import style from "./style.css";

interface ContinentSelectionProps {
  reducer: AnastasisReducerApi;
  reducerState: ReducerStateBackup | ReducerStateRecovery;
}

function isBackup(reducer: AnastasisReducerApi) {
  return !!reducer.currentReducerState?.backup_state;
}

function ContinentSelection(props: ContinentSelectionProps) {
  const { reducer, reducerState } = props;
  return (
    <div class={style.home}>
      <h1>{isBackup(reducer) ? "Backup" : "Recovery"}: Select Continent</h1>
      <ErrorBanner reducer={reducer} />
      <div>
        {reducerState.continents.map((x: any) => {
          const sel = (x: string) =>
            reducer.transition("select_continent", { continent: x });
          return (
            <button onClick={() => sel(x.name)} key={x.name}>
              {x.name}
            </button>
          );
        })}
      </div>
      <div>
        <button onClick={() => reducer.back()}>Back</button>
      </div>
    </div>
  );
}

interface CountrySelectionProps {
  reducer: AnastasisReducerApi;
  reducerState: ReducerStateBackup | ReducerStateRecovery;
}

function CountrySelection(props: CountrySelectionProps) {
  const { reducer, reducerState } = props;
  return (
    <div class={style.home}>
      <h1>Backup: Select Country</h1>
      <ErrorBanner reducer={reducer} />
      <div>
        {reducerState.countries.map((x: any) => {
          const sel = (x: any) =>
            reducer.transition("select_country", {
              country_code: x.code,
              currencies: [x.currency],
            });
          return (
            <button onClick={() => sel(x)} key={x.name}>
              {x.name} ({x.currency})
            </button>
          );
        })}
      </div>
      <div>
        <button onClick={() => reducer.back()}>Back</button>
      </div>
    </div>
  );
}

const Home: FunctionalComponent = () => {
  const reducer = useAnastasisReducer();
  const reducerState = reducer.currentReducerState;
  if (!reducerState) {
    return (
      <div class={style.home}>
        <h1>Home</h1>
        <p>
          <button autoFocus onClick={() => reducer.startBackup()}>
            Backup
          </button>
          <button onClick={() => reducer.startRecover()}>Recover</button>
        </p>
      </div>
    );
  }
  console.log("state", reducer.currentReducerState);

  if (reducerState.backup_state === BackupStates.ContinentSelecting) {
    return <ContinentSelection reducer={reducer} reducerState={reducerState} />;
  }
  if (reducerState.backup_state === BackupStates.CountrySelecting) {
    return <CountrySelection reducer={reducer} reducerState={reducerState} />;
  }
  if (reducerState.backup_state === BackupStates.UserAttributesCollecting) {
    return <AttributeEntry reducer={reducer} backupState={reducerState} />;
  }
  if (reducerState.backup_state === BackupStates.AuthenticationsEditing) {
    return (
      <AuthenticationEditor backupState={reducerState} reducer={reducer} />
    );
  }

  if (reducerState.backup_state === BackupStates.PoliciesReviewing) {
    const backupState: ReducerStateBackup = reducerState;
    const authMethods = backupState.authentication_methods!;
    return (
      <div class={style.home}>
        <h1>Backup: Review Recovery Policies</h1>
        <ErrorBanner reducer={reducer} />
        <div>
          {backupState.policies?.map((p, i) => {
            const policyName = p.methods
              .map((x) => authMethods[x.authentication_method].type)
              .join(" + ");
            return (
              <div class={style.policy}>
                <h3>
                  Policy #{i + 1}: {policyName}
                </h3>
                Required Authentications:
                <ul>
                  {p.methods.map((x) => {
                    const m = authMethods[x.authentication_method];
                    return (
                      <li>
                        {m.type} ({m.instructions}) at provider {x.provider}
                      </li>
                    );
                  })}
                </ul>
                <div>
                  <button
                    onClick={() =>
                      reducer.transition("delete_policy", { policy_index: i })
                    }
                  >
                    Delete Policy
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div>
          <button onClick={() => reducer.back()}>Back</button>
          <button onClick={() => reducer.transition("next", {})}>Next</button>
        </div>
      </div>
    );
  }

  if (reducerState.backup_state === BackupStates.SecretEditing) {
    const [secretName, setSecretName] = useState("");
    const [secretValue, setSecretValue] = useState("");
    const secretNext = () => {
      reducer.runTransaction(async (tx) => {
        await tx.transition("enter_secret_name", {
          name: secretName,
        });
        await tx.transition("enter_secret", {
          secret: {
            value: "EDJP6WK5EG50",
            mime: "text/plain",
          },
          expiration: {
            t_ms: new Date().getTime() + 1000 * 60 * 60 * 24 * 365 * 5,
          },
        });
        await tx.transition("next", {});
      });
    };
    return (
      <div class={style.home}>
        <h1>Backup: Provide secret</h1>
        <ErrorBanner reducer={reducer} />
        <div>
          <label>
            Secret name: <input type="text" />
          </label>
        </div>
        <div>
          <label>
            Secret value: <input type="text" />
          </label>
        </div>
        or:
        <div>
          <label>
            File Upload: <input type="file" />
          </label>
        </div>
        <div>
          <button onClick={() => reducer.back()}>Back</button>
          <button onClick={() => secretNext()}>Next</button>
        </div>
      </div>
    );
  }

  if (reducerState.backup_state === BackupStates.BackupFinished) {
    const backupState: ReducerStateBackup = reducerState;
    return (
      <div class={style.home}>
        <h1>Backup finished</h1>
        <p>
          Your backup of secret "{backupState.secret_name ?? "??"}" was
          successful.
        </p>
        <p>The backup is stored by the following providers:</p>
        <ul>
          {Object.keys(backupState.success_details).map((x, i) => {
            const sd = backupState.success_details[x];
            return (
              <li>
                {x} (Policy version {sd.policy_version})
              </li>
            );
          })}
        </ul>
        <button onClick={() => reducer.reset()}>
          Start a new backup/recovery
        </button>
      </div>
    );
  }

  if (reducerState.backup_state === BackupStates.TruthsPaying) {
    const backupState: ReducerStateBackup = reducerState;
    const payments = backupState.payments ?? [];
    return (
      <div class={style.home}>
        <h1>Backup: Authentication Storage Payments</h1>
        <p>
          Some of the providers require a payment to store the encrypted
          authentication information.
        </p>
        <ul>
          {payments.map((x) => {
            return <li>{x}</li>;
          })}
        </ul>
        <div>
          <button onClick={() => reducer.back()}>Back</button>
          <button onClick={() => reducer.transition("pay", {})}>
            Check payment(s)
          </button>
        </div>
      </div>
    );
  }

  if (reducerState.backup_state === BackupStates.PoliciesPaying) {
    const backupState: ReducerStateBackup = reducerState;
    const payments = backupState.policy_payment_requests ?? [];
    return (
      <div class={style.home}>
        <h1>Backup: Recovery Document Payments</h1>
        <p>
          Some of the providers require a payment to store the encrypted
          recovery document.
        </p>
        <ul>
          {payments.map((x) => {
            return (
              <li>
                {x.provider}: {x.payto}
              </li>
            );
          })}
        </ul>
        <div>
          <button onClick={() => reducer.back()}>Back</button>
          <button onClick={() => reducer.transition("pay", {})}>
            Check payment(s)
          </button>
        </div>
      </div>
    );
  }

  console.log("unknown state", reducer.currentReducerState);
  return (
    <div class={style.home}>
      <h1>Home</h1>
      <p>Bug: Unknown state.</p>
      <button onClick={() => reducer.reset()}>Reset</button>
    </div>
  );
};

interface AuthMethodSetupProps {
  method: string;
  addAuthMethod: (x: any) => void;
  cancel: () => void;
}

function AuthMethodSmsSetup(props: AuthMethodSetupProps) {
  const [mobileNumber, setMobileNumber] = useState("");
  return (
    <div class={style.home}>
      <h1>Add {props.method} authentication</h1>
      <div>
        <p>
          For SMS authentication, you need to provide a mobile number. When
          recovering your secret, you will be asked to enter the code you
          receive via SMS.
        </p>
        <label>
          Mobile number{" "}
          <input
            value={mobileNumber}
            autoFocus
            onChange={(e) => setMobileNumber((e.target as any).value)}
            type="text"
          />
        </label>
        <div>
          <button onClick={() => props.cancel()}>Cancel</button>
          <button
            onClick={() =>
              props.addAuthMethod({
                authentication_method: {
                  type: "sms",
                  instructions: `SMS to ${mobileNumber}`,
                  challenge: "E1QPPS8A",
                },
              })
            }
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthMethodQuestionSetup(props: AuthMethodSetupProps) {
  const [questionText, setQuestionText] = useState("");
  const [answerText, setAnswerText] = useState("");
  return (
    <div class={style.home}>
      <h1>Add {props.method} authentication</h1>
      <div>
        <p>
          For security question authentication, you need to provide a question
          and its answer. When recovering your secret, you will be shown the
          question and you will need to type the answer exactly as you typed it
          here.
        </p>
        <div>
          <label>
            Security question
            <input
              value={questionText}
              autoFocus
              onChange={(e) => setQuestionText((e.target as any).value)}
              type="text"
            />
          </label>
        </div>
        <div>
          <label>
            Answer
            <input
              value={answerText}
              autoFocus
              onChange={(e) => setAnswerText((e.target as any).value)}
              type="text"
            />
          </label>
        </div>
        <div>
          <button onClick={() => props.cancel()}>Cancel</button>
          <button
            onClick={() =>
              props.addAuthMethod({
                authentication_method: {
                  type: "question",
                  instructions: questionText,
                  challenge: encodeCrock(stringToBytes(answerText)),
                },
              })
            }
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
}

function AuthMethodNotImplemented(props: AuthMethodSetupProps) {
  return (
    <div class={style.home}>
      <h1>Add {props.method} authentication</h1>
      <div>
        <p>
          This auth method is not implemented yet, please choose another one.
        </p>
        <button onClick={() => props.cancel()}>Cancel</button>
      </div>
    </div>
  );
}

export interface AuthenticationEditorProps {
  reducer: AnastasisReducerApi;
  backupState: ReducerStateBackup;
}

function AuthenticationEditor(props: AuthenticationEditorProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | undefined>(
    undefined,
  );
  const { reducer, backupState } = props;
  const providers = backupState.authentication_providers;
  const authAvailableSet = new Set<string>();
  for (const provKey of Object.keys(providers)) {
    const p = providers[provKey];
    for (const meth of p.methods) {
      authAvailableSet.add(meth.type);
    }
  }
  if (selectedMethod) {
    const cancel = () => setSelectedMethod(undefined);
    const addMethod = (args: any) => {
      reducer.transition("add_authentication", args);
      setSelectedMethod(undefined);
    };
    switch (selectedMethod) {
      case "sms":
        return (
          <AuthMethodSmsSetup
            cancel={cancel}
            addAuthMethod={addMethod}
            method="sms"
          />
        );
      case "question":
        return (
          <AuthMethodQuestionSetup
            cancel={cancel}
            addAuthMethod={addMethod}
            method="sms"
          />
        );
      default:
        return (
          <AuthMethodNotImplemented
            cancel={cancel}
            addAuthMethod={addMethod}
            method={selectedMethod}
          />
        );
    }
  }
  function MethodButton(props: { method: string; label: String }) {
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
  const configuredAuthMethods: AuthMethod[] =
    backupState.authentication_methods ?? [];
  const haveMethodsConfigured = configuredAuthMethods.length;
  return (
    <div class={style.home}>
      <h1>Backup: Configure Authentication Methods</h1>
      <ErrorBanner reducer={reducer} />
      <h2>Add authentication method</h2>
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
            <p>
              {x.type} ({x.instructions}){" "}
              <button
                onClick={() =>
                  reducer.transition("delete_authentication", {
                    authentication_method: i,
                  })
                }
              >
                Delete
              </button>
            </p>
          );
        })
      ) : (
        <p>No authentication methods configured yet.</p>
      )}
      <div>
        <button onClick={() => reducer.back()}>Back</button>
        <button onClick={() => reducer.transition("next", {})}>Next</button>
      </div>
    </div>
  );
}

export interface AttributeEntryProps {
  reducer: AnastasisReducerApi;
  backupState: ReducerStateBackup;
}

function AttributeEntry(props: AttributeEntryProps) {
  const { reducer, backupState } = props;
  const [attrs, setAttrs] = useState<Record<string, string>>({});
  return (
    <div class={style.home}>
      <h1>Backup: Enter Basic User Attributes</h1>
      <ErrorBanner reducer={reducer} />
      <div>
        {backupState.required_attributes.map((x: any, i: number) => {
          return (
            <AttributeEntryField
              isFirst={i == 0}
              setValue={(v: string) => setAttrs({ ...attrs, [x.name]: v })}
              spec={x}
              value={attrs[x.name]}
            />
          );
        })}
      </div>
      <div>
        <button onClick={() => reducer.back()}>Back</button>
        <button
          onClick={() =>
            reducer.transition("enter_user_attributes", {
              identity_attributes: attrs,
            })
          }
        >
          Next
        </button>
      </div>
    </div>
  );
}

export interface AttributeEntryFieldProps {
  isFirst: boolean;
  value: string;
  setValue: (newValue: string) => void;
  spec: any;
}

function AttributeEntryField(props: AttributeEntryFieldProps) {
  return (
    <div>
      <label>{props.spec.label}</label>
      <input
        autoFocus={props.isFirst}
        type="text"
        value={props.value}
        onChange={(e) => props.setValue((e as any).target.value)}
      />
    </div>
  );
}

interface ErrorBannerProps {
  reducer: AnastasisReducerApi;
}

/**
 * Show a dismissable error banner if there is a current error.
 */
function ErrorBanner(props: ErrorBannerProps) {
  const currentError = props.reducer.currentError;
  if (currentError) {
    return (
      <div id={style.error}>
        <p>Error: {JSON.stringify(currentError)}</p>
        <button onClick={() => props.reducer.dismissError()}>
          Dismiss Error
        </button>
      </div>
    );
  }
  return null;
}

export default Home;
