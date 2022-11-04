/*
 This file is part of GNU Taler
 (C) 2021 Taler Systems S.A.

 GNU Taler is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 GNU Taler is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 GNU Taler; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
*
* @author Sebastian Javier Marchano (sebasjm)
*/


import { ComponentChildren, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { useInstanceContext } from "../../context/instance.js";
import { Translate, useTranslator } from "../../i18n/index.js";
import { DEFAULT_REQUEST_TIMEOUT } from "../../utils/constants.js";
import { Loading, Spinner } from "../exception/loading.js";
import { FormProvider } from "../form/FormProvider.js";
import { Input } from "../form/Input.js";

interface Props {
  active?: boolean;
  description?: string;
  onCancel?: () => void;
  onConfirm?: () => void;
  label?: string;
  children?: ComponentChildren;
  danger?: boolean;
  disabled?: boolean;
}

export function ConfirmModal({ active, description, onCancel, onConfirm, children, danger, disabled, label = 'Confirm' }: Props): VNode {
  return <div class={active ? "modal is-active" : "modal"}>
    <div class="modal-background " onClick={onCancel} />
    <div class="modal-card" style={{maxWidth: 700}}>
      <header class="modal-card-head">
        {!description ? null : <p class="modal-card-title"><b>{description}</b></p>}
        <button class="delete " aria-label="close" onClick={onCancel} />
      </header>
      <section class="modal-card-body">
        {children}
      </section>
      <footer class="modal-card-foot">
        <div class="buttons is-right" style={{ width: '100%' }}>
          <button class="button " onClick={onCancel} ><Translate>Cancel</Translate></button>
          <button class={danger ? "button is-danger " : "button is-info "} disabled={disabled} onClick={onConfirm} ><Translate>{label}</Translate></button>
        </div>
      </footer>
    </div>
    <button class="modal-close is-large " aria-label="close" onClick={onCancel} />
  </div>
}

export function ContinueModal({ active, description, onCancel, onConfirm, children, disabled }: Props): VNode {
  return <div class={active ? "modal is-active" : "modal"}>
    <div class="modal-background " onClick={onCancel} />
    <div class="modal-card">
      <header class="modal-card-head has-background-success">
        {!description ? null : <p class="modal-card-title">{description}</p>}
        <button class="delete " aria-label="close" onClick={onCancel} />
      </header>
      <section class="modal-card-body">
        {children}
      </section>
      <footer class="modal-card-foot">
        <div class="buttons is-right" style={{ width: '100%' }}>
          <button class="button is-success " disabled={disabled} onClick={onConfirm} ><Translate>Continue</Translate></button>
        </div>
      </footer>
    </div>
    <button class="modal-close is-large " aria-label="close" onClick={onCancel} />
  </div>
}

export function SimpleModal({ onCancel, children }: any): VNode {
  return <div class="modal is-active">
    <div class="modal-background " onClick={onCancel} />
    <div class="modal-card">
      <section class="modal-card-body is-main-section">
        {children}
      </section>
    </div>
    <button class="modal-close is-large " aria-label="close" onClick={onCancel} />
  </div>
}

export function ClearConfirmModal({ description, onCancel, onClear, onConfirm, children }: Props & { onClear?: () => void }): VNode {
  return <div class="modal is-active">
    <div class="modal-background " onClick={onCancel} />
    <div class="modal-card">
      <header class="modal-card-head">
        {!description ? null : <p class="modal-card-title">{description}</p>}
        <button class="delete " aria-label="close" onClick={onCancel} />
      </header>
      <section class="modal-card-body is-main-section">
        {children}
      </section>
      <footer class="modal-card-foot">
        {onClear && <button class="button is-danger" onClick={onClear} disabled={onClear === undefined} ><Translate>Clear</Translate></button>}
        <div class="buttons is-right" style={{ width: '100%' }}>
          <button class="button " onClick={onCancel} ><Translate>Cancel</Translate></button>
          <button class="button is-info" onClick={onConfirm} disabled={onConfirm === undefined} ><Translate>Confirm</Translate></button>
        </div>
      </footer>
    </div>
    <button class="modal-close is-large " aria-label="close" onClick={onCancel} />
  </div>
}

interface DeleteModalProps {
  element: { id: string, name: string };
  onCancel: () => void;
  onConfirm: (id: string) => void;
}

export function DeleteModal({ element, onCancel, onConfirm }: DeleteModalProps): VNode {
  return <ConfirmModal label={`Delete instance`} description={`Delete the instance "${element.name}"`} danger active onCancel={onCancel} onConfirm={() => onConfirm(element.id)}>
    <p>If you delete the instance named <b>"{element.name}"</b> (ID: <b>{element.id}</b>), the merchant will no longer be able to process orders or refunds</p>
    <p>This action deletes the instance private key, but preserves all transaction data. You can still access that data after deleting the instance.</p>
    <p class="warning">Deleting an instance <b>cannot be undone</b>.</p>
  </ConfirmModal>
}

export function PurgeModal({ element, onCancel, onConfirm }: DeleteModalProps): VNode {
  return <ConfirmModal label={`Purge the instance`} description={`Purge the instance "${element.name}"`} danger active onCancel={onCancel} onConfirm={() => onConfirm(element.id)}>
    <p>If you purge the instance named <b>"{element.name}"</b> (ID: <b>{element.id}</b>), you will also delete all it's transaction data.</p>
    <p>The instance will disappear from your list, and you will no longer be able to access it's data.</p>
    <p class="warning">Purging an instance <b>cannot be undone</b>.</p>
  </ConfirmModal>
}

interface UpdateTokenModalProps {
  oldToken?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
  onClear: () => void;
}

//FIXME: merge UpdateTokenModal with SetTokenNewInstanceModal
export function UpdateTokenModal({ onCancel, onClear, onConfirm, oldToken }: UpdateTokenModalProps): VNode {
  type State = { old_token: string, new_token: string, repeat_token: string }
  const [form, setValue] = useState<Partial<State>>({
    old_token: '', new_token: '', repeat_token: '',
  })
  const i18n = useTranslator()

  const hasInputTheCorrectOldToken = oldToken && oldToken !== form.old_token
  const errors = {
    old_token: hasInputTheCorrectOldToken ? i18n`is not the same as the current access token` : undefined,
    new_token: !form.new_token ? i18n`cannot be empty` : (form.new_token === form.old_token ? i18n`cannot be the same as the old token` : undefined),
    repeat_token: form.new_token !== form.repeat_token ? i18n`is not the same` : undefined
  }

  const hasErrors = Object.keys(errors).some(k => (errors as any)[k] !== undefined)

  const instance = useInstanceContext()

  const text = i18n`You are updating the access token from instance with id ${instance.id}`

  return <ClearConfirmModal description={text}
    onCancel={onCancel}
    onConfirm={!hasErrors ? () => onConfirm(form.new_token!) : undefined}
    onClear={!hasInputTheCorrectOldToken && oldToken ? onClear : undefined}
  >
    <div class="columns">
      <div class="column" />
      <div class="column is-four-fifths" >
        <FormProvider errors={errors} object={form} valueHandler={setValue}>
          {oldToken && <Input<State> name="old_token" label={i18n`Old access token`} tooltip={i18n`access token currently in use`} inputType="password" />}
          <Input<State> name="new_token" label={i18n`New access token`} tooltip={i18n`next access token to be used`} inputType="password" />
          <Input<State> name="repeat_token" label={i18n`Repeat access token`} tooltip={i18n`confirm the same access token`} inputType="password" />
        </FormProvider>
        <p><Translate>Clearing the access token will mean public access to the instance</Translate></p>
      </div>
      <div class="column" />
    </div>
  </ClearConfirmModal>
}

export function SetTokenNewInstanceModal({ onCancel, onClear, onConfirm }: UpdateTokenModalProps): VNode {
  type State = { old_token: string, new_token: string, repeat_token: string }
  const [form, setValue] = useState<Partial<State>>({
    new_token: '', repeat_token: '',
  })
  const i18n = useTranslator()

  const errors = {
    new_token: !form.new_token ? i18n`cannot be empty` : (form.new_token === form.old_token ? i18n`cannot be the same as the old access token` : undefined),
    repeat_token: form.new_token !== form.repeat_token ? i18n`is not the same` : undefined
  }

  const hasErrors = Object.keys(errors).some(k => (errors as any)[k] !== undefined)


  return <div class="modal is-active">
    <div class="modal-background " onClick={onCancel} />
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">{i18n`You are setting the access token for the new instance`}</p>
        <button class="delete " aria-label="close" onClick={onCancel} />
      </header>
      <section class="modal-card-body is-main-section">
        <div class="columns">
          <div class="column" />
          <div class="column is-four-fifths" >
            <FormProvider errors={errors} object={form} valueHandler={setValue}>
              <Input<State> name="new_token" label={i18n`New access token`} tooltip={i18n`next access token to be used`} inputType="password" />
              <Input<State> name="repeat_token" label={i18n`Repeat access token`} tooltip={i18n`confirm the same access token`} inputType="password" />
            </FormProvider>
            <p><Translate>With external authorization method no check will be done by the merchant backend</Translate></p>
          </div>
          <div class="column" />
        </div>
      </section>
      <footer class="modal-card-foot">
        {onClear && <button class="button is-danger" onClick={onClear} disabled={onClear === undefined} ><Translate>Set external authorization</Translate></button>}
        <div class="buttons is-right" style={{ width: '100%' }}>
          <button class="button " onClick={onCancel} ><Translate>Cancel</Translate></button>
          <button class="button is-info" onClick={() => onConfirm(form.new_token!)} disabled={hasErrors} ><Translate>Set access token</Translate></button>
        </div>
      </footer>
    </div>
    <button class="modal-close is-large " aria-label="close" onClick={onCancel} />
  </div>
}

export function LoadingModal({ onCancel }: { onCancel: () => void }): VNode {
  const i18n = useTranslator()
  return <div class="modal is-active">
    <div class="modal-background " onClick={onCancel} />
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title"><Translate>Operation in progress...</Translate></p>
      </header>
      <section class="modal-card-body">
        <div class="columns">
          <div class="column" />
          <Spinner />
          <div class="column" />
        </div>
        <p>{i18n`The operation will be automatically canceled after ${DEFAULT_REQUEST_TIMEOUT} seconds`}</p>
      </section>
      <footer class="modal-card-foot">
        <div class="buttons is-right" style={{ width: '100%' }}>
          <button class="button " onClick={onCancel} ><Translate>Cancel</Translate></button>
        </div>
      </footer>
    </div>
    <button class="modal-close is-large " aria-label="close" onClick={onCancel} />
  </div>
}
