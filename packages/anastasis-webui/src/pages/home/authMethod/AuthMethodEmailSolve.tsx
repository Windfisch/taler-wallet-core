import {
  ChallengeFeedbackStatus,
  ChallengeInfo,
} from "@gnu-taler/anastasis-core";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { AsyncButton } from "../../../components/AsyncButton";
import { TextInput } from "../../../components/fields/TextInput";
import { useAnastasisContext } from "../../../context/anastasis";
import { AnastasisClientFrame } from "../index";
import { SolveOverviewFeedbackDisplay } from "../SolveScreen";
import { AuthMethodSolveProps } from "./index";

export function AuthMethodEmailSolve({ id }: AuthMethodSolveProps): VNode {
  const [answer, _setAnswer] = useState("A-");

  function setAnswer(str: string): void {
    //A-12345-678-1234-5678
    const unformatted = str
      .replace(/^A-/, "")
      .replace(/-/g, "")
      .toLocaleUpperCase();

    let result = `A-${unformatted.substring(0, 5)}`;
    if (unformatted.length > 5) {
      result += `-${unformatted.substring(5, 8)}`;
    }
    if (unformatted.length > 8) {
      result += `-${unformatted.substring(8, 12)}`;
    }
    if (unformatted.length > 12) {
      result += `-${unformatted.substring(12, 16)}`;
    }

    _setAnswer(result);
  }
  const [expanded, setExpanded] = useState(false);

  const reducer = useAnastasisContext();
  if (!reducer) {
    return (
      <AnastasisClientFrame hideNav title="Recovery problem">
        <div>no reducer in context</div>
      </AnastasisClientFrame>
    );
  }
  if (
    !reducer.currentReducerState ||
    reducer.currentReducerState.recovery_state === undefined
  ) {
    return (
      <AnastasisClientFrame hideNav title="Recovery problem">
        <div>invalid state</div>
      </AnastasisClientFrame>
    );
  }

  if (!reducer.currentReducerState.recovery_information) {
    return (
      <AnastasisClientFrame
        hideNext="Recovery document not found"
        title="Recovery problem"
      >
        <div>no recovery information found</div>
      </AnastasisClientFrame>
    );
  }
  if (!reducer.currentReducerState.selected_challenge_uuid) {
    return (
      <AnastasisClientFrame hideNav title="Recovery problem">
        <div>invalid state</div>
        <div
          style={{
            marginTop: "2em",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <button class="button" onClick={() => reducer.back()}>
            Back
          </button>
        </div>
      </AnastasisClientFrame>
    );
  }

  const chArr = reducer.currentReducerState.recovery_information.challenges;
  const challengeFeedback =
    reducer.currentReducerState.challenge_feedback ?? {};
  const selectedUuid = reducer.currentReducerState.selected_challenge_uuid;
  const challenges: {
    [uuid: string]: ChallengeInfo;
  } = {};
  for (const ch of chArr) {
    challenges[ch.uuid] = ch;
  }
  const selectedChallenge = challenges[selectedUuid];
  const feedback = challengeFeedback[selectedUuid];

  async function onNext(): Promise<void> {
    return reducer?.transition("solve_challenge", {
      answer: `A-${answer.replace(/^A-/, "").replace(/-/g, "").trim()}`,
    });
  }
  function onCancel(): void {
    reducer?.back();
  }

  const shouldHideConfirm =
    feedback?.state === ChallengeFeedbackStatus.RateLimitExceeded ||
    feedback?.state === ChallengeFeedbackStatus.Redirect ||
    feedback?.state === ChallengeFeedbackStatus.Unsupported ||
    feedback?.state === ChallengeFeedbackStatus.TruthUnknown;

  return (
    <AnastasisClientFrame hideNav title="Email challenge">
      <SolveOverviewFeedbackDisplay feedback={feedback} />
      <p>
        An email has been sent to "<b>{selectedChallenge.instructions}</b>". The
        message has and identification code and recovery code that starts with "
        <b>A-</b>". Wait the message to arrive and the enter the recovery code
        below.
      </p>
      {!expanded ? (
        <p>
          The identification code in the email should start with "
          {selectedUuid.substring(0, 10)}"
          <span
            class="icon has-tooltip-top"
            data-tooltip="click to expand"
            onClick={() => setExpanded((e) => !e)}
          >
            <i class="mdi mdi-information" />
          </span>
        </p>
      ) : (
        <p>
          The identification code in the email is "{selectedUuid}"
          <span
            class="icon has-tooltip-top"
            data-tooltip="click to show less code"
            onClick={() => setExpanded((e) => !e)}
          >
            <i class="mdi mdi-information" />
          </span>
        </p>
      )}
      <TextInput
        label="Answer"
        grabFocus
        onConfirm={onNext}
        bind={[answer, setAnswer]}
        placeholder="A-12345-678-1234-5678"
      />

      <div
        style={{
          marginTop: "2em",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <button class="button" onClick={onCancel}>
          Cancel
        </button>
        {!shouldHideConfirm && (
          <AsyncButton class="button is-info" onClick={onNext}>
            Confirm
          </AsyncButton>
        )}
      </div>
    </AnastasisClientFrame>
  );
}
