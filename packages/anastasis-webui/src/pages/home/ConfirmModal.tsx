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
import { ComponentChildren, h, VNode } from "preact";
import { AsyncButton } from "../../components/AsyncButton.js";

export interface ConfirmModelProps {
  active?: boolean;
  description?: string;
  onCancel?: () => void;
  onConfirm?: () => Promise<void>;
  label?: string;
  cancelLabel?: string;
  children?: ComponentChildren;
  danger?: boolean;
  disabled?: boolean;
}

export function ConfirmModal({
  active,
  description,
  onCancel,
  onConfirm,
  children,
  danger,
  disabled,
  label = "Confirm",
  cancelLabel = "Dismiss",
}: ConfirmModelProps): VNode {
  return (
    <div class={active ? "modal is-active" : "modal"}>
      <div class="modal-background " onClick={onCancel} />
      <div class="modal-card" style={{ maxWidth: 700 }}>
        <header class="modal-card-head">
          {!description ? null : (
            <p class="modal-card-title">
              <b>{description}</b>
            </p>
          )}
          <button class="delete " aria-label="close" onClick={onCancel} />
        </header>
        <section class="modal-card-body">{children}</section>
        <footer class="modal-card-foot">
          <button class="button" onClick={onCancel}>
            {cancelLabel}
          </button>
          <div
            class="buttons is-right"
            style={{ width: "100%" }}
            onKeyDown={(e) => {
              if (e.key === "Escape" && onCancel) onCancel();
            }}
          >
            <AsyncButton
              grabFocus
              class={danger ? "button is-danger " : "button is-info "}
              disabled={disabled}
              onClick={onConfirm}
            >
              {label}
            </AsyncButton>
          </div>
        </footer>
      </div>
      <button
        class="modal-close is-large "
        aria-label="close"
        onClick={onCancel}
      />
    </div>
  );
}
