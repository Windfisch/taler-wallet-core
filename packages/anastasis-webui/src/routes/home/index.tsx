import {
  bytesToString,
  canonicalJson,
  decodeCrock,
  encodeCrock,
  stringToBytes,
} from "@gnu-taler/taler-util";
import {
  AuthMethod,
  BackupStates,
  ChallengeFeedback,
  ChallengeInfo,
  RecoveryStates,
  ReducerStateBackup,
  ReducerStateRecovery,
} from "anastasis-core";
import {
  FunctionalComponent,
  ComponentChildren,
  h,
  createContext,
} from "preact";
import { useState, useContext, useRef, useLayoutEffect } from "preact/hooks";
import {
  AnastasisReducerApi,
  useAnastasisReducer,
} from "../../hooks/use-anastasis-reducer";
import style from "./style.css";

const WithReducer = createContext<AnastasisReducerApi | undefined>(undefined);

function isBackup(reducer: AnastasisReducerApi) {
  return !!reducer.currentReducerState?.backup_state;
}

interface CommonReducerProps {
  reducer: AnastasisReducerApi;
  reducerState: ReducerStateBackup | ReducerStateRecovery;
}

function withProcessLabel(reducer: AnastasisReducerApi, text: string): string {
  if (isBackup(reducer)) {
    return "Backup: " + text;
  }
  return "Recovery: " + text;
}

function ContinentSelection(props: CommonReducerProps) {
  const { reducer, reducerState } = props;
  const sel = (x: string) =>
    reducer.transition("select_continent", { continent: x });
  return (
    <AnastasisClientFrame
      hideNext
      title={withProcessLabel(reducer, "Select Continent")}
    >
      {reducerState.continents.map((x: any) => (
        <button onClick={() => sel(x.name)} key={x.name}>
          {x.name}
        </button>
      ))}
    </AnastasisClientFrame>
  );
}

function CountrySelection(props: CommonReducerProps) {
  const { reducer, reducerState } = props;
  const sel = (x: any) =>
    reducer.transition("select_country", {
      country_code: x.code,
      currencies: [x.currency],
    });
  return (
    <AnastasisClientFrame
      hideNext
      title={withProcessLabel(reducer, "Select Country")}
    >
      {reducerState.countries.map((x: any) => (
        <button onClick={() => sel(x)} key={x.name}>
          {x.name} ({x.currency})
        </button>
      ))}
    </AnastasisClientFrame>
  );
}

interface SolveEntryProps {
  reducer: AnastasisReducerApi;
  challenge: ChallengeInfo;
  feedback?: ChallengeFeedback;
}

function SolveQuestionEntry(props: SolveEntryProps) {
  const [answer, setAnswer] = useState("");
  const { reducer, challenge, feedback } = props;
  const next = () =>
    reducer.transition("solve_challenge", {
      answer,
    });
  return (
    <AnastasisClientFrame
      title="Recovery: Solve challenge"
      onNext={() => next()}
    >
      <p>Feedback: {JSON.stringify(feedback)}</p>
      <p>Question: {challenge.instructions}</p>
      <LabeledInput label="Answer" grabFocus bind={[answer, setAnswer]} />
    </AnastasisClientFrame>
  );
}

function SolveSmsEntry(props: SolveEntryProps) {
  const [answer, setAnswer] = useState("");
  const { reducer, challenge, feedback } = props;
  const next = () =>
    reducer.transition("solve_challenge", {
      answer,
    });
  return (
    <AnastasisClientFrame
      title="Recovery: Solve challenge"
      onNext={() => next()}
    >
      <p>Feedback: {JSON.stringify(feedback)}</p>
      <p>{challenge.instructions}</p>
      <LabeledInput label="Answer" grabFocus bind={[answer, setAnswer]} />
    </AnastasisClientFrame>
  );
}

function SolvePostEntry(props: SolveEntryProps) {
  const [answer, setAnswer] = useState("");
  const { reducer, challenge, feedback } = props;
  const next = () =>
    reducer.transition("solve_challenge", {
      answer,
    });
  return (
    <AnastasisClientFrame
      title="Recovery: Solve challenge"
      onNext={() => next()}
    >
      <p>Feedback: {JSON.stringify(feedback)}</p>
      <p>{challenge.instructions}</p>
      <LabeledInput label="Answer" grabFocus bind={[answer, setAnswer]} />
    </AnastasisClientFrame>
  );
}

function SolveEmailEntry(props: SolveEntryProps) {
  const [answer, setAnswer] = useState("");
  const { reducer, challenge, feedback } = props;
  const next = () =>
    reducer.transition("solve_challenge", {
      answer,
    });
  return (
    <AnastasisClientFrame
      title="Recovery: Solve challenge"
      onNext={() => next()}
    >
      <p>Feedback: {JSON.stringify(feedback)}</p>
      <p>{challenge.instructions}</p>
      <LabeledInput label="Answer" grabFocus bind={[answer, setAnswer]} />
    </AnastasisClientFrame>
  );
}

function SolveUnsupportedEntry(props: SolveEntryProps) {
  return (
    <AnastasisClientFrame hideNext title="Recovery: Solve challenge">
      <p>{JSON.stringify(props.challenge)}</p>
      <p>Challenge not supported.</p>
    </AnastasisClientFrame>
  );
}

function SecretEditor(props: BackupReducerProps) {
  const { reducer } = props;
  const [secretName, setSecretName] = useState(
    props.backupState.secret_name ?? "",
  );
  const [secretValue, setSecretValue] = useState(
    props.backupState.core_secret?.value ?? "" ?? "",
  );
  const secretNext = () => {
    reducer.runTransaction(async (tx) => {
      await tx.transition("enter_secret_name", {
        name: secretName,
      });
      await tx.transition("enter_secret", {
        secret: {
          value: encodeCrock(stringToBytes(secretValue)),
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
    <AnastasisClientFrame
      title="Backup: Provide secret"
      onNext={() => secretNext()}
    >
      <div>
        <LabeledInput
          label="Secret Name:"
          grabFocus
          bind={[secretName, setSecretName]}
        />
      </div>
      <div>
        <LabeledInput
          label="Secret Value:"
          bind={[secretValue, setSecretValue]}
        />
      </div>
    </AnastasisClientFrame>
  );
}

export interface BackupReducerProps {
  reducer: AnastasisReducerApi;
  backupState: ReducerStateBackup;
}

function ReviewPolicies(props: BackupReducerProps) {
  const { reducer, backupState } = props;
  const authMethods = backupState.authentication_methods!;
  return (
    <AnastasisClientFrame title="Backup: Review Recovery Policies">
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
    </AnastasisClientFrame>
  );
}

export interface RecoveryReducerProps {
  reducer: AnastasisReducerApi;
  recoveryState: ReducerStateRecovery;
}

function SecretSelection(props: RecoveryReducerProps) {
  const { reducer, recoveryState } = props;
  const [selectingVersion, setSelectingVersion] = useState<boolean>(false);
  const [otherVersion, setOtherVersion] = useState<number>(
    recoveryState.recovery_document?.version ?? 0,
  );
  const recoveryDocument = recoveryState.recovery_document!;
  const [otherProvider, setOtherProvider] = useState<string>("");
  function selectVersion(p: string, n: number) {
    reducer.runTransaction(async (tx) => {
      await tx.transition("change_version", {
        version: n,
        provider_url: p,
      });
      setSelectingVersion(false);
    });
  }
  if (selectingVersion) {
    return (
      <AnastasisClientFrame hideNav title="Recovery: Select secret">
        <p>Select a different version of the secret</p>
        <select onChange={(e) => setOtherProvider((e.target as any).value)}>
          {Object.keys(recoveryState.authentication_providers ?? {}).map(
            (x) => (
              <option selected={x === recoveryDocument.provider_url} value={x}>
                {x}
              </option>
            ),
          )}
        </select>
        <div>
          <input
            value={otherVersion}
            onChange={(e) =>
              setOtherVersion(Number((e.target as HTMLInputElement).value))
            }
            type="number"
          />
          <button onClick={() => selectVersion(otherProvider, otherVersion)}>
            Use this version
          </button>
        </div>
        <div>
          <button onClick={() => selectVersion(otherProvider, 0)}>
            Use latest version
          </button>
        </div>
        <div>
          <button onClick={() => setSelectingVersion(false)}>Cancel</button>
        </div>
      </AnastasisClientFrame>
    );
  }
  return (
    <AnastasisClientFrame title="Recovery: Select secret">
      <p>Provider: {recoveryDocument.provider_url}</p>
      <p>Secret version: {recoveryDocument.version}</p>
      <p>Secret name: {recoveryDocument.version}</p>
      <button onClick={() => setSelectingVersion(true)}>
        Select different secret
      </button>
    </AnastasisClientFrame>
  );
}

interface AnastasisClientFrameProps {
  onNext?(): void;
  title: string;
  children: ComponentChildren;
  /**
   * Should back/next buttons be provided?
   */
  hideNav?: boolean;
  /**
   * Hide only the "next" button.
   */
  hideNext?: boolean;
}

function AnastasisClientFrame(props: AnastasisClientFrameProps) {
  const reducer = useContext(WithReducer);
  if (!reducer) {
    return <p>Fatal: Reducer must be in context.</p>;
  }
  const next = () => {
    if (props.onNext) {
      props.onNext();
    } else {
      reducer.transition("next", {});
    }
  };
  const handleKeyPress = (e: h.JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    console.log("Got key press", e.key);
    // FIXME: By default, "next" action should be executed here
  };
  return (
    <div class={style.home} onKeyPress={(e) => handleKeyPress(e)}>
      <button onClick={() => reducer.reset()}>Reset session</button>
      <h1>{props.title}</h1>
      <ErrorBanner reducer={reducer} />
      {props.children}
      {!props.hideNav ? (
        <div>
          <button onClick={() => reducer.back()}>Back</button>
          {!props.hideNext ? (
            <button onClick={() => next()}>Next</button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ChallengeOverview(props: RecoveryReducerProps) {
  const { recoveryState, reducer } = props;
  const policies = recoveryState.recovery_information!.policies;
  const chArr = recoveryState.recovery_information!.challenges;
  const challenges: {
    [uuid: string]: {
      type: string;
      instructions: string;
      cost: string;
    };
  } = {};
  for (const ch of chArr) {
    challenges[ch.uuid] = {
      type: ch.type,
      cost: ch.cost,
      instructions: ch.instructions,
    };
  }
  return (
    <AnastasisClientFrame title="Recovery: Solve challenges">
      <h2>Policies</h2>
      {policies.map((x, i) => {
        return (
          <div>
            <h3>Policy #{i + 1}</h3>
            {x.map((x) => {
              const ch = challenges[x.uuid];
              const feedback = recoveryState.challenge_feedback?.[x.uuid];
              return (
                <div
                  style={{
                    borderLeft: "2px solid gray",
                    paddingLeft: "0.5em",
                    borderRadius: "0.5em",
                    marginTop: "0.5em",
                    marginBottom: "0.5em",
                  }}
                >
                  <h4>
                    {ch.type} ({ch.instructions})
                  </h4>
                  <p>Status: {feedback?.state ?? "unknown"}</p>
                  {feedback?.state !== "solved" ? (
                    <button
                      onClick={() =>
                        reducer.transition("select_challenge", {
                          uuid: x.uuid,
                        })
                      }
                    >
                      Solve
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </AnastasisClientFrame>
  );
}

const AnastasisClient: FunctionalComponent = () => {
  const reducer = useAnastasisReducer();
  return (
    <WithReducer.Provider value={reducer}>
      <AnastasisClientImpl />
    </WithReducer.Provider>
  );
};

const AnastasisClientImpl: FunctionalComponent = () => {
  const reducer = useContext(WithReducer)!;
  const reducerState = reducer.currentReducerState;
  if (!reducerState) {
    return (
      <AnastasisClientFrame hideNav title="Home">
        <button autoFocus onClick={() => reducer.startBackup()}>
          Backup
        </button>
        <button onClick={() => reducer.startRecover()}>Recover</button>
      </AnastasisClientFrame>
    );
  }
  console.log("state", reducer.currentReducerState);

  if (
    reducerState.backup_state === BackupStates.ContinentSelecting ||
    reducerState.recovery_state === RecoveryStates.ContinentSelecting
  ) {
    return <ContinentSelection reducer={reducer} reducerState={reducerState} />;
  }
  if (
    reducerState.backup_state === BackupStates.CountrySelecting ||
    reducerState.recovery_state === RecoveryStates.CountrySelecting
  ) {
    return <CountrySelection reducer={reducer} reducerState={reducerState} />;
  }
  if (
    reducerState.backup_state === BackupStates.UserAttributesCollecting ||
    reducerState.recovery_state === RecoveryStates.UserAttributesCollecting
  ) {
    return <AttributeEntry reducer={reducer} reducerState={reducerState} />;
  }
  if (reducerState.backup_state === BackupStates.AuthenticationsEditing) {
    return (
      <AuthenticationEditor backupState={reducerState} reducer={reducer} />
    );
  }
  if (reducerState.backup_state === BackupStates.PoliciesReviewing) {
    return <ReviewPolicies reducer={reducer} backupState={reducerState} />;
  }
  if (reducerState.backup_state === BackupStates.SecretEditing) {
    return <SecretEditor reducer={reducer} backupState={reducerState} />;
  }

  if (reducerState.backup_state === BackupStates.BackupFinished) {
    const backupState: ReducerStateBackup = reducerState;
    return (
      <AnastasisClientFrame hideNext title="Backup finished">
        <p>
          Your backup of secret "{backupState.secret_name ?? "??"}" was
          successful.
        </p>
        <p>The backup is stored by the following providers:</p>
        <ul>
          {Object.keys(backupState.success_details!).map((x, i) => {
            const sd = backupState.success_details![x];
            return (
              <li>
                {x} (Policy version {sd.policy_version})
              </li>
            );
          })}
        </ul>
        <button onClick={() => reducer.reset()}>Back to start</button>
      </AnastasisClientFrame>
    );
  }

  if (reducerState.backup_state === BackupStates.TruthsPaying) {
    const backupState: ReducerStateBackup = reducerState;
    const payments = backupState.payments ?? [];
    return (
      <AnastasisClientFrame
        hideNext
        title="Backup: Authentication Storage Payments"
      >
        <p>
          Some of the providers require a payment to store the encrypted
          authentication information.
        </p>
        <ul>
          {payments.map((x) => {
            return <li>{x}</li>;
          })}
        </ul>
        <button onClick={() => reducer.transition("pay", {})}>
          Check payment status now
        </button>
      </AnastasisClientFrame>
    );
  }

  if (reducerState.backup_state === BackupStates.PoliciesPaying) {
    const backupState: ReducerStateBackup = reducerState;
    const payments = backupState.policy_payment_requests ?? [];

    return (
      <AnastasisClientFrame hideNext title="Backup: Recovery Document Payments">
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
        <button onClick={() => reducer.transition("pay", {})}>
          Check payment status now
        </button>
      </AnastasisClientFrame>
    );
  }

  if (reducerState.recovery_state === RecoveryStates.SecretSelecting) {
    return <SecretSelection reducer={reducer} recoveryState={reducerState} />;
  }

  if (reducerState.recovery_state === RecoveryStates.ChallengeSelecting) {
    return <ChallengeOverview reducer={reducer} recoveryState={reducerState} />;
  }

  if (reducerState.recovery_state === RecoveryStates.ChallengeSolving) {
    const chArr = reducerState.recovery_information!.challenges;
    const challengeFeedback = reducerState.challenge_feedback ?? {};
    const selectedUuid = reducerState.selected_challenge_uuid!;
    const challenges: {
      [uuid: string]: ChallengeInfo;
    } = {};
    for (const ch of chArr) {
      challenges[ch.uuid] = ch;
    }
    const selectedChallenge = challenges[selectedUuid];
    const dialogMap: Record<string, (p: SolveEntryProps) => h.JSX.Element> = {
      question: SolveQuestionEntry,
      sms: SolveSmsEntry,
      email: SolveEmailEntry,
      post: SolvePostEntry,
    };
    const SolveDialog =
      dialogMap[selectedChallenge.type] ?? SolveUnsupportedEntry;
    return (
      <SolveDialog
        challenge={selectedChallenge}
        reducer={reducer}
        feedback={challengeFeedback[selectedUuid]}
      />
    );
  }

  if (reducerState.recovery_state === RecoveryStates.RecoveryFinished) {
    return (
      <AnastasisClientFrame title="Recovery Finished" hideNext>
        <h1>Recovery Finished</h1>
        <p>
          Secret: {bytesToString(decodeCrock(reducerState.core_secret?.value!))}
        </p>
      </AnastasisClientFrame>
    );
  }

  console.log("unknown state", reducer.currentReducerState);
  return (
    <AnastasisClientFrame hideNav title="Bug">
      <p>Bug: Unknown state.</p>
      <button onClick={() => reducer.reset()}>Reset</button>
    </AnastasisClientFrame>
  );
};

interface AuthMethodSetupProps {
  method: string;
  addAuthMethod: (x: any) => void;
  cancel: () => void;
}

function AuthMethodSmsSetup(props: AuthMethodSetupProps) {
  const [mobileNumber, setMobileNumber] = useState("");
  const addSmsAuth = () => {
    props.addAuthMethod({
      authentication_method: {
        type: "sms",
        instructions: `SMS to ${mobileNumber}`,
        challenge: encodeCrock(stringToBytes(mobileNumber)),
      },
    });
  };
  const inputRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, []);
  return (
    <AnastasisClientFrame hideNav title="Add SMS authentication">
      <div>
        <p>
          For SMS authentication, you need to provide a mobile number. When
          recovering your secret, you will be asked to enter the code you
          receive via SMS.
        </p>
        <label>
          Mobile number:{" "}
          <input
            value={mobileNumber}
            ref={inputRef}
            style={{ display: "block" }}
            autoFocus
            onChange={(e) => setMobileNumber((e.target as any).value)}
            type="text"
          />
        </label>
        <div>
          <button onClick={() => props.cancel()}>Cancel</button>
          <button onClick={() => addSmsAuth()}>Add</button>
        </div>
      </div>
    </AnastasisClientFrame>
  );
}

function AuthMethodQuestionSetup(props: AuthMethodSetupProps) {
  const [questionText, setQuestionText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const addQuestionAuth = () =>
    props.addAuthMethod({
      authentication_method: {
        type: "question",
        instructions: questionText,
        challenge: encodeCrock(stringToBytes(answerText)),
      },
    });
  return (
    <AnastasisClientFrame hideNav title="Add Security Question">
      <div>
        <p>
          For security question authentication, you need to provide a question
          and its answer. When recovering your secret, you will be shown the
          question and you will need to type the answer exactly as you typed it
          here.
        </p>
        <div>
          <LabeledInput
            label="Security question"
            grabFocus
            bind={[questionText, setQuestionText]}
          />
        </div>
        <div>
          <LabeledInput label="Answer" bind={[answerText, setAnswerText]} />
        </div>
        <div>
          <button onClick={() => props.cancel()}>Cancel</button>
          <button onClick={() => addQuestionAuth()}>Add</button>
        </div>
      </div>
    </AnastasisClientFrame>
  );
}

function AuthMethodEmailSetup(props: AuthMethodSetupProps) {
  const [email, setEmail] = useState("");
  return (
    <AnastasisClientFrame hideNav title="Add email authentication">
      <p>
        For email authentication, you need to provide an email address. When
        recovering your secret, you will need to enter the code you receive by
        email.
      </p>
      <div>
        <LabeledInput
          label="Email address"
          grabFocus
          bind={[email, setEmail]}
        />
      </div>
      <div>
        <button onClick={() => props.cancel()}>Cancel</button>
        <button
          onClick={() =>
            props.addAuthMethod({
              authentication_method: {
                type: "email",
                instructions: `Email to ${email}`,
                challenge: encodeCrock(stringToBytes(email)),
              },
            })
          }
        >
          Add
        </button>
      </div>
    </AnastasisClientFrame>
  );
}

function AuthMethodPostSetup(props: AuthMethodSetupProps) {
  const [fullName, setFullName] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [postcode, setPostcode] = useState("");
  const [country, setCountry] = useState("");

  const addPostAuth = () => {
    const challengeJson = {
      full_name: fullName,
      street,
      city,
      postcode,
      country,
    };
    props.addAuthMethod({
      authentication_method: {
        type: "email",
        instructions: `Letter to address in postal code ${postcode}`,
        challenge: encodeCrock(stringToBytes(canonicalJson(challengeJson))),
      },
    });
  };

  return (
    <div class={style.home}>
      <h1>Add {props.method} authentication</h1>
      <div>
        <p>
          For postal letter authentication, you need to provide a postal
          address. When recovering your secret, you will be asked to enter a
          code that you will receive in a letter to that address.
        </p>
        <div>
          <LabeledInput
            grabFocus
            label="Full Name"
            bind={[fullName, setFullName]}
          />
        </div>
        <div>
          <LabeledInput label="Street" bind={[street, setStreet]} />
        </div>
        <div>
          <LabeledInput label="City" bind={[city, setCity]} />
        </div>
        <div>
          <LabeledInput label="Postal Code" bind={[postcode, setPostcode]} />
        </div>
        <div>
          <LabeledInput label="Country" bind={[country, setCountry]} />
        </div>
        <div>
          <button onClick={() => props.cancel()}>Cancel</button>
          <button onClick={() => addPostAuth()}>Add</button>
        </div>
      </div>
    </div>
  );
}

function AuthMethodNotImplemented(props: AuthMethodSetupProps) {
  return (
    <AnastasisClientFrame hideNav title={`Add ${props.method} authentication`}>
      <p>This auth method is not implemented yet, please choose another one.</p>
      <button onClick={() => props.cancel()}>Cancel</button>
    </AnastasisClientFrame>
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
    const cancel = () => setSelectedMethod(undefined);
    const addMethod = (args: any) => {
      reducer.transition("add_authentication", args);
      setSelectedMethod(undefined);
    };
    const methodMap: Record<
      string,
      (props: AuthMethodSetupProps) => h.JSX.Element
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
        method={selectedMethod}
      />
    );
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
    </AnastasisClientFrame>
  );
}

export interface AttributeEntryProps {
  reducer: AnastasisReducerApi;
  reducerState: ReducerStateRecovery | ReducerStateBackup;
}

function AttributeEntry(props: AttributeEntryProps) {
  const { reducer, reducerState: backupState } = props;
  const [attrs, setAttrs] = useState<Record<string, string>>(
    props.reducerState.identity_attributes ?? {},
  );
  return (
    <AnastasisClientFrame
      title={withProcessLabel(reducer, "Select Country")}
      onNext={() =>
        reducer.transition("enter_user_attributes", {
          identity_attributes: attrs,
        })
      }
    >
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
    </AnastasisClientFrame>
  );
}

interface LabeledInputProps {
  label: string;
  grabFocus?: boolean;
  bind: [string, (x: string) => void];
}

function LabeledInput(props: LabeledInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (props.grabFocus) {
      inputRef.current?.focus();
    }
  }, []);
  return (
    <label>
      {props.label}
      <input
        value={props.bind[0]}
        onChange={(e) => props.bind[1]((e.target as HTMLInputElement).value)}
        ref={inputRef}
        style={{ display: "block" }}
      />
    </label>
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
      <LabeledInput
        grabFocus={props.isFirst}
        label={props.spec.label}
        bind={[props.value, props.setValue]}
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

export default AnastasisClient;
