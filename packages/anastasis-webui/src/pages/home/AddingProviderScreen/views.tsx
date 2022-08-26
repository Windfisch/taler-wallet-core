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
  AuthenticationProviderStatusError,
  AuthenticationProviderStatusOk,
} from "@gnu-taler/anastasis-core";
import { h, VNode } from "preact";
import { useEffect, useState } from "preact/hooks";
import { TextInput } from "../../../components/fields/TextInput.js";
import { Notifications } from "../../../components/Notifications.js";
import { AnastasisClientFrame } from "../index.js";
import { testProvider, WithoutType, WithType } from "./index.js";

export function WithProviderType(props: WithType): VNode {
  return (
    <AnastasisClientFrame
      hideNav
      title="Backup: Manage providers1"
      hideNext={props.errors}
    >
      <div>
        <Notifications notifications={props.notifications} />
        <p>Add a provider url for a {props.providerLabel} service</p>
        <div class="container">
          <TextInput
            label="Provider URL"
            placeholder="https://provider.com"
            grabFocus
            error={props.errors}
            bind={[props.providerURL, props.setProviderURL]}
          />
        </div>
        <p class="block">Example: https://kudos.demo.anastasis.lu</p>
        {props.testing && <p class="has-text-info">Testing</p>}

        <div
          class="block"
          style={{
            marginTop: "2em",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <button class="button" onClick={props.onCancel}>
            Cancel
          </button>
          <span data-tooltip={props.errors}>
            <button
              class="button is-info"
              disabled={props.error !== "" || props.testing}
              onClick={props.addProvider}
            >
              Add
            </button>
          </span>
        </div>

        {props.authProvidersByStatus["ok"].length > 0 ? (
          <p class="subtitle">
            Current providers for {props.providerLabel} service
          </p>
        ) : (
          <p class="subtitle">
            No known providers for {props.providerLabel} service
          </p>
        )}

        {props.authProvidersByStatus["ok"].map((k, i) => {
          const p = k as AuthenticationProviderStatusOk;
          return (
            <TableRow
              key={i}
              url={k.url}
              info={p}
              onDelete={props.deleteProvider}
            />
          );
        })}
        <p class="subtitle">Providers with errors</p>
        {props.authProvidersByStatus["error"].map((k, i) => {
          const p = k as AuthenticationProviderStatusError;
          return (
            <TableRowError
              key={i}
              url={k.url}
              info={p}
              onDelete={props.deleteProvider}
            />
          );
        })}
      </div>
    </AnastasisClientFrame>
  );
}

export function WithoutProviderType(props: WithoutType): VNode {
  return (
    <AnastasisClientFrame
      hideNav
      title="Backup: Manage providers"
      hideNext={props.errors}
    >
      <div>
        <Notifications notifications={props.notifications} />
        <p>Add a provider url</p>
        <div class="container">
          <TextInput
            label="Provider URL"
            placeholder="https://provider.com"
            grabFocus
            error={props.errors}
            bind={[props.providerURL, props.setProviderURL]}
          />
        </div>
        <p class="block">Example: https://kudos.demo.anastasis.lu</p>
        {props.testing && <p class="has-text-info">Testing</p>}

        <div
          class="block"
          style={{
            marginTop: "2em",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <button class="button" onClick={props.onCancel}>
            Cancel
          </button>
          <span data-tooltip={props.errors}>
            <button
              class="button is-info"
              disabled={props.error !== "" || props.testing}
              onClick={props.addProvider}
            >
              Add
            </button>
          </span>
        </div>

        {props.authProvidersByStatus["ok"].length > 0 ? (
          <p class="subtitle">Current providers</p>
        ) : (
          <p class="subtitle">No known providers, add one.</p>
        )}

        {props.authProvidersByStatus["ok"].map((k, i) => {
          const p = k as AuthenticationProviderStatusOk;
          return (
            <TableRow
              key={i}
              url={k.url}
              info={p}
              onDelete={props.deleteProvider}
            />
          );
        })}
        <p class="subtitle">Providers with errors</p>
        {props.authProvidersByStatus["error"].map((k, i) => {
          const p = k as AuthenticationProviderStatusError;
          return (
            <TableRowError
              key={i}
              url={k.url}
              info={p}
              onDelete={props.deleteProvider}
            />
          );
        })}
      </div>
    </AnastasisClientFrame>
  );
}

function TableRow({
  url,
  info,
  onDelete,
}: {
  onDelete: (s: string) => Promise<void>;
  url: string;
  info: AuthenticationProviderStatusOk;
}): VNode {
  const [status, setStatus] = useState("checking");
  useEffect(function () {
    testProvider(url.endsWith("/") ? url.substring(0, url.length - 1) : url)
      .then(function () {
        setStatus("responding");
      })
      .catch(function () {
        setStatus("failed to contact");
      });
  });
  return (
    <div
      class="box"
      style={{ display: "flex", justifyContent: "space-between" }}
    >
      <div>
        <div class="subtitle">{url}</div>
        <dl>
          <dt>
            <b>Business Name</b>
          </dt>
          <dd>{info.business_name}</dd>
          <dt>
            <b>Supported methods</b>
          </dt>
          <dd>{info.methods.map((m) => m.type).join(",")}</dd>
          <dt>
            <b>Maximum storage</b>
          </dt>
          <dd>{info.storage_limit_in_megabytes} Mb</dd>
          <dt>
            <b>Status</b>
          </dt>
          <dd>{status}</dd>
        </dl>
      </div>
      <div
        class="block"
        style={{
          marginTop: "auto",
          marginBottom: "auto",
          display: "flex",
          justifyContent: "space-between",
          flexDirection: "column",
        }}
      >
        <button class="button is-danger" onClick={() => onDelete(url)}>
          Remove
        </button>
      </div>
    </div>
  );
}

function TableRowError({
  url,
  info,
  onDelete,
}: {
  onDelete: (s: string) => void;
  url: string;
  info: AuthenticationProviderStatusError;
}): VNode {
  const [status, setStatus] = useState("checking");
  useEffect(function () {
    testProvider(url.endsWith("/") ? url.substring(0, url.length - 1) : url)
      .then(function () {
        setStatus("responding");
      })
      .catch(function () {
        setStatus("failed to contact");
      });
  });
  return (
    <div
      class="box"
      style={{ display: "flex", justifyContent: "space-between" }}
    >
      <div>
        <div class="subtitle">{url}</div>
        <dl>
          <dt>
            <b>Error</b>
          </dt>
          <dd>{info.hint}</dd>
          <dt>
            <b>Code</b>
          </dt>
          <dd>{info.code}</dd>
          <dt>
            <b>Status</b>
          </dt>
          <dd>{status}</dd>
        </dl>
      </div>
      <div
        class="block"
        style={{
          marginTop: "auto",
          marginBottom: "auto",
          display: "flex",
          justifyContent: "space-between",
          flexDirection: "column",
        }}
      >
        <button class="button is-danger" onClick={() => onDelete(url)}>
          Remove
        </button>
      </div>
    </div>
  );
}
