import { h, VNode } from "preact";
import { RecoveryReducerProps, AnastasisClientFrame } from "./index";

export function ChallengeOverviewScreen(props: RecoveryReducerProps): VNode {
  const { recoveryState, reducer } = props;
  const policies = recoveryState.recovery_information!.policies;
  const chArr = recoveryState.recovery_information!.challenges;
  const challenges: {
    [uuid: string]: {
      type: string;
      instructions: string;
      cost: string;
    };
  } = {};
  for (const ch of chArr) {
    challenges[ch.uuid] = {
      type: ch.type,
      cost: ch.cost,
      instructions: ch.instructions,
    };
  }
  return (
    <AnastasisClientFrame title="Recovery: Solve challenges">
      <h2>Policies</h2>
      {policies.map((x, i) => {
        return (
          <div key={i}>
            <h3>Policy #{i + 1}</h3>
            {x.map((x, j) => {
              const ch = challenges[x.uuid];
              const feedback = recoveryState.challenge_feedback?.[x.uuid];
              return (
                <div key={j}
                  style={{
                    borderLeft: "2px solid gray",
                    paddingLeft: "0.5em",
                    borderRadius: "0.5em",
                    marginTop: "0.5em",
                    marginBottom: "0.5em",
                  }}
                >
                  <h4>
                    {ch.type} ({ch.instructions})
                  </h4>
                  <p>Status: {feedback?.state ?? "unknown"}</p>
                  {feedback?.state !== "solved" ? (
                    <button
                      onClick={() => reducer.transition("select_challenge", {
                        uuid: x.uuid,
                      })}
                    >
                      Solve
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })}
    </AnastasisClientFrame>
  );
}
