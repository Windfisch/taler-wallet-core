import { ChallengeFeedback } from "anastasis-core";
import { h, VNode } from "preact";
import { useAnastasisContext } from "../../context/anastasis";
import { AnastasisClientFrame } from "./index";

export function ChallengeOverviewScreen(): VNode {
  const reducer = useAnastasisContext()

  if (!reducer) {
    return <div>no reducer in context</div>
  }
  if (!reducer.currentReducerState || reducer.currentReducerState.recovery_state === undefined) {
    return <div>invalid state</div>
  }

  const policies = reducer.currentReducerState.recovery_information?.policies ?? [];
  const knownChallengesArray = reducer.currentReducerState.recovery_information?.challenges ?? [];
  const challengeFeedback = reducer.currentReducerState?.challenge_feedback ?? {};

  const knownChallengesMap: {
    [uuid: string]: {
      type: string;
      instructions: string;
      cost: string;
      feedback: ChallengeFeedback | undefined;
    };
  } = {};
  for (const ch of knownChallengesArray) {
    knownChallengesMap[ch.uuid] = {
      type: ch.type,
      cost: ch.cost,
      instructions: ch.instructions,
      feedback: challengeFeedback[ch.uuid]
    };
  }
  const policiesWithInfo = policies.map(row => {
    let isPolicySolved = true
    const challenges = row.map(({ uuid }) => {
      const info = knownChallengesMap[uuid];
      const isChallengeSolved = info?.feedback?.state === 'solved'
      isPolicySolved = isPolicySolved && isChallengeSolved
      return { info, uuid, isChallengeSolved }
    }).filter(ch => ch.info !== undefined)

    return { isPolicySolved, challenges }
  })

  const atLeastThereIsOnePolicySolved = policiesWithInfo.find(p => p.isPolicySolved) !== undefined

  return (
    <AnastasisClientFrame hideNext={!atLeastThereIsOnePolicySolved} title="Recovery: Solve challenges">
      {!policies.length ? <p>
        No policies found, try with another version of the secret
      </p> : (policies.length === 1 ? <p>
        One policy found for this secret. You need to solve all the challenges in order to recover your secret.
      </p> : <p>
        We have found {policies.length} polices. You need to solve all the challenges from one policy in order
        to recover your secret.
      </p>)}
      {policiesWithInfo.map((row, i) => {
        const tableBody = row.challenges.map(({ info, uuid }) => {
          return (
            <tr key={uuid}>
              <td>{info.type}</td>
              <td>
                {info.instructions}
              </td>
              <td>{info.feedback?.state ?? "unknown"}</td>
              <td>{info.cost}</td>
              <td>
                {info.feedback?.state !== "solved" ? (
                  <a onClick={() => reducer.transition("select_challenge", { uuid })}>
                    Solve
                  </a>
                ) : null}
              </td>
            </tr>
          );
        })
        return (
          <div key={i}>
            <b>Policy #{i + 1}</b>
            {row.challenges.length === 0 && <p>
              This policy doesn't have challenges
            </p>}
            {row.challenges.length === 1 && <p>
              This policy just have one challenge to be solved
            </p>}
            {row.challenges.length > 1 && <p>
              This policy have {row.challenges.length} challenges
            </p>}
            <table class="table">
              <thead>
                <tr>
                  <td>Challenge type</td>
                  <td>Description</td>
                  <td>Status</td>
                  <td>Cost</td>
                </tr>
              </thead>
              <tbody>
                {tableBody}
              </tbody>
            </table>
          </div>
        );
      })}
    </AnastasisClientFrame>
  );
}
