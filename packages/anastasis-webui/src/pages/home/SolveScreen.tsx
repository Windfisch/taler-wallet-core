import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { AnastasisClientFrame } from ".";
import {
  ChallengeFeedback,
  ChallengeFeedbackStatus,
  ChallengeInfo,
} from "../../../../anastasis-core/lib";
import { AsyncButton } from "../../components/AsyncButton";
import { TextInput } from "../../components/fields/TextInput";
import { Notifications } from "../../components/Notifications";
import { useAnastasisContext } from "../../context/anastasis";

function SolveOverviewFeedbackDisplay(props: { feedback?: ChallengeFeedback }): VNode {
  const { feedback } = props;
  if (!feedback) {
    return <div />;
  }
  switch (feedback.state) {
    case ChallengeFeedbackStatus.Message:
      return (<Notifications notifications={[{
        type: "INFO",
        message: `Message from provider`,
        description: feedback.message
      }]} />);
    case ChallengeFeedbackStatus.Payment:
      return <Notifications notifications={[{
        type: "INFO",
        message: `Message from provider`,
        description: <span>
          To pay you can <a href={feedback.taler_pay_uri}>click here</a>
        </span>
      }]} />
    case ChallengeFeedbackStatus.AuthIban:
      return <Notifications notifications={[{
        type: "INFO",
        message: `Message from provider`,
        description: `Need to send a wire transfer to "${feedback.business_name}"`
      }]} />;
    case ChallengeFeedbackStatus.ServerFailure:
      return (<Notifications notifications={[{
        type: "ERROR",
        message: `Server error: Code ${feedback.http_status}`,
        description: feedback.error_response
      }]} />);
    case ChallengeFeedbackStatus.RateLimitExceeded:
      return (<Notifications notifications={[{
        type: "ERROR",
        message: `Message from provider`,
        description: "There were to many failed attempts."
      }]} />);
    case ChallengeFeedbackStatus.Redirect:
      return (<Notifications notifications={[{
        type: "INFO",
        message: `Message from provider`,
        description: <span>
          Please visit this link: <a>{feedback.redirect_url}</a>
        </span>
      }]} />);
    case ChallengeFeedbackStatus.Unsupported:
      return (<Notifications notifications={[{
        type: "ERROR",
        message: `This client doesn't support solving this type of challenge`,
        description: `Use another version or contact the provider. Type of challenge "${feedback.unsupported_method}"`
      }]} />);
    case ChallengeFeedbackStatus.TruthUnknown:
      return (<Notifications notifications={[{
        type: "ERROR",
        message: `Provider doesn't recognize the type of challenge`,
        description: "Contact the provider for further information"
      }]} />);
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
        <div style={{ marginTop: '2em', display: 'flex', justifyContent: 'space-between' }}>
          <button class="button" onClick={() => reducer.back()}>Back</button>
        </div>
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

  async function onNext(): Promise<void> {
    return reducer?.transition("solve_challenge", { answer });
  }
  function onCancel(): void {
    reducer?.back();
  }

  const feedback = challengeFeedback[selectedUuid]
  const shouldHideConfirm = feedback?.state === ChallengeFeedbackStatus.RateLimitExceeded
    || feedback?.state === ChallengeFeedbackStatus.Redirect
    || feedback?.state === ChallengeFeedbackStatus.Unsupported
    || feedback?.state === ChallengeFeedbackStatus.TruthUnknown

  return (
    <AnastasisClientFrame hideNav title="Recovery: Solve challenge">
      <SolveOverviewFeedbackDisplay
        feedback={feedback}
      />
      <SolveDialog
        id={selectedUuid}
        answer={answer}
        setAnswer={setAnswer}
        challenge={selectedChallenge}
        feedback={feedback}
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
        {!shouldHideConfirm && <AsyncButton class="button is-info" onClick={onNext}>
          Confirm
        </AsyncButton>}
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
