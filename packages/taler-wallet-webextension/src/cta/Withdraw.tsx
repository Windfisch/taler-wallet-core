/*
 This file is part of TALER
 (C) 2015-2016 GNUnet e.V.

 TALER is free software; you can redistribute it and/or modify it under the
 terms of the GNU General Public License as published by the Free Software
 Foundation; either version 3, or (at your option) any later version.

 TALER is distributed in the hope that it will be useful, but WITHOUT ANY
 WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR
 A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

 You should have received a copy of the GNU General Public License along with
 TALER; see the file COPYING.  If not, see <http://www.gnu.org/licenses/>
 */

/**
 * Page shown to the user to confirm creation
 * of a reserve, usually requested by the bank.
 *
 * @author Florian Dold
 */

import { AmountJson, Amounts, ExchangeListItem, i18n, WithdrawUriInfoResponse } from '@gnu-taler/taler-util';
import { ExchangeWithdrawDetails } from '@gnu-taler/taler-wallet-core/src/operations/withdraw';
import { useState } from "preact/hooks";
import { Fragment } from 'preact/jsx-runtime';
import { CheckboxOutlined } from '../components/CheckboxOutlined';
import { ExchangeXmlTos } from '../components/ExchangeToS';
import { LogoHeader } from '../components/LogoHeader';
import { Part } from '../components/Part';
import { SelectList } from '../components/SelectList';
import { ButtonSuccess, ButtonWarning, LinkSuccess, LinkWarning, TermsOfService, WalletAction } from '../components/styled';
import { useAsyncAsHook } from '../hooks/useAsyncAsHook';
import {
  acceptWithdrawal, getExchangeWithdrawalInfo, getWithdrawalDetailsForUri, setExchangeTosAccepted, listExchanges
} from "../wxApi";
import { wxMain } from '../wxBackend.js';

interface Props {
  talerWithdrawUri?: string;
}

export interface ViewProps {
  details: ExchangeWithdrawDetails;
  amount: AmountJson;
  onSwitchExchange: (ex: string) => void;
  onWithdraw: () => Promise<void>;
  onReview: (b: boolean) => void;
  onAccept: (b: boolean) => void;
  reviewing: boolean;
  accepted: boolean;
  confirmed: boolean;
  terms: {
    value?: TermsDocument;
    status: TermsStatus;
  },
  knownExchanges: ExchangeListItem[]

};

type TermsStatus = 'new' | 'accepted' | 'changed' | 'notfound';

type TermsDocument = TermsDocumentXml | TermsDocumentHtml;

interface TermsDocumentXml {
  type: 'xml',
  document: Document,
}

interface TermsDocumentHtml {
  type: 'html',
  href: string,
}

function amountToString(text: AmountJson) {
  const aj = Amounts.jsonifyAmount(text)
  const amount = Amounts.stringifyValue(aj)
  return `${amount} ${aj.currency}`
}

export function View({ details, knownExchanges, amount, onWithdraw, onSwitchExchange, terms, reviewing, onReview, onAccept, accepted, confirmed }: ViewProps) {
  const needsReview = terms.status === 'changed' || terms.status === 'new'

  const [switchingExchange, setSwitchingExchange] = useState<string | undefined>(undefined)
  const exchanges = knownExchanges.reduce((prev, ex) => ({ ...prev, [ex.exchangeBaseUrl]: ex.exchangeBaseUrl }), {})

  return (
    <WalletAction>
      <LogoHeader />
      <h2>
        {i18n.str`Digital cash withdrawal`}
      </h2>
      <section>
        <Part title="Total to withdraw" text={amountToString(Amounts.sub(amount, details.withdrawFee).amount)} kind='positive' />
        <Part title="Chosen amount" text={amountToString(amount)} kind='neutral' />
        {Amounts.isNonZero(details.withdrawFee) &&
          <Part title="Exchange fee" text={amountToString(details.withdrawFee)} kind='negative' />
        }
        <Part title="Exchange" text={details.exchangeInfo.baseUrl} kind='neutral' big />
      </section>
      {!reviewing &&
        <section>
          {switchingExchange !== undefined ? <Fragment>
            <div>
              <SelectList label="Known exchanges" list={exchanges} name="" onChange={onSwitchExchange} />
            </div>
            <p>
              This is the list of known exchanges
            </p>
            <LinkSuccess upperCased onClick={() => onSwitchExchange(switchingExchange)}>
              {i18n.str`Confirm exchange selection`}
            </LinkSuccess>
          </Fragment>
            : <LinkSuccess upperCased onClick={() => setSwitchingExchange("")}>
              {i18n.str`Switch exchange`}
            </LinkSuccess>}

        </section>
      }
      {!reviewing && accepted &&
        <section>
          <LinkSuccess
            upperCased
            onClick={() => onReview(true)}
          >
            {i18n.str`Show terms of service`}
          </LinkSuccess>
        </section>
      }
      {reviewing &&
        <section>
          <TermsOfService>
            {terms.status !== 'accepted' && terms.value && terms.value.type === 'xml' && <ExchangeXmlTos doc={terms.value.document} />}
          </TermsOfService>
        </section>}
      {reviewing && accepted &&
        <section>
          <LinkSuccess
            upperCased
            onClick={() => onReview(false)}
          >
            {i18n.str`Hide terms of service`}
          </LinkSuccess>
        </section>
      }
      {(reviewing || accepted) &&
        <section>
          <CheckboxOutlined
            name="terms"
            enabled={accepted}
            label={i18n.str`I accept the exchange terms of service`}
            onToggle={() => {
              onAccept(!accepted)
              onReview(false)
            }}
          />
        </section>
      }

      {/**
       * Main action section
       */}
      <section>
        {terms.status === 'new' && !accepted && !reviewing &&
          <ButtonSuccess
            upperCased
            disabled={!details.exchangeInfo.baseUrl}
            onClick={() => onReview(true)}
          >
            {i18n.str`Review exchange terms of service`}
          </ButtonSuccess>
        }
        {terms.status === 'changed' && !accepted &&
          <ButtonWarning
            upperCased
            disabled={!details.exchangeInfo.baseUrl}
            onClick={() => onReview(true)}
          >
            {i18n.str`Review new version of terms of service`}
          </ButtonWarning>
        }
        {(terms.status === 'accepted' || (needsReview && accepted)) &&
          <ButtonSuccess
            upperCased
            disabled={!details.exchangeInfo.baseUrl || confirmed}
            onClick={onWithdraw}
          >
            {i18n.str`Confirm withdrawal`}
          </ButtonSuccess>
        }
        {terms.status === 'notfound' &&
          <LinkWarning upperCased>
            {i18n.str`Exchange doesn't have terms of service`}
          </LinkWarning>
        }
      </section>
    </WalletAction>
  )
}

export function WithdrawPageWithParsedURI({ uri, uriInfo }: { uri: string, uriInfo: WithdrawUriInfoResponse }) {
  const [customExchange, setCustomExchange] = useState<string | undefined>(undefined)
  const [errorAccepting, setErrorAccepting] = useState<string | undefined>(undefined)

  const [reviewing, setReviewing] = useState<boolean>(false)
  const [accepted, setAccepted] = useState<boolean>(false)
  const [confirmed, setConfirmed] = useState<boolean>(false)

  const knownExchangesHook = useAsyncAsHook(() => listExchanges())

  const knownExchanges = !knownExchangesHook || knownExchangesHook.hasError ? [] : knownExchangesHook.response.exchanges
  const withdrawAmount = Amounts.parseOrThrow(uriInfo.amount)
  const thisCurrencyExchanges = knownExchanges.filter(ex => ex.currency === withdrawAmount.currency)

  const exchange = customExchange || uriInfo.defaultExchangeBaseUrl || thisCurrencyExchanges[0]?.exchangeBaseUrl
  const detailsHook = useAsyncAsHook(async () => {
    if (!exchange) throw Error('no default exchange')
    return getExchangeWithdrawalInfo({
      exchangeBaseUrl: exchange,
      amount: withdrawAmount,
      tosAcceptedFormat: ['text/json', 'text/xml', 'text/pdf']
    })
  })

  if (!detailsHook) {
    return <span><i18n.Translate>Getting withdrawal details.</i18n.Translate></span>;
  }
  if (detailsHook.hasError) {
    return <span><i18n.Translate>Problems getting details: {detailsHook.message}</i18n.Translate></span>;
  }

  const details = detailsHook.response

  const onAccept = async (): Promise<void> => {
    try {
      await setExchangeTosAccepted(details.exchangeInfo.baseUrl, details.tosRequested?.tosEtag)
      setAccepted(true)
    } catch (e) {
      if (e instanceof Error) {
        setErrorAccepting(e.message)
      }
    }
  }

  const onWithdraw = async (): Promise<void> => {
    setConfirmed(true)
    console.log("accepting exchange", details.exchangeDetails.exchangeBaseUrl);
    try {
      const res = await acceptWithdrawal(uri, details.exchangeInfo.baseUrl);
      console.log("accept withdrawal response", res);
      if (res.confirmTransferUrl) {
        document.location.href = res.confirmTransferUrl;
      }
    } catch (e) {
      setConfirmed(false)
    }
  };

  let termsContent: TermsDocument | undefined = undefined;
  if (details.tosRequested) {
    if (details.tosRequested.tosContentType === 'text/xml') {
      try {
        const document = new DOMParser().parseFromString(details.tosRequested.tosText, "text/xml")
        termsContent = { type: 'xml', document }
      } catch (e) {
        console.log(e)
        debugger;
      }
    }
  }

  const status: TermsStatus = !termsContent ? 'notfound' : (
    !details.exchangeDetails.termsOfServiceAcceptedEtag ? 'new' : (
      details.tosRequested?.tosEtag !== details.exchangeDetails.termsOfServiceAcceptedEtag ? 'changed' : 'accepted'
    ))


  return <View onWithdraw={onWithdraw}
    // setCancelled={setCancelled} setSelecting={setSelecting}
    details={details} amount={withdrawAmount}
    terms={{
      status, value: termsContent
    }}
    onSwitchExchange={setCustomExchange}
    knownExchanges={knownExchanges}
    confirmed={confirmed}
    accepted={accepted} onAccept={onAccept}
    reviewing={reviewing} onReview={setReviewing}
  // terms={[]}
  />
}
export function WithdrawPage({ talerWithdrawUri }: Props): JSX.Element {
  const uriInfoHook = useAsyncAsHook(() => !talerWithdrawUri ? Promise.reject(undefined) :
    getWithdrawalDetailsForUri({ talerWithdrawUri })
  )

  if (!talerWithdrawUri) {
    return <span><i18n.Translate>missing withdraw uri</i18n.Translate></span>;
  }
  if (!uriInfoHook) {
    return <span><i18n.Translate>Loading...</i18n.Translate></span>;
  }
  if (uriInfoHook.hasError) {
    return <span><i18n.Translate>This URI is not valid anymore: {uriInfoHook.message}</i18n.Translate></span>;
  }
  return <WithdrawPageWithParsedURI uri={talerWithdrawUri} uriInfo={uriInfoHook.response} />
}

