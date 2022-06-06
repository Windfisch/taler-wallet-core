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
import { ChallengeInfo } from "@gnu-taler/anastasis-core";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { AsyncButton } from "../../../components/AsyncButton.js";
import { TextInput } from "../../../components/fields/TextInput.js";
import { useAnastasisContext } from "../../../context/anastasis.js";
import { AnastasisClientFrame } from "../index.js";
import { SolveOverviewFeedbackDisplay } from "../SolveScreen.js";
import { shouldHideConfirm } from "./helpers.js";
import { AuthMethodSolveProps } from "./index.js";

export function AuthMethodTotpSolve(props: AuthMethodSolveProps): VNode {
  const [answerCode, setAnswerCode] = useState("");

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
  const feedback = challengeFeedback[selectedUuid];

  async function onNext(): Promise<void> {
    console.log(`sending TOTP code '${answerCode}'`);
    return reducer?.transition("solve_challenge", {
      answer: answerCode,
    });
  }
  function onCancel(): void {
    reducer?.back();
  }

  return (
    <AnastasisClientFrame hideNav title="TOTP Challenge">
      <SolveOverviewFeedbackDisplay feedback={feedback} />
      <p>enter the totp solution</p>
      <TextInput
        label="Answer"
        onConfirm={onNext}
        grabFocus
        bind={[answerCode, setAnswerCode]}
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
          <AsyncButton class="button is-info" onClick={onNext}>
            Confirm
          </AsyncButton>
        )}
      </div>
    </AnastasisClientFrame>
  );
}
