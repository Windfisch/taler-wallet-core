/*
 This file is part of GNU Anastasis
 (C) 2021-2022 Anastasis SARL

 GNU Anastasis is free software; you can redistribute it and/or modify it under the
 terms of the GNU Affero General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Anastasis is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU Affero General Public License for more details.

 You should have received a copy of the GNU Affero General Public License along with
 GNU Anastasis; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */
import { BackupStates, RecoveryStates } from "@gnu-taler/anastasis-core";
import {
  ComponentChildren,
  Fragment,
  FunctionalComponent,
  h,
  VNode,
} from "preact";
import { useCallback, useEffect, useErrorBoundary } from "preact/hooks";
import { AsyncButton } from "../../components/AsyncButton.js";
import { Menu } from "../../components/menu/index.js";
import { Notifications } from "../../components/Notifications.js";
import {
  AnastasisProvider,
  useAnastasisContext,
} from "../../context/anastasis.js";
import {
  AnastasisReducerApi,
  useAnastasisReducer,
} from "../../hooks/use-anastasis-reducer.js";
import { AttributeEntryScreen } from "./AttributeEntryScreen.js";
import { AuthenticationEditorScreen } from "./AuthenticationEditorScreen.js";
import { BackupFinishedScreen } from "./BackupFinishedScreen.js";
import { ChallengeOverviewScreen } from "./ChallengeOverviewScreen.js";
import { ChallengePayingScreen } from "./ChallengePayingScreen.js";
import { ContinentSelectionScreen } from "./ContinentSelectionScreen.js";
import { PoliciesPayingScreen } from "./PoliciesPayingScreen.js";
import { RecoveryFinishedScreen } from "./RecoveryFinishedScreen.js";
import { ReviewPoliciesScreen } from "./ReviewPoliciesScreen.js";
import { SecretEditorScreen } from "./SecretEditorScreen.js";
import { SecretSelectionScreen } from "./SecretSelectionScreen.js";
import { SolveScreen } from "./SolveScreen.js";
import { StartScreen } from "./StartScreen.js";
import { TruthsPayingScreen } from "./TruthsPayingScreen.js";

function isBackup(reducer: AnastasisReducerApi): boolean {
  return reducer.currentReducerState?.reducer_type === "backup";
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
  onNext?(): Promise<void>;
  /**
   * Override for the "back" functionality.
   */
  onBack?(): Promise<void>;
  title: string;
  children: ComponentChildren;
  /**
   * Should back/next buttons be provided?
   */
  hideNav?: boolean;
  /**
   * Hide only the "next" button.
   */
  hideNext?: string;
}

function ErrorBoundary(props: {
  reducer: AnastasisReducerApi;
  children: ComponentChildren;
}): VNode {
  const [error, resetError] = useErrorBoundary((error) =>
    console.log("ErrorBoundary got error", error),
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

let currentHistoryId = 0;

export function AnastasisClientFrame(props: AnastasisClientFrameProps): VNode {
  const reducer = useAnastasisContext();

  const doBack = async (): Promise<void> => {
    if (props.onBack) {
      await props.onBack();
    } else {
      if (!reducer) return;
      await reducer.back();
    }
  };
  const doNext = async (fromPopstate?: boolean): Promise<void> => {
    if (!fromPopstate) {
      try {
        const nextId: number =
          (history.state && typeof history.state.id === "number"
            ? history.state.id
            : 0) + 1;

        currentHistoryId = nextId;

        history.pushState({ id: nextId }, "unused", `#${nextId}`);
      } catch (e) {
        console.log("ERROR doNext ", e);
      }
    }

    if (props.onNext) {
      await props.onNext();
    } else {
      if (!reducer) return;
      await reducer.transition("next", {});
    }
  };
  const handleKeyPress = (
    e: h.JSX.TargetedKeyboardEvent<HTMLDivElement>,
  ): void => {
    // console.log("Got key press", e.key);
    // FIXME: By default, "next" action should be executed here
  };

  const browserOnBackButton = useCallback(async (ev: PopStateEvent) => {
    //check if we are going back or forward
    if (!ev.state || ev.state.id === 0 || ev.state.id < currentHistoryId) {
      await doBack();
    } else {
      await doNext(true);
    }

    // reducer
    return false;
  }, []);
  useEffect(() => {
    window.addEventListener("popstate", browserOnBackButton);

    return () => {
      window.removeEventListener("popstate", browserOnBackButton);
    };
  }, []);
  // if (!reducer) {
  //   return <p>Fatal: Reducer must be in context.</p>;
  // }

  return (
    <Fragment>
      <div class="home" onKeyPress={(e) => handleKeyPress(e)}>
        <h1 class="title">{props.title}</h1>
        <ErrorBanner />
        <section class="section is-main-section">
          {props.children}
          {!props.hideNav ? (
            <div
              style={{
                marginTop: "2em",
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <button class="button" onClick={() => doBack()}>
                Back
              </button>
              <AsyncButton
                class="button is-info"
                data-tooltip={props.hideNext}
                onClick={() => doNext()}
                disabled={props.hideNext !== undefined}
              >
                Next
              </AsyncButton>
            </div>
          ) : null}
        </section>
      </div>
    </Fragment>
  );
}

const AnastasisClient: FunctionalComponent = () => {
  const reducer = useAnastasisReducer();
  return (
    <AnastasisProvider value={reducer}>
      <ErrorBoundary reducer={reducer}>
        <Menu title="Anastasis" />
        <AnastasisClientImpl />
      </ErrorBoundary>
    </AnastasisProvider>
  );
};

function AnastasisClientImpl(): VNode {
  const reducer = useAnastasisContext();
  if (!reducer) {
    return <p>Fatal: Reducer must be in context.</p>;
  }
  const state = reducer.currentReducerState;
  if (!state) {
    return <StartScreen />;
  }

  if (
    (state.reducer_type === "backup" &&
      state.backup_state === BackupStates.ContinentSelecting) ||
    (state.reducer_type === "recovery" &&
      state.recovery_state === RecoveryStates.ContinentSelecting) ||
    (state.reducer_type === "backup" &&
      state.backup_state === BackupStates.CountrySelecting) ||
    (state.reducer_type === "recovery" &&
      state.recovery_state === RecoveryStates.CountrySelecting)
  ) {
    return <ContinentSelectionScreen />;
  }
  if (
    (state.reducer_type === "backup" &&
      state.backup_state === BackupStates.UserAttributesCollecting) ||
    (state.reducer_type === "recovery" &&
      state.recovery_state === RecoveryStates.UserAttributesCollecting)
  ) {
    return <AttributeEntryScreen />;
  }
  if (
    state.reducer_type === "backup" &&
    state.backup_state === BackupStates.AuthenticationsEditing
  ) {
    return <AuthenticationEditorScreen />;
  }
  if (
    state.reducer_type === "backup" &&
    state.backup_state === BackupStates.PoliciesReviewing
  ) {
    return <ReviewPoliciesScreen />;
  }
  if (
    state.reducer_type === "backup" &&
    state.backup_state === BackupStates.SecretEditing
  ) {
    return <SecretEditorScreen />;
  }

  if (
    state.reducer_type === "backup" &&
    state.backup_state === BackupStates.BackupFinished
  ) {
    return <BackupFinishedScreen />;
  }

  if (
    state.reducer_type === "backup" &&
    state.backup_state === BackupStates.TruthsPaying
  ) {
    return <TruthsPayingScreen />;
  }

  if (
    state.reducer_type === "backup" &&
    state.backup_state === BackupStates.PoliciesPaying
  ) {
    return <PoliciesPayingScreen />;
  }

  if (
    state.reducer_type === "recovery" &&
    state.recovery_state === RecoveryStates.SecretSelecting
  ) {
    return <SecretSelectionScreen />;
  }

  if (
    state.reducer_type === "recovery" &&
    state.recovery_state === RecoveryStates.ChallengeSelecting
  ) {
    return <ChallengeOverviewScreen />;
  }

  if (
    state.reducer_type === "recovery" &&
    state.recovery_state === RecoveryStates.ChallengeSolving
  ) {
    return <SolveScreen />;
  }

  if (
    state.reducer_type === "recovery" &&
    state.recovery_state === RecoveryStates.RecoveryFinished
  ) {
    return <RecoveryFinishedScreen />;
  }
  if (
    state.reducer_type === "recovery" &&
    state.recovery_state === RecoveryStates.ChallengePaying
  ) {
    return <ChallengePayingScreen />;
  }
  console.log("unknown state", reducer.currentReducerState);
  return (
    <AnastasisClientFrame hideNav title="Bug">
      <p>Bug: Unknown state.</p>
      <div class="buttons is-right">
        <button class="button" onClick={() => reducer.reset()}>
          Reset
        </button>
      </div>
    </AnastasisClientFrame>
  );
}

/**
 * Show a dismissible error banner if there is a current error.
 */
function ErrorBanner(): VNode | null {
  const reducer = useAnastasisContext();
  if (!reducer || !reducer.currentError) return null;
  return (
    <Notifications
      removeNotification={reducer.dismissError}
      notifications={[
        {
          type: "ERROR",
          message: `Error code: ${reducer.currentError.code}`,
          description: reducer.currentError.hint,
        },
      ]}
    />
  );
}

export default AnastasisClient;
