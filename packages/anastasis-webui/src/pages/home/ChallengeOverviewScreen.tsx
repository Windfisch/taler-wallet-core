/* eslint-disable @typescript-eslint/camelcase */
import { ChallengeFeedback } from "anastasis-core";
import { h, VNode } from "preact";
import { useAnastasisContext } from "../../context/anastasis";
import { AnastasisClientFrame } from "./index";
import { authMethods, KnownAuthMethods } from "./authMethod";

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

  const errors = !atLeastThereIsOnePolicySolved ? "Solve one policy before proceeding" : undefined;
  return (
    <AnastasisClientFrame hideNext={errors} title="Recovery: Solve challenges">
      {!policies.length ? <p class="block">
        No policies found, try with another version of the secret
      </p> : (policies.length === 1 ? <p class="block">
        One policy found for this secret. You need to solve all the challenges in order to recover your secret.
      </p> : <p class="block">
        We have found {policies.length} polices. You need to solve all the challenges from one policy in order
        to recover your secret.
      </p>)}
      {policiesWithInfo.map((policy, policy_index) => {
        const tableBody = policy.challenges.map(({ info, uuid }) => {
          const isFree = !info.cost || info.cost.endsWith(':0')
          const method = authMethods[info.type as KnownAuthMethods]
          return (
            <div key={uuid} class="block" style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div style={{display:'flex', alignItems:'center'}}>
                <span class="icon">
                  {method?.icon}
                </span>
                <span>
                  {info.instructions}
                </span>
              </div>
              <div>
                {method && info.feedback?.state !== "solved" ? (
                  <a class="button" onClick={() => reducer.transition("select_challenge", { uuid })}>
                    {isFree ? "Solve" : `Pay and Solve`}
                  </a>
                ) : null}
                {info.feedback?.state === "solved" ? (
                  <a class="button is-success"> Solved </a>
                ) : null}
              </div>
            </div>
          );
        })
        
        const policyName = policy.challenges.map(x => x.info.type).join(" + ");
        const opa = !atLeastThereIsOnePolicySolved ? undefined : ( policy.isPolicySolved ? undefined : '0.6')
        return (
          <div key={policy_index} class="box" style={{
            opacity: opa
          }}>
            <h3 class="subtitle">
              Policy #{policy_index + 1}: {policyName}
            </h3>
            {policy.challenges.length === 0 && <p>
              This policy doesn't have challenges.
            </p>}
            {policy.challenges.length === 1 && <p>
              This policy just have one challenge.
            </p>}
            {policy.challenges.length > 1 && <p>
              This policy have {policy.challenges.length} challenges.
            </p>}
            {tableBody}
          </div>
        );
      })}
    </AnastasisClientFrame>
  );
}
