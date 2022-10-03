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

/**
 *
 * @author Sebastian Javier Marchano (sebasjm)
 */

import { BackupStates, RecoveryStates } from "@gnu-taler/anastasis-core";
import { Fragment, h, VNode } from "preact";
import { useAnastasisContext } from "../../context/anastasis.js";
import { Translate } from "../../i18n/index.js";

interface Props {
  mobile?: boolean;
}

const VERSION = typeof __VERSION__ !== "undefined" ? __VERSION__ : "dev";
const GIT_HASH = typeof __GIT_HASH__ !== "undefined" ? __GIT_HASH__ : undefined;
const VERSION_WITH_HASH = GIT_HASH ? `${VERSION}-${GIT_HASH}` : VERSION;

export function Sidebar({ mobile }: Props): VNode {
  const reducer = useAnastasisContext()!;

  function saveSession(): void {
    const state = reducer.exportState();
    const link = document.createElement("a");
    link.download = "anastasis.json";
    link.href = `data:text/plain,${state}`;
    link.click();
  }

  return (
    <aside class="aside is-placed-left is-expanded">
      {/* {mobile && <div class="footer" onClick={(e) => { return e.stopImmediatePropagation() }}>
        <LangSelector />
      </div>} */}
      <div class="aside-tools">
        <div class="aside-tools-label">
          <div>
            <b>Anastasis</b>
          </div>
          <div
            class="is-size-7 has-text-right"
            style={{ lineHeight: 0, marginTop: -10 }}
          >
            Version {VERSION_WITH_HASH}
          </div>
        </div>
      </div>
      <div class="menu is-menu-main">
        {!reducer.currentReducerState && (
          <p class="menu-label">
            <Translate>Backup or Recorver</Translate>
          </p>
        )}
        <ul class="menu-list">
          {!reducer.currentReducerState && (
            <li>
              <div class="ml-4">
                <span class="menu-item-label">
                  <Translate>Select one option</Translate>
                </span>
              </div>
            </li>
          )}
          {reducer.currentReducerState?.reducer_type === "backup" ? (
            <Fragment>
              <li
                class={
                  reducer.currentReducerState.backup_state ===
                    BackupStates.ContinentSelecting ||
                  reducer.currentReducerState.backup_state ===
                    BackupStates.CountrySelecting
                    ? "is-active"
                    : ""
                }
              >
                <div class="ml-4">
                  <span class="menu-item-label">
                    <Translate>Location</Translate>
                  </span>
                </div>
              </li>
              <li
                class={
                  reducer.currentReducerState.backup_state ===
                  BackupStates.UserAttributesCollecting
                    ? "is-active"
                    : ""
                }
              >
                <div class="ml-4">
                  <span class="menu-item-label">
                    <Translate>Personal information</Translate>
                  </span>
                </div>
              </li>
              <li
                class={
                  reducer.currentReducerState.backup_state ===
                  BackupStates.AuthenticationsEditing
                    ? "is-active"
                    : ""
                }
              >
                <div class="ml-4">
                  <span class="menu-item-label">
                    <Translate>Authorization methods</Translate>
                  </span>
                </div>
              </li>
              <li
                class={
                  reducer.currentReducerState.backup_state ===
                  BackupStates.PoliciesReviewing
                    ? "is-active"
                    : ""
                }
              >
                <div class="ml-4">
                  <span class="menu-item-label">
                    <Translate>Policies</Translate>
                  </span>
                </div>
              </li>
              <li
                class={
                  reducer.currentReducerState.backup_state ===
                  BackupStates.SecretEditing
                    ? "is-active"
                    : ""
                }
              >
                <div class="ml-4">
                  <span class="menu-item-label">
                    <Translate>Secret input</Translate>
                  </span>
                </div>
              </li>
              {/* <li class={reducer.currentReducerState.backup_state === BackupStates.PoliciesPaying ? 'is-active' : ''}>
              <div class="ml-4">

                <span class="menu-item-label"><Translate>Payment (optional)</Translate></span>
              </div>
            </li> */}
              <li
                class={
                  reducer.currentReducerState.backup_state ===
                  BackupStates.BackupFinished
                    ? "is-active"
                    : ""
                }
              >
                <div class="ml-4">
                  <span class="menu-item-label">
                    <Translate>Backup completed</Translate>
                  </span>
                </div>
              </li>
              {/* <li class={reducer.currentReducerState.backup_state === BackupStates.TruthsPaying ? 'is-active' : ''}>
              <div class="ml-4">

                <span class="menu-item-label"><Translate>Truth Paying</Translate></span>
              </div>
            </li> */}
              {reducer.currentReducerState.backup_state !==
                BackupStates.BackupFinished && (
                <li>
                  <div class="buttons ml-4">
                    <button
                      class="button is-primary is-right"
                      onClick={saveSession}
                    >
                      Save backup session
                    </button>
                  </div>
                </li>
              )}
              {reducer.currentReducerState.backup_state !==
                BackupStates.BackupFinished && (
                <li>
                  <div class="buttons ml-4">
                    <button
                      class="button is-danger is-right"
                      onClick={() => reducer.reset()}
                    >
                      Reset session
                    </button>
                  </div>
                </li>
              )}
            </Fragment>
          ) : (
            reducer.currentReducerState?.reducer_type === "recovery" && (
              <Fragment>
                <li
                  class={
                    reducer.currentReducerState.recovery_state ===
                      RecoveryStates.ContinentSelecting ||
                    reducer.currentReducerState.recovery_state ===
                      RecoveryStates.CountrySelecting
                      ? "is-active"
                      : ""
                  }
                >
                  <div class="ml-4">
                    <span class="menu-item-label">
                      <Translate>Location</Translate>
                    </span>
                  </div>
                </li>
                <li
                  class={
                    reducer.currentReducerState.recovery_state ===
                    RecoveryStates.UserAttributesCollecting
                      ? "is-active"
                      : ""
                  }
                >
                  <div class="ml-4">
                    <span class="menu-item-label">
                      <Translate>Personal information</Translate>
                    </span>
                  </div>
                </li>
                <li
                  class={
                    reducer.currentReducerState.recovery_state ===
                    RecoveryStates.SecretSelecting
                      ? "is-active"
                      : ""
                  }
                >
                  <div class="ml-4">
                    <span class="menu-item-label">
                      <Translate>Secret selection</Translate>
                    </span>
                  </div>
                </li>
                <li
                  class={
                    reducer.currentReducerState.recovery_state ===
                      RecoveryStates.ChallengeSelecting ||
                    reducer.currentReducerState.recovery_state ===
                      RecoveryStates.ChallengeSolving
                      ? "is-active"
                      : ""
                  }
                >
                  <div class="ml-4">
                    <span class="menu-item-label">
                      <Translate>Solve Challenges</Translate>
                    </span>
                  </div>
                </li>
                <li
                  class={
                    reducer.currentReducerState.recovery_state ===
                    RecoveryStates.RecoveryFinished
                      ? "is-active"
                      : ""
                  }
                >
                  <div class="ml-4">
                    <span class="menu-item-label">
                      <Translate>Secret recovered</Translate>
                    </span>
                  </div>
                </li>
                {reducer.currentReducerState.recovery_state !==
                  RecoveryStates.RecoveryFinished && (
                  <li>
                    <div class="buttons ml-4">
                      <button
                        class="button is-primary is-right"
                        onClick={saveSession}
                      >
                        Save recovery session
                      </button>
                    </div>
                  </li>
                )}
                {reducer.currentReducerState.recovery_state ===
                RecoveryStates.RecoveryFinished ? (
                  <Fragment />
                ) : (
                  <li>
                    <div class="buttons ml-4">
                      <button
                        class="button is-danger is-right"
                        onClick={() => reducer.reset()}
                      >
                        Reset session
                      </button>
                    </div>
                  </li>
                )}
              </Fragment>
            )
          )}

          {/* <li>
              <div class="buttons ml-4">
                <button class="button is-info is-right" >Manage providers</button>
              </div>
            </li> */}
        </ul>
      </div>
    </aside>
  );
}
