import {
  Component,
  ComponentChildren,
  createContext,
  Fragment,
  FunctionalComponent,
  h,
  VNode,
} from "preact";
import {
  useContext,
  useErrorBoundary,
  useLayoutEffect,
  useRef,
} from "preact/hooks";
import { Menu } from "../../components/menu";
import {
  BackupStates,
  RecoveryStates,
  ReducerStateBackup,
  ReducerStateRecovery,
} from "anastasis-core";
import {
  AnastasisReducerApi,
  useAnastasisReducer,
} from "../../hooks/use-anastasis-reducer";
import { AttributeEntryScreen } from "./AttributeEntryScreen";
import { AuthenticationEditorScreen } from "./AuthenticationEditorScreen";
import { BackupFinishedScreen } from "./BackupFinishedScreen";
import { ChallengeOverviewScreen } from "./ChallengeOverviewScreen";
import { ContinentSelectionScreen } from "./ContinentSelectionScreen";
import { CountrySelectionScreen } from "./CountrySelectionScreen";
import { PoliciesPayingScreen } from "./PoliciesPayingScreen";
import { RecoveryFinishedScreen } from "./RecoveryFinishedScreen";
import { ReviewPoliciesScreen } from "./ReviewPoliciesScreen";
import { SecretEditorScreen } from "./SecretEditorScreen";
import { SecretSelectionScreen } from "./SecretSelectionScreen";
import { SolveScreen } from "./SolveScreen";
import { StartScreen } from "./StartScreen";
import { TruthsPayingScreen } from "./TruthsPayingScreen";
import "./../home/style";

const WithReducer = createContext<AnastasisReducerApi | undefined>(undefined);

function isBackup(reducer: AnastasisReducerApi): boolean {
  return !!reducer.currentReducerState?.backup_state;
}

export interface CommonReducerProps {
  reducer: AnastasisReducerApi;
  reducerState: ReducerStateBackup | ReducerStateRecovery;
}

export function withProcessLabel(
  reducer: AnastasisReducerApi,
  text: string,
): string {
  if (isBackup(reducer)) {
    return `Backup: ${text}`;
  }
  return `Recovery: ${text}`;
}

export interface BackupReducerProps {
  reducer: AnastasisReducerApi;
  backupState: ReducerStateBackup;
}

export interface RecoveryReducerProps {
  reducer: AnastasisReducerApi;
  recoveryState: ReducerStateRecovery;
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

function ErrorBoundary(props: {
  reducer: AnastasisReducerApi;
  children: ComponentChildren;
}) {
  const [error, resetError] = useErrorBoundary((error) =>
    console.log("got error", error),
  );
  if (error) {
    return (
      <div>
        <button
          onClick={() => {
            props.reducer.reset();
            resetError();
          }}
        >
          Reset
        </button>
        <p>
          Error: <pre>{error.stack}</pre>
        </p>
      </div>
    );
  }
  return <div>{props.children}</div>;
}

export function AnastasisClientFrame(props: AnastasisClientFrameProps): VNode {
  const reducer = useContext(WithReducer);
  if (!reducer) {
    return <p>Fatal: Reducer must be in context.</p>;
  }
  const next = (): void => {
    if (props.onNext) {
      props.onNext();
    } else {
      reducer.transition("next", {});
    }
  };
  const handleKeyPress = (
    e: h.JSX.TargetedKeyboardEvent<HTMLDivElement>,
  ): void => {
    console.log("Got key press", e.key);
    // FIXME: By default, "next" action should be executed here
  };
  return (
    <Fragment>
      <Menu title="Anastasis" />
      <div>
        <div class="home" onKeyPress={(e) => handleKeyPress(e)}>
          <button onClick={() => reducer.reset()}>Reset session</button>
          <h1>{props.title}</h1>
          <ErrorBanner reducer={reducer} />
          {props.children}
          {!props.hideNav ? (
            <div>
              <button onClick={() => reducer.back()}>Back</button>
              {!props.hideNext ? <button onClick={next}>Next</button> : null}
            </div>
          ) : null}
        </div>
      </div>
    </Fragment>
  );
}

const AnastasisClient: FunctionalComponent = () => {
  const reducer = useAnastasisReducer();
  return (
    <WithReducer.Provider value={reducer}>
      <ErrorBoundary reducer={reducer}>
        <AnastasisClientImpl />
      </ErrorBoundary>
    </WithReducer.Provider>
  );
};

const AnastasisClientImpl: FunctionalComponent = () => {
  const reducer = useContext(WithReducer)!;
  const reducerState = reducer.currentReducerState;
  if (!reducerState) {
    return <StartScreen reducer={reducer} />;
  }
  console.log("state", reducer.currentReducerState);

  if (
    reducerState.backup_state === BackupStates.ContinentSelecting ||
    reducerState.recovery_state === RecoveryStates.ContinentSelecting
  ) {
    return (
      <ContinentSelectionScreen reducer={reducer} reducerState={reducerState} />
    );
  }
  if (
    reducerState.backup_state === BackupStates.CountrySelecting ||
    reducerState.recovery_state === RecoveryStates.CountrySelecting
  ) {
    return (
      <CountrySelectionScreen reducer={reducer} reducerState={reducerState} />
    );
  }
  if (
    reducerState.backup_state === BackupStates.UserAttributesCollecting ||
    reducerState.recovery_state === RecoveryStates.UserAttributesCollecting
  ) {
    return (
      <AttributeEntryScreen reducer={reducer} reducerState={reducerState} />
    );
  }
  if (reducerState.backup_state === BackupStates.AuthenticationsEditing) {
    return (
      <AuthenticationEditorScreen
        backupState={reducerState}
        reducer={reducer}
      />
    );
  }
  if (reducerState.backup_state === BackupStates.PoliciesReviewing) {
    return (
      <ReviewPoliciesScreen reducer={reducer} backupState={reducerState} />
    );
  }
  if (reducerState.backup_state === BackupStates.SecretEditing) {
    return <SecretEditorScreen reducer={reducer} backupState={reducerState} />;
  }

  if (reducerState.backup_state === BackupStates.BackupFinished) {
    const backupState: ReducerStateBackup = reducerState;
    return <BackupFinishedScreen reducer={reducer} backupState={backupState} />;
  }

  if (reducerState.backup_state === BackupStates.TruthsPaying) {
    return <TruthsPayingScreen reducer={reducer} backupState={reducerState} />;
  }

  if (reducerState.backup_state === BackupStates.PoliciesPaying) {
    const backupState: ReducerStateBackup = reducerState;
    return <PoliciesPayingScreen reducer={reducer} backupState={backupState} />;
  }

  if (reducerState.recovery_state === RecoveryStates.SecretSelecting) {
    return (
      <SecretSelectionScreen reducer={reducer} recoveryState={reducerState} />
    );
  }

  if (reducerState.recovery_state === RecoveryStates.ChallengeSelecting) {
    return (
      <ChallengeOverviewScreen reducer={reducer} recoveryState={reducerState} />
    );
  }

  if (reducerState.recovery_state === RecoveryStates.ChallengeSolving) {
    return <SolveScreen reducer={reducer} recoveryState={reducerState} />;
  }

  if (reducerState.recovery_state === RecoveryStates.RecoveryFinished) {
    return (
      <RecoveryFinishedScreen reducer={reducer} recoveryState={reducerState} />
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

interface LabeledInputProps {
  label: string;
  grabFocus?: boolean;
  bind: [string, (x: string) => void];
}

export function LabeledInput(props: LabeledInputProps): VNode {
  const inputRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (props.grabFocus) {
      inputRef.current?.focus();
    }
  }, [props.grabFocus]);
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

interface ErrorBannerProps {
  reducer: AnastasisReducerApi;
}

/**
 * Show a dismissable error banner if there is a current error.
 */
function ErrorBanner(props: ErrorBannerProps): VNode | null {
  const currentError = props.reducer.currentError;
  if (currentError) {
    return (
      <div id="error">
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
