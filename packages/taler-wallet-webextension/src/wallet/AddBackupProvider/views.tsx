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

import { Amounts } from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { Checkbox } from "../../components/Checkbox.js";
import { LoadingError } from "../../components/LoadingError.js";
import {
  LightText,
  SmallLightText,
  SubTitle,
  TermsOfService,
  Title,
} from "../../components/styled/index.js";
import { useTranslationContext } from "../../context/translation.js";
import { Button } from "../../mui/Button.js";
import { TextField } from "../../mui/TextField.js";
import { State } from "./index.js";

export function LoadingUriView({ error }: State.LoadingUriError): VNode {
  const { i18n } = useTranslationContext();

  return (
    <LoadingError
      title={<i18n.Translate>Could not load</i18n.Translate>}
      error={error}
    />
  );
}

export function ConfirmProviderView({
  url,
  provider,
  tos,
  onCancel,
  onAccept,
}: State.ConfirmProvider): VNode {
  const { i18n } = useTranslationContext();
  const noFee = Amounts.isZero(provider.annual_fee);
  return (
    <Fragment>
      <section>
        <Title>
          <i18n.Translate>Review terms of service</i18n.Translate>
        </Title>
        <div>
          <i18n.Translate>Provider URL</i18n.Translate>:{" "}
          <a href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
        </div>
        <SmallLightText>
          <i18n.Translate>
            Please review and accept this provider&apos;s terms of service
          </i18n.Translate>
        </SmallLightText>
        <SubTitle>
          1. <i18n.Translate>Pricing</i18n.Translate>
        </SubTitle>
        <p>
          {noFee ? (
            <i18n.Translate>free of charge</i18n.Translate>
          ) : (
            <i18n.Translate>
              {provider.annual_fee} per year of service
            </i18n.Translate>
          )}
        </p>
        <SubTitle>
          2. <i18n.Translate>Storage</i18n.Translate>
        </SubTitle>
        <p>
          <i18n.Translate>
            {provider.storage_limit_in_megabytes} megabytes of storage per year
            of service
          </i18n.Translate>
        </p>
        {/* replace with <TermsOfService /> */}
        <Checkbox
          label={<i18n.Translate>Accept terms of service</i18n.Translate>}
          name="terms"
          onToggle={tos.button.onClick}
          enabled={tos.value}
        />
      </section>
      <footer>
        <Button
          variant="contained"
          color="secondary"
          onClick={onCancel.onClick}
        >
          <i18n.Translate>Cancel</i18n.Translate>
        </Button>
        <Button variant="contained" color="primary" onClick={onAccept.onClick}>
          {noFee ? (
            <i18n.Translate>Add provider</i18n.Translate>
          ) : (
            <i18n.Translate>Pay</i18n.Translate>
          )}
        </Button>
      </footer>
    </Fragment>
  );
}

export function SelectProviderView({
  url,
  name,
  urlOk,
  onCancel,
  onConfirm,
}: State.SelectProvider): VNode {
  const { i18n } = useTranslationContext();
  return (
    <Fragment>
      <section>
        <Title>
          <i18n.Translate>Add backup provider</i18n.Translate>
        </Title>
        <LightText>
          <i18n.Translate>
            Backup providers may charge for their service
          </i18n.Translate>
        </LightText>
        <p>
          <TextField
            label={<i18n.Translate>URL</i18n.Translate>}
            placeholder="https://"
            color={urlOk ? "success" : undefined}
            value={url.value}
            error={url.error}
            onChange={url.onInput}
          />
        </p>
        <p>
          <TextField
            label={<i18n.Translate>Name</i18n.Translate>}
            placeholder="provider name"
            value={name.value}
            error={name.error}
            onChange={name.onInput}
          />
        </p>
      </section>
      <footer>
        <Button
          variant="contained"
          color="secondary"
          onClick={onCancel.onClick}
        >
          <i18n.Translate>Cancel</i18n.Translate>
        </Button>
        <Button variant="contained" color="primary" onClick={onConfirm.onClick}>
          <i18n.Translate>Next</i18n.Translate>
        </Button>
      </footer>
    </Fragment>
  );
}
