import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { AnastasisClientFrame } from ".";
import {
  ChallengeFeedback,
  ChallengeFeedbackStatus,
  ChallengeInfo,
} from "../../../../anastasis-core/lib";
import { TextInput } from "../../components/fields/TextInput";
import { useAnastasisContext } from "../../context/anastasis";

function SolveOverviewFeedbackDisplay(props: { feedback?: ChallengeFeedback }) {
  const { feedback } = props;
  if (!feedback) {
    return null;
  }
  switch (feedback.state) {
    case ChallengeFeedbackStatus.Message:
      return (
        <div>
          <p>{feedback.message}</p>
        </div>
      );
    case ChallengeFeedbackStatus.Pending:
    case ChallengeFeedbackStatus.AuthIban:
      return null;
    case ChallengeFeedbackStatus.RateLimitExceeded:
      return <div>Rate limit exceeded.</div>;
    case ChallengeFeedbackStatus.Redirect:
      return <div>Redirect (FIXME: not supported)</div>;
    case ChallengeFeedbackStatus.Unsupported:
      return <div>Challenge not supported by client.</div>;
    case ChallengeFeedbackStatus.TruthUnknown:
      return <div>Truth unknown</div>;
    default:
      return (
        <div>
          <pre>{JSON.stringify(feedback)}</pre>
        </div>
      );
  }
}

export function SolveScreen(): VNode {
  const reducer = useAnastasisContext();
  const [answer, setAnswer] = useState("");

  if (!reducer) {
    return (
      <AnastasisClientFrame hideNav title="Recovery problem">
        <div>no reducer in context</div>
      </AnastasisClientFrame>
    );
  }
  if (
    !reducer.currentReducerState ||
    reducer.currentReducerState.recovery_state === undefined
  ) {
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
  const selectedChallenge = challenges[selectedUuid];
  const dialogMap: Record<string, (p: SolveEntryProps) => h.JSX.Element> = {
    question: SolveQuestionEntry,
    sms: SolveSmsEntry,
    email: SolveEmailEntry,
    post: SolvePostEntry,
  };
  const SolveDialog =
    selectedChallenge === undefined
      ? SolveUndefinedEntry
      : dialogMap[selectedChallenge.type] ?? SolveUnsupportedEntry;

  function onNext(): void {
    reducer?.transition("solve_challenge", { answer });
  }
  function onCancel(): void {
    reducer?.back();
  }

  return (
    <AnastasisClientFrame hideNav title="Recovery: Solve challenge">
      <SolveOverviewFeedbackDisplay
        feedback={challengeFeedback[selectedUuid]}
      />
      <SolveDialog
        id={selectedUuid}
        answer={answer}
        setAnswer={setAnswer}
        challenge={selectedChallenge}
        feedback={challengeFeedback[selectedUuid]}
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
        <button class="button is-info" onClick={onNext}>
          Confirm
        </button>
      </div>
    </AnastasisClientFrame>
  );
}

export interface SolveEntryProps {
  id: string;
  challenge: ChallengeInfo;
  feedback?: ChallengeFeedback;
  answer: string;
  setAnswer: (s: string) => void;
}

function SolveSmsEntry({
  challenge,
  answer,
  setAnswer,
}: SolveEntryProps): VNode {
  return (
    <Fragment>
      <p>
        An sms has been sent to "<b>{challenge.instructions}</b>". Type the code
        below
      </p>
      <TextInput label="Answer" grabFocus bind={[answer, setAnswer]} />
    </Fragment>
  );
}
function SolveQuestionEntry({
  challenge,
  answer,
  setAnswer,
}: SolveEntryProps): VNode {
  return (
    <Fragment>
      <p>Type the answer to the following question:</p>
      <pre>{challenge.instructions}</pre>
      <TextInput label="Answer" grabFocus bind={[answer, setAnswer]} />
    </Fragment>
  );
}

function SolvePostEntry({
  challenge,
  answer,
  setAnswer,
}: SolveEntryProps): VNode {
  return (
    <Fragment>
      <p>
        instruction for post type challenge "<b>{challenge.instructions}</b>"
      </p>
      <TextInput label="Answer" grabFocus bind={[answer, setAnswer]} />
    </Fragment>
  );
}

function SolveEmailEntry({
  challenge,
  answer,
  setAnswer,
}: SolveEntryProps): VNode {
  return (
    <Fragment>
      <p>
        An email has been sent to "<b>{challenge.instructions}</b>". Type the
        code below
      </p>
      <TextInput label="Answer" grabFocus bind={[answer, setAnswer]} />
    </Fragment>
  );
}

function SolveUnsupportedEntry(props: SolveEntryProps): VNode {
  return (
    <Fragment>
      <p>
        The challenge selected is not supported for this UI. Please update this
        version or try using another policy.
      </p>
      <p>
        <b>Challenge type:</b> {props.challenge.type}
      </p>
    </Fragment>
  );
}
function SolveUndefinedEntry(props: SolveEntryProps): VNode {
  return (
    <Fragment>
      <p>
        There is no challenge information for id <b>"{props.id}"</b>. Try
        resetting the recovery session.
      </p>
    </Fragment>
  );
}
