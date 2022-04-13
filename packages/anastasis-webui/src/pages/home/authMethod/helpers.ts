import {
  ChallengeFeedback,
  ChallengeFeedbackStatus,
} from "@gnu-taler/anastasis-core";

export function shouldHideConfirm(feedback: ChallengeFeedback): boolean {
  return (
    feedback?.state === ChallengeFeedbackStatus.RateLimitExceeded ||
    feedback?.state === ChallengeFeedbackStatus.Unsupported ||
    feedback?.state === ChallengeFeedbackStatus.TruthUnknown
  );
}
