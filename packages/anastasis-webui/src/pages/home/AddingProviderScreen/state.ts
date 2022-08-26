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
import { useEffect, useRef, useState } from "preact/hooks";
import { Notification } from "../../../components/Notifications.js";
import { useAnastasisContext } from "../../../context/anastasis.js";
import { authMethods, KnownAuthMethods } from "../authMethod/index.jsx";
import { AuthProvByStatusMap, State, testProvider } from "./index.js";

interface Props {
  providerType?: KnownAuthMethods;
  onCancel: () => Promise<void>;
  notifications?: Notification[];
}

export default function useComponentState({ providerType, onCancel, notifications = [] }: Props): State {
  const reducer = useAnastasisContext();

  const [providerURL, setProviderURL] = useState("");

  const [error, setError] = useState<string | undefined>();
  const [testing, setTesting] = useState(false);

  const providerLabel = providerType
    ? authMethods[providerType].label
    : undefined;

  const allAuthProviders =
    !reducer ||
      !reducer.currentReducerState ||
      reducer.currentReducerState.reducer_type === "error" ||
      !reducer.currentReducerState.authentication_providers
      ? {}
      : reducer.currentReducerState.authentication_providers;

  const authProvidersByStatus = Object.keys(allAuthProviders).reduce(
    (prev, url) => {
      const p = allAuthProviders[url];
      if (
        providerLabel &&
        p.status === "ok" &&
        p.methods.findIndex((m) => m.type === providerType) !== -1
      ) {
        return prev;
      }
      prev[p.status].push({ ...p, url });
      return prev;
    },
    { "not-contacted": [], disabled: [], error: [], ok: [] } as AuthProvByStatusMap,
  );
  const authProviders = authProvidersByStatus["ok"].map((p) => p.url);

  //FIXME: move this timeout logic into a hook
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(async () => {
      const url = providerURL.endsWith("/") ? providerURL : providerURL + "/";
      if (!providerURL || authProviders.includes(url)) return;
      try {
        setTesting(true);
        await testProvider(url, providerType);
        setError("");
      } catch (e) {
        if (e instanceof Error) setError(e.message);
      }
      setTesting(false);
    }, 200);
  }, [providerURL, reducer]);

  if (!reducer) {
    return {
      status: "no-reducer",
    };
  }

  if (
    !reducer.currentReducerState ||
    !("authentication_providers" in reducer.currentReducerState)
  ) {
    return {
      status: "invalid-state",
    };
  }

  const addProvider = async (provider_url: string): Promise<void> => {
    await reducer.transition("add_provider", { provider_url });
    onCancel();
  }
  const deleteProvider = async (provider_url: string): Promise<void> => {
    reducer.transition("delete_provider", { provider_url });
  }

  let errors = !providerURL ? "Add provider URL" : undefined;
  let url: string | undefined;
  try {
    url = new URL("", providerURL).href;
  } catch {
    errors = "Check the URL";
  }
  const _url = url

  if (!!error && !errors) {
    errors = error;
  }
  if (!errors && authProviders.includes(url!)) {
    errors = "That provider is already known";
  }

  const commonState = {
    addProvider: !_url ? undefined : async () => addProvider(_url),
    deleteProvider: async (url: string) => deleteProvider(url),
    allAuthProviders,
    authProvidersByStatus,
    onCancel,
    providerURL,
    testing,
    setProviderURL: async (s: string) => setProviderURL(s),
    errors,
    error,
    notifications
  }

  if (!providerLabel) {
    return {
      status: "without-type",
      ...commonState
    }
  } else {
    return {
      status: "with-type",
      providerLabel,
      ...commonState
    }
  }

}

