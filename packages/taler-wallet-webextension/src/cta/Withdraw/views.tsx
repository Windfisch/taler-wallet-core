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
import { Amount } from "../../components/Amount.js";
import { ErrorTalerOperation } from "../../components/ErrorTalerOperation.js";
import { LoadingError } from "../../components/LoadingError.js";
import { LogoHeader } from "../../components/LogoHeader.js";
import { Part } from "../../components/Part.js";
import { QR } from "../../components/QR.js";
import { SelectList } from "../../components/SelectList.js";
import {
  Input,
  Link,
  LinkSuccess,
  SubTitle,
  SvgIcon,
  WalletAction,
} from "../../components/styled/index.js";
import { useTranslationContext } from "../../context/translation.js";
import { Button } from "../../mui/Button.js";
import editIcon from "../../svg/edit_24px.svg";
import { ExchangeDetails, WithdrawDetails } from "../../wallet/Transaction.js";
import { TermsOfService } from "../../components/TermsOfService/index.js";
import { State } from "./index.js";
import { ExchangeTosStatus } from "@gnu-taler/taler-util";

export function LoadingUriView({ error }: State.LoadingUriError): VNode {
  const { i18n } = useTranslationContext();

  return (
    <LoadingError
      title={
        <i18n.Translate>Could not get the info from the URI</i18n.Translate>
      }
      error={error}
    />
  );
}

export function LoadingInfoView({ error }: State.LoadingInfoError): VNode {
  const { i18n } = useTranslationContext();

  return (
    <LoadingError
      title={<i18n.Translate>Could not get info of withdrawal</i18n.Translate>}
      error={error}
    />
  );
}

export function SuccessView(state: State.Success): VNode {
  const { i18n } = useTranslationContext();
  const currentTosVersionIsAccepted =
    state.currentExchange.tosStatus === ExchangeTosStatus.Accepted;
  return (
    <WalletAction>
      <LogoHeader />
      <SubTitle>
        <i18n.Translate>Digital cash withdrawal</i18n.Translate>
      </SubTitle>

      {state.doWithdrawal.error && (
        <ErrorTalerOperation
          title={
            <i18n.Translate>
              Could not finish the withdrawal operation
            </i18n.Translate>
          }
          error={state.doWithdrawal.error.errorDetail}
        />
      )}

      <section style={{ textAlign: "left" }}>
        <Part
          title={
            <div
              style={{
                display: "flex",
                alignItems: "center",
              }}
            >
              <i18n.Translate>Exchange</i18n.Translate>
              <Button onClick={state.doSelectExchange.onClick} variant="text">
                <SvgIcon
                  title="Edit"
                  dangerouslySetInnerHTML={{ __html: editIcon }}
                  color="black"
                />
              </Button>
            </div>
          }
          text={
            <ExchangeDetails exchange={state.currentExchange.exchangeBaseUrl} />
          }
          kind="neutral"
          big
        />
        <Part
          title={<i18n.Translate>Details</i18n.Translate>}
          text={
            <WithdrawDetails
              amount={{
                effective: state.toBeReceived,
                raw: state.chosenAmount,
              }}
            />
          }
        />
        {state.ageRestriction && (
          <Input>
            <SelectList
              label={<i18n.Translate>Age restriction</i18n.Translate>}
              list={state.ageRestriction.list}
              name="age"
              value={state.ageRestriction.value}
              onChange={state.ageRestriction.onChange}
            />
          </Input>
        )}
      </section>

      <section>
        {currentTosVersionIsAccepted ? (
          <Button
            variant="contained"
            color="success"
            disabled={!state.doWithdrawal.onClick}
            onClick={state.doWithdrawal.onClick}
          >
            <i18n.Translate>
              Withdraw &nbsp; <Amount value={state.toBeReceived} />
            </i18n.Translate>
          </Button>
        ) : (
          <TermsOfService
            exchangeUrl={state.currentExchange.exchangeBaseUrl}
            onChange={state.onTosUpdate}
          />
        )}
      </section>
      {state.talerWithdrawUri ? (
        <WithdrawWithMobile talerWithdrawUri={state.talerWithdrawUri} />
      ) : undefined}
      <section>
        <Link upperCased onClick={state.cancel}>
          <i18n.Translate>Cancel</i18n.Translate>
        </Link>
      </section>
    </WalletAction>
  );
}

function WithdrawWithMobile({
  talerWithdrawUri,
}: {
  talerWithdrawUri: string;
}): VNode {
  const { i18n } = useTranslationContext();
  const [showQR, setShowQR] = useState<boolean>(false);

  return (
    <section>
      <LinkSuccess upperCased onClick={() => setShowQR((qr) => !qr)}>
        {!showQR ? (
          <i18n.Translate>Withdraw to a mobile phone</i18n.Translate>
        ) : (
          <i18n.Translate>Hide QR</i18n.Translate>
        )}
      </LinkSuccess>
      {showQR && (
        <div>
          <QR text={talerWithdrawUri} />
          <i18n.Translate>
            Scan the QR code or &nbsp;
            <a href={talerWithdrawUri}>
              <i18n.Translate>click here</i18n.Translate>
            </a>
          </i18n.Translate>
        </div>
      )}
    </section>
  );
}
