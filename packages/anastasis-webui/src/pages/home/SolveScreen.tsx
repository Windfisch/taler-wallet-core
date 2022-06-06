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
import { Notifications } from "../../components/Notifications.js";
import { useAnastasisContext } from "../../context/anastasis.js";
import { authMethods, KnownAuthMethods } from "./authMethod/index.js";
import { AnastasisClientFrame } from "./index.js";

export function SolveOverviewFeedbackDisplay(props: {
  feedback?: ChallengeFeedback;
}): VNode {
  const { feedback } = props;
  if (!feedback) {
    return <div />;
  }
  switch (feedback.state) {
    case ChallengeFeedbackStatus.TalerPayment:
      return (
        <Notifications
          notifications={[
            {
              type: "INFO",
              message: `Message from provider`,
              description: (
                <span>
                  To pay you can <a href={feedback.taler_pay_uri}>click here</a>
                </span>
              ),
            },
          ]}
        />
      );
    case ChallengeFeedbackStatus.IbanInstructions:
      return (
        <Notifications
          notifications={[
            {
              type: "INFO",
              message: `Message from provider`,
              description: `Need to send a wire transfer to "${feedback.target_business_name}"`,
            },
          ]}
        />
      );
    case ChallengeFeedbackStatus.ServerFailure:
      return (
        <Notifications
          notifications={[
            {
              type: "ERROR",
              message: `Server error: Code ${feedback.http_status}`,
              description: feedback.error_response,
            },
          ]}
        />
      );
    case ChallengeFeedbackStatus.RateLimitExceeded:
      return (
        <Notifications
          notifications={[
            {
              type: "ERROR",
              message: `Message from provider`,
              description: "There were to many failed attempts.",
            },
          ]}
        />
      );
    case ChallengeFeedbackStatus.Unsupported:
      return (
        <Notifications
          notifications={[
            {
              type: "ERROR",
              message: `This client doesn't support solving this type of challenge`,
              description: `Use another version or contact the provider. Type of challenge "${feedback.unsupported_method}"`,
            },
          ]}
        />
      );
    case ChallengeFeedbackStatus.TruthUnknown:
      return (
        <Notifications
          notifications={[
            {
              type: "ERROR",
              message: `Provider doesn't recognize the type of challenge`,
              description: "Contact the provider for further information",
            },
          ]}
        />
      );
    default:
      console.warn(
        `unknown challenge feedback status ${JSON.stringify(feedback)}`,
      );
      return <div />;
  }
}

export function SolveScreen(): VNode {
  const reducer = useAnastasisContext();

  if (!reducer) {
    return (
      <AnastasisClientFrame hideNav title="Recovery problem">
        <div>no reducer in context</div>
      </AnastasisClientFrame>
    );
  }
  if (reducer.currentReducerState?.reducer_type !== "recovery") {
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
        <div
          style={{
            marginTop: "2em",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <button class="button" onClick={() => reducer.back()}>
            Back
          </button>
        </div>
      </AnastasisClientFrame>
    );
  }
  function SolveNotImplemented(): VNode {
    return (
      <AnastasisClientFrame hideNav title="Not implemented">
        <p>
          The challenge selected is not supported for this UI. Please update
          this version or try using another policy.
        </p>
        {reducer && (
          <div
            style={{
              marginTop: "2em",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <button class="button" onClick={() => reducer.back()}>
              Back
            </button>
          </div>
        )}
      </AnastasisClientFrame>
    );
  }

  const chArr = reducer.currentReducerState.recovery_information.challenges;
  const selectedUuid = reducer.currentReducerState.selected_challenge_uuid;
  const selectedChallenge = chArr.find((ch) => ch.uuid === selectedUuid);

  const SolveDialog =
    !selectedChallenge ||
    !authMethods[selectedChallenge.type as KnownAuthMethods]
      ? SolveNotImplemented
      : authMethods[selectedChallenge.type as KnownAuthMethods].solve ??
        SolveNotImplemented;

  return <SolveDialog id={selectedUuid} />;
}
