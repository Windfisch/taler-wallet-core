/* eslint-disable @typescript-eslint/camelcase */
import {
  encodeCrock,
  stringToBytes
} from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { AuthMethodSetupProps, AnastasisClientFrame, LabeledInput } from "./index";

export function AuthMethodQuestionSetup(props: AuthMethodSetupProps): VNode {
  const [questionText, setQuestionText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const addQuestionAuth = (): void => props.addAuthMethod({
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
            bind={[questionText, setQuestionText]} />
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
