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
import { encodeCrock, stringToBytes } from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { useState } from "preact/hooks";
import { TextInput } from "../../../components/fields/TextInput.js";
import { AnastasisClientFrame } from "../index.js";
import { AuthMethodSetupProps } from "./index.js";

export function AuthMethodQuestionSetup({
  cancel,
  addAuthMethod,
  configured,
}: AuthMethodSetupProps): VNode {
  const [questionText, setQuestionText] = useState("");
  const [answerText, setAnswerText] = useState("");
  const addQuestionAuth = (): void =>
    addAuthMethod({
      authentication_method: {
        type: "question",
        instructions: questionText,
        challenge: encodeCrock(stringToBytes(answerText)),
      },
    });

  const errors = !questionText
    ? "Add your security question"
    : !answerText
    ? "Add the answer to your question"
    : undefined;
  function goNextIfNoErrors(): void {
    if (!errors) addQuestionAuth();
  }
  return (
    <AnastasisClientFrame hideNav title="Add Security Question">
      <div>
        <p>
          For security question authentication, you need to provide a question
          and its answer. When recovering your secret, you will be shown the
          question and you will need to type the answer exactly as you typed it
          here.
        </p>
        <p class="notification is-warning">
          Note that the answer is case-sensitive and must be entered in exactly
          the same way (punctuation, spaces) during recovery.
        </p>
        <div>
          <TextInput
            label="Security question"
            grabFocus
            onConfirm={goNextIfNoErrors}
            placeholder="Your question"
            bind={[questionText, setQuestionText]}
          />
        </div>
        <div>
          <TextInput
            label="Answer"
            onConfirm={goNextIfNoErrors}
            placeholder="Your answer"
            bind={[answerText, setAnswerText]}
          />
        </div>

        <div
          style={{
            marginTop: "2em",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <button class="button" onClick={cancel}>
            Cancel
          </button>
          <span data-tooltip={errors}>
            <button
              class="button is-info"
              disabled={errors !== undefined}
              onClick={addQuestionAuth}
            >
              Add
            </button>
          </span>
        </div>

        {configured.length > 0 && (
          <section class="section">
            <div class="block">Your security questions:</div>
            <div class="block">
              {configured.map((c, i) => {
                return (
                  <div
                    key={i}
                    class="box"
                    style={{ display: "flex", justifyContent: "space-between" }}
                  >
                    <p style={{ marginBottom: "auto", marginTop: "auto" }}>
                      {c.instructions}
                    </p>
                    <div>
                      <button class="button is-danger" onClick={c.remove}>
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </AnastasisClientFrame>
  );
}
