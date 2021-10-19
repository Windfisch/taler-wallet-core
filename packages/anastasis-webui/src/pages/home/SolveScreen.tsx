import { h, VNode } from "preact";
import { AnastasisReducerApi } from "../../hooks/use-anastasis-reducer";
import { SolveEmailEntry } from "./SolveEmailEntry";
import { SolvePostEntry } from "./SolvePostEntry";
import { SolveQuestionEntry } from "./SolveQuestionEntry";
import { SolveSmsEntry } from "./SolveSmsEntry";
import { SolveUnsupportedEntry } from "./SolveUnsupportedEntry";
import { RecoveryReducerProps } from "./index";
import { ChallengeInfo, ChallengeFeedback } from "../../../../anastasis-core/lib";

export function SolveScreen(props: RecoveryReducerProps): VNode {
  const chArr = props.recoveryState.recovery_information!.challenges;
  const challengeFeedback = props.recoveryState.challenge_feedback ?? {};
  const selectedUuid = props.recoveryState.selected_challenge_uuid!;
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
  const SolveDialog = dialogMap[selectedChallenge.type] ?? SolveUnsupportedEntry;
  return (
    <SolveDialog
      challenge={selectedChallenge}
      reducer={props.reducer}
      feedback={challengeFeedback[selectedUuid]} />
  );
}

export interface SolveEntryProps {
  reducer: AnastasisReducerApi;
  challenge: ChallengeInfo;
  feedback?: ChallengeFeedback;
}

