/*
 This file is part of GNU Taler
 (C) 2022 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

import { WalletApiOperation } from "@gnu-taler/taler-wallet-core";
import { useState } from "preact/hooks";
import { useBackendContext } from "../../context/backend.js";
import { useAsyncAsHook } from "../../hooks/useAsyncAsHook.js";
import { Props, State } from "./index.js";
import { buildTermsOfServiceState } from "./utils.js";

export function useComponentState({ exchangeUrl, onChange }: Props): State {
  const api = useBackendContext();
  const readOnly = !onChange;
  const [showContent, setShowContent] = useState<boolean>(readOnly);
  const [errorAccepting, setErrorAccepting] = useState<Error | undefined>(
    undefined,
  );

  /**
   * For the exchange selected, bring the status of the terms of service
   */
  const terms = useAsyncAsHook(async () => {
    const exchangeTos = await api.wallet.call(
      WalletApiOperation.GetExchangeTos,
      {
        exchangeBaseUrl: exchangeUrl,
        acceptedFormat: ["text/xml"],
      },
    );

    const state = buildTermsOfServiceState(exchangeTos);

    return { state };
  }, []);

  if (!terms) {
    return {
      status: "loading",
      error: undefined,
    };
  }
  if (terms.hasError) {
    return {
      status: "loading-error",
      error: terms,
    };
  }

  if (errorAccepting) {
    return {
      status: "error-accepting",
      error: {
        hasError: true,
        operational: false,
        message: errorAccepting.message,
      },
    };
  }

  const { state } = terms.response;

  async function onUpdate(accepted: boolean): Promise<void> {
    if (!state) return;

    try {
      if (accepted) {
        api.wallet.call(WalletApiOperation.SetExchangeTosAccepted, {
          exchangeBaseUrl: exchangeUrl,
          etag: state.version,
        });
      } else {
        // mark as not accepted
        api.wallet.call(WalletApiOperation.SetExchangeTosAccepted, {
          exchangeBaseUrl: exchangeUrl,
          etag: undefined,
        });
      }
      // setAccepted(accepted);
      if (!readOnly) onChange(accepted); //external update
    } catch (e) {
      if (e instanceof Error) {
        //FIXME: uncomment this and display error
        // setErrorAccepting(e.message);
        setErrorAccepting(e);
      }
    }
  }

  const accepted = state.status === "accepted";

  const base = {
    error: undefined,
    showingTermsOfService: {
      value: showContent,
      button: {
        onClick: async () => {
          setShowContent(!showContent);
        },
      },
    },
    terms: state,
    termsAccepted: {
      value: accepted,
      button: {
        onClick: async () => {
          const newValue = !accepted; //toggle
          onUpdate(newValue);
          setShowContent(false);
        },
      },
    },
  };

  if (showContent) {
    return {
      status: "show-content",
      error: undefined,
      terms: state,
      showingTermsOfService: readOnly ? undefined : base.showingTermsOfService,
      termsAccepted: readOnly ? undefined : base.termsAccepted,
    };
  }
  //showing buttons
  if (accepted) {
    return {
      status: "show-buttons-accepted",
      ...base,
    };
  } else {
    return {
      status: "show-buttons-not-accepted",
      ...base,
    };
  }
}
