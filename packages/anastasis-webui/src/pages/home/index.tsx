import {
  BackupStates,
  RecoveryStates,
  ReducerStateBackup,
  ReducerStateRecovery
} from "anastasis-core";
import {
  ComponentChildren, Fragment,
  FunctionalComponent,
  h,
  VNode
} from "preact";
import {
  useErrorBoundary} from "preact/hooks";
import { Menu } from "../../components/menu";
import { AnastasisProvider, useAnastasisContext } from "../../context/anastasis";
import {
  AnastasisReducerApi,
  useAnastasisReducer
} from "../../hooks/use-anastasis-reducer";
import { AttributeEntryScreen } from "./AttributeEntryScreen";
import { AuthenticationEditorScreen } from "./AuthenticationEditorScreen";
import { BackupFinishedScreen } from "./BackupFinishedScreen";
import { ChallengeOverviewScreen } from "./ChallengeOverviewScreen";
import { ChallengePayingScreen } from "./ChallengePayingScreen";
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

function isBackup(reducer: AnastasisReducerApi): boolean {
  return !!reducer.currentReducerState?.backup_state;
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
}): VNode {
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
  const reducer = useAnastasisContext();
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
          <h1>{props.title}</h1>
          <ErrorBanner />
          {props.children}
          {!props.hideNav ? (
            <div style={{marginTop: '2em', display:'flex', justifyContent:'space-between'}}>
              <button class="button" onClick={() => reducer.back()}>Back</button>
              {!props.hideNext ? <button class="button is-info"onClick={next}>Next</button> : null}
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
    <AnastasisProvider value={reducer}>
      <ErrorBoundary reducer={reducer}>
        <AnastasisClientImpl />
      </ErrorBoundary>
    </AnastasisProvider>
  );
};

const AnastasisClientImpl: FunctionalComponent = () => {
  const reducer = useAnastasisContext()
  if (!reducer) {
    return <p>Fatal: Reducer must be in context.</p>;
  }
  const state = reducer.currentReducerState;
  if (!state) {
    return <StartScreen />;
  }
  console.log("state", reducer.currentReducerState);

  if (
    state.backup_state === BackupStates.ContinentSelecting ||
    state.recovery_state === RecoveryStates.ContinentSelecting
  ) {
    return (
      <ContinentSelectionScreen />
    );
  }
  if (
    state.backup_state === BackupStates.CountrySelecting ||
    state.recovery_state === RecoveryStates.CountrySelecting
  ) {
    return (
      <CountrySelectionScreen />
    );
  }
  if (
    state.backup_state === BackupStates.UserAttributesCollecting ||
    state.recovery_state === RecoveryStates.UserAttributesCollecting
  ) {
    return (
      <AttributeEntryScreen />
    );
  }
  if (state.backup_state === BackupStates.AuthenticationsEditing) {
    return (
      <AuthenticationEditorScreen />
    );
  }
  if (state.backup_state === BackupStates.PoliciesReviewing) {
    return (
      <ReviewPoliciesScreen />
    );
  }
  if (state.backup_state === BackupStates.SecretEditing) {
    return <SecretEditorScreen />;
  }

  if (state.backup_state === BackupStates.BackupFinished) {
    return <BackupFinishedScreen />;
  }

  if (state.backup_state === BackupStates.TruthsPaying) {
    return <TruthsPayingScreen />;
  }

  if (state.backup_state === BackupStates.PoliciesPaying) {
    return <PoliciesPayingScreen />;
  }

  if (state.recovery_state === RecoveryStates.SecretSelecting) {
    return (
      <SecretSelectionScreen />
    );
  }

  if (state.recovery_state === RecoveryStates.ChallengeSelecting) {
    return (
      <ChallengeOverviewScreen />
    );
  }

  if (state.recovery_state === RecoveryStates.ChallengeSolving) {
    return <SolveScreen />;
  }

  if (state.recovery_state === RecoveryStates.RecoveryFinished) {
    return (
      <RecoveryFinishedScreen />
    );
  }
  if (state.recovery_state === RecoveryStates.ChallengePaying) {
    return <ChallengePayingScreen />;
  }
  console.log("unknown state", reducer.currentReducerState);
  return (
    <AnastasisClientFrame hideNav title="Bug">
      <p>Bug: Unknown state.</p>
      <div class="buttons is-right">
        <button class="button" onClick={() => reducer.reset()}>Reset</button>
      </div>
    </AnastasisClientFrame>
  );
};

/**
 * Show a dismissible error banner if there is a current error.
 */
function ErrorBanner(): VNode | null {
  const reducer = useAnastasisContext();
  if (!reducer || !reducer.currentError) return null;
  return (
    <div id="error">
      <p>Error: {JSON.stringify(reducer.currentError)}</p>
      <button onClick={() => reducer.dismissError()}>
        Dismiss Error
      </button>
    </div>
  );
}

export default AnastasisClient;
