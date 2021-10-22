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
  const chArr = reducer.currentReducerState.recovery_information?.challenges ?? [];
  const challengeFeedback = reducer.currentReducerState?.challenge_feedback;

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
      {!policies.length && <p>
        No policies found
      </p>}
      {policies.map((row, i) => {
        return (
          <div key={i}>
            <h3>Policy #{i + 1}</h3>
            {row.map(column => {
              const ch = challenges[column.uuid];
              if (!ch) return <div>
                There is no challenge for this policy
              </div>
              const feedback = challengeFeedback?.[column.uuid];
              return (
                <div key={column.uuid}
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
                        uuid: column.uuid,
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
