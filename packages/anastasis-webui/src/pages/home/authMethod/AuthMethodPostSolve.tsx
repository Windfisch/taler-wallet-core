import { ChallengeInfo } from "@gnu-taler/anastasis-core";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { AsyncButton } from "../../../components/AsyncButton.js";
import { TextInput } from "../../../components/fields/TextInput.js";
import { useAnastasisContext } from "../../../context/anastasis.js";
import { useTranslator } from "../../../i18n/index.js";
import { AnastasisClientFrame } from "../index.js";
import { SolveOverviewFeedbackDisplay } from "../SolveScreen.js";
import { shouldHideConfirm } from "./helpers.js";
import { AuthMethodSolveProps } from "./index.js";

export function AuthMethodPostSolve({ id }: AuthMethodSolveProps): VNode {
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
      result += `-${unformatted.substring(12)}`;
    }

    _setAnswer(result);
  }
  const i18n = useTranslator();

  const reducer = useAnastasisContext();
  if (!reducer) {
    return (
      <AnastasisClientFrame hideNav title="Recovery problem">
        <div>no reducer in context</div>
      </AnastasisClientFrame>
    );
  }
  if (reducer.currentReducerState?.reducer_type !== "recovery") {
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

  const error =
    answer.length > 21
      ? i18n`The answer should not be greater than 21 characters.`
      : undefined;

  return (
    <AnastasisClientFrame hideNav title="Postal Challenge">
      <SolveOverviewFeedbackDisplay feedback={feedback} />
      <p>Wait for the answer</p>
      <TextInput
        onConfirm={onNext}
        label="Answer"
        grabFocus
        placeholder="A-12345-678-1234-5678"
        error={error}
        bind={[answer, setAnswer]}
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
        {!shouldHideConfirm(feedback) && (
          <AsyncButton
            class="button is-info"
            onClick={onNext}
            disabled={!!error}
          >
            Confirm
          </AsyncButton>
        )}
      </div>
    </AnastasisClientFrame>
  );
}
