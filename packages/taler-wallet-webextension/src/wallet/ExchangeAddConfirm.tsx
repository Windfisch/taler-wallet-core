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
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Title } from "../components/styled/index.js";
import { TermsOfService } from "../components/TermsOfService/index.js";
import { useTranslationContext } from "../context/translation.js";
import { Button } from "../mui/Button.js";

export interface Props {
  url: string;
  onCancel: () => Promise<void>;
  onConfirm: () => Promise<void>;
}

export function ExchangeAddConfirmPage({
  url,
  onCancel,
  onConfirm,
}: Props): VNode {
  const { i18n } = useTranslationContext();

  const [accepted, setAccepted] = useState(false);

  return (
    <Fragment>
      <section>
        <Title>
          <i18n.Translate>Review terms of service</i18n.Translate>
        </Title>
        <div>
          <i18n.Translate>Exchange URL</i18n.Translate>:
          <a href={url} target="_blank" rel="noreferrer">
            {url}
          </a>
        </div>
      </section>

      <TermsOfService key="terms" exchangeUrl={url} onChange={setAccepted} />

      <footer>
        <Button
          key="cancel"
          variant="contained"
          color="secondary"
          onClick={onCancel}
        >
          <i18n.Translate>Cancel</i18n.Translate>
        </Button>
        <Button
          key="add"
          variant="contained"
          color="success"
          disabled={!accepted}
          onClick={onConfirm}
        >
          <i18n.Translate>Add exchange</i18n.Translate>
        </Button>
      </footer>
    </Fragment>
  );
}
