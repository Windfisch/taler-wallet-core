import { h, VNode } from "preact";
import { ChallengeFeedback, ChallengeInfo } from "../../../../anastasis-core/lib";
import { useAnastasisContext } from "../../context/anastasis";
import { SolveEmailEntry } from "./SolveEmailEntry";
import { SolvePostEntry } from "./SolvePostEntry";
import { SolveQuestionEntry } from "./SolveQuestionEntry";
import { SolveSmsEntry } from "./SolveSmsEntry";
import { SolveUnsupportedEntry } from "./SolveUnsupportedEntry";

export function SolveScreen(): VNode {
  const reducer = useAnastasisContext()

  if (!reducer) {
    return <div>no reducer in context</div>
  }
  if (!reducer.currentReducerState || reducer.currentReducerState.recovery_state === undefined) {
    return <div>invalid state</div>
  }

  if (!reducer.currentReducerState.recovery_information) {
    return <div>no recovery information found</div>
  }
  if (!reducer.currentReducerState.selected_challenge_uuid) {
    return <div>no selected uuid</div>
  }
  const chArr = reducer.currentReducerState.recovery_information.challenges;
  const challengeFeedback = reducer.currentReducerState.challenge_feedback ?? {};
  const selectedUuid = reducer.currentReducerState.selected_challenge_uuid;
  const challenges: {
    [uuid: string]: ChallengeInfo;
  } = {};
  for (const ch of chArr) {
    challenges[ch.uuid] = ch;
  }
  const selectedChallenge = challenges[selectedUuid];
  const dialogMap: Record<string, (p: SolveEntryProps) => h.JSX.Element> = {
    question: SolveQuestionEntry,
    sms: SolveSmsEntry,
    email: SolveEmailEntry,
    post: SolvePostEntry,
  };
  const SolveDialog = dialogMap[selectedChallenge?.type] ?? SolveUnsupportedEntry;
  return (
    <SolveDialog
      challenge={selectedChallenge}
      feedback={challengeFeedback[selectedUuid]} />
  );
}

export interface SolveEntryProps {
  challenge: ChallengeInfo;
  feedback?: ChallengeFeedback;
}

