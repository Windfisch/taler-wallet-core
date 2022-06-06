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
import {
  ChallengeFeedback,
  ChallengeFeedbackStatus,
} from "@gnu-taler/anastasis-core";
import { h, VNode } from "preact";
import { AsyncButton } from "../../components/AsyncButton.js";
import { useAnastasisContext } from "../../context/anastasis.js";
import { authMethods, KnownAuthMethods } from "./authMethod/index.js";
import { AnastasisClientFrame } from "./index.js";

function OverviewFeedbackDisplay(props: { feedback?: ChallengeFeedback }) {
  const { feedback } = props;
  if (!feedback) {
    return null;
  }
  switch (feedback.state) {
    case ChallengeFeedbackStatus.Solved:
      return <div />;
    case ChallengeFeedbackStatus.IbanInstructions:
      return null;
    case ChallengeFeedbackStatus.ServerFailure:
      return <div class="block has-text-danger">Server error.</div>;
    case ChallengeFeedbackStatus.RateLimitExceeded:
      return (
        <div class="block has-text-danger">
          There were to many failed attempts.
        </div>
      );
    case ChallengeFeedbackStatus.Unsupported:
      return (
        <div class="block has-text-danger">
          This client doesn&apos;t support solving this type of challenge. Use
          another version or contact the provider.
        </div>
      );
    case ChallengeFeedbackStatus.TruthUnknown:
      return (
        <div class="block has-text-danger">
          Provider doesn&apos;t recognize the challenge of the policy. Contact
          the provider for further information.
        </div>
      );
    default:
      return <div />;
  }
}

export function ChallengeOverviewScreen(): VNode {
  const reducer = useAnastasisContext();

  if (!reducer) {
    return <div>no reducer in context</div>;
  }
  if (reducer.currentReducerState?.reducer_type !== "recovery") {
    return <div>invalid state</div>;
  }

  const policies =
    reducer.currentReducerState.recovery_information?.policies ?? [];
  const knownChallengesArray =
    reducer.currentReducerState.recovery_information?.challenges ?? [];
  const challengeFeedback =
    reducer.currentReducerState?.challenge_feedback ?? {};

  const knownChallengesMap: {
    [uuid: string]: {
      type: string;
      instructions: string;
      feedback: ChallengeFeedback | undefined;
    };
  } = {};
  for (const ch of knownChallengesArray) {
    knownChallengesMap[ch.uuid] = {
      type: ch.type,
      instructions: ch.instructions,
      feedback: challengeFeedback[ch.uuid],
    };
  }
  const policiesWithInfo = policies
    .map((row) => {
      let isPolicySolved = true;
      const challenges = row
        .map(({ uuid }) => {
          const info = knownChallengesMap[uuid];
          const isChallengeSolved = info?.feedback?.state === "solved";
          isPolicySolved = isPolicySolved && isChallengeSolved;
          return { info, uuid, isChallengeSolved };
        })
        .filter((ch) => ch.info !== undefined);

      return {
        isPolicySolved,
        challenges,
        corrupted: row.length > challenges.length,
      };
    })
    .filter((p) => !p.corrupted);

  const atLeastThereIsOnePolicySolved =
    policiesWithInfo.find((p) => p.isPolicySolved) !== undefined;

  const errors = !atLeastThereIsOnePolicySolved
    ? "Solve one policy before proceeding"
    : undefined;
  return (
    <AnastasisClientFrame hideNext={errors} title="Recovery: Solve challenges">
      {!policiesWithInfo.length ? (
        <p class="block">
          No policies found, try with another version of the secret
        </p>
      ) : policiesWithInfo.length === 1 ? (
        <p class="block">
          One policy found for this secret. You need to solve all the challenges
          in order to recover your secret.
        </p>
      ) : (
        <p class="block">
          We have found {policiesWithInfo.length} polices. You need to solve all
          the challenges from one policy in order to recover your secret.
        </p>
      )}
      {policiesWithInfo.map((policy, policy_index) => {
        const tableBody = policy.challenges.map(({ info, uuid }) => {
          const method = authMethods[info.type as KnownAuthMethods];

          if (!method) {
            return (
              <div
                key={uuid}
                class="block"
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span>unknown challenge</span>
                </div>
              </div>
            );
          }

          function ChallengeButton({
            id,
            feedback,
          }: {
            id: string;
            feedback?: ChallengeFeedback;
          }): VNode {
            async function selectChallenge(): Promise<void> {
              if (reducer) {
                return reducer.transition("select_challenge", { uuid: id });
              }
            }
            if (!feedback) {
              return (
                <div>
                  <AsyncButton
                    class="button"
                    disabled={
                      atLeastThereIsOnePolicySolved && !policy.isPolicySolved
                    }
                    onClick={selectChallenge}
                  >
                    Solve
                  </AsyncButton>
                </div>
              );
            }
            switch (feedback.state) {
              case ChallengeFeedbackStatus.ServerFailure:
              case ChallengeFeedbackStatus.Unsupported:
              case ChallengeFeedbackStatus.TruthUnknown:
              case ChallengeFeedbackStatus.RateLimitExceeded:
                return <div />;
              case ChallengeFeedbackStatus.IbanInstructions:
              case ChallengeFeedbackStatus.TalerPayment:
                return (
                  <div>
                    <AsyncButton
                      class="button"
                      disabled={
                        atLeastThereIsOnePolicySolved && !policy.isPolicySolved
                      }
                      onClick={selectChallenge}
                    >
                      Pay
                    </AsyncButton>
                  </div>
                );
              case ChallengeFeedbackStatus.Solved:
                return (
                  <div>
                    <div class="tag is-success is-large">Solved</div>
                  </div>
                );
              default:
                return (
                  <div>
                    <AsyncButton
                      class="button"
                      disabled={
                        atLeastThereIsOnePolicySolved && !policy.isPolicySolved
                      }
                      onClick={selectChallenge}
                    >
                      Solve
                    </AsyncButton>
                  </div>
                );
            }
          }
          return (
            <div
              key={uuid}
              class="block"
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div style={{ display: "flex", alignItems: "center" }}>
                  <span class="icon">{method?.icon}</span>
                  <span>{info.instructions}</span>
                </div>
                <OverviewFeedbackDisplay feedback={info.feedback} />
              </div>

              <ChallengeButton id={uuid} feedback={info.feedback} />
            </div>
          );
        });

        const policyName = policy.challenges
          .map((x) => x.info.type)
          .join(" + ");

        const opa = !atLeastThereIsOnePolicySolved
          ? undefined
          : policy.isPolicySolved
          ? undefined
          : "0.6";

        return (
          <div
            key={policy_index}
            class="box"
            style={{
              opacity: opa,
            }}
          >
            <h3 class="subtitle">
              Policy #{policy_index + 1}: {policyName}
            </h3>
            {policy.challenges.length === 0 && (
              <p>This policy doesn&apos;t have any challenges.</p>
            )}
            {policy.challenges.length === 1 && (
              <p>This policy has one challenge.</p>
            )}
            {policy.challenges.length > 1 && (
              <p>This policy has {policy.challenges.length} challenges.</p>
            )}
            {tableBody}
          </div>
        );
      })}
    </AnastasisClientFrame>
  );
}
