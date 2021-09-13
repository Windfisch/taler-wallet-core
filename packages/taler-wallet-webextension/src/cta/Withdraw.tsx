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

import { AmountLike, Amounts, i18n, WithdrawUriInfoResponse } from '@gnu-taler/taler-util';
import { ExchangeWithdrawDetails } from '@gnu-taler/taler-wallet-core/src/operations/withdraw';
import { useEffect, useState } from "preact/hooks";
import { CheckboxOutlined } from '../components/CheckboxOutlined';
import { ExchangeXmlTos } from '../components/ExchangeToS';
import { LogoHeader } from '../components/LogoHeader';
import { Part } from '../components/Part';
import { ButtonDestructive, ButtonSuccess, ButtonWarning, LinkSuccess, TermsOfService, WalletAction } from '../components/styled';
import {
  acceptWithdrawal, getExchangeWithdrawalInfo, getWithdrawalDetailsForUri, onUpdateNotification
} from "../wxApi";
import { h } from 'preact';

interface Props {
  talerWithdrawUri?: string;
}

export interface ViewProps {
  details: ExchangeWithdrawDetails;
  amount: string;
  onWithdraw: () => Promise<void>;
  // setCancelled: (b: boolean) => void;
  // setSelecting: (b: boolean) => void;
  onReview: (b: boolean) => void;
  onAccept: (b: boolean) => void;
  reviewing: boolean;
  accepted: boolean;
  terms: {
    value?: TermsDocument;
    status: TermsStatus;
  }

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

function amountToString(text: AmountLike) {
  const aj = Amounts.jsonifyAmount(text)
  const amount = Amounts.stringifyValue(aj)
  return `${amount} ${aj.currency}`
}

export function View({ details, amount, onWithdraw, terms, reviewing, onReview, onAccept, accepted }: ViewProps) {
  const needsReview = terms.status === 'changed' || terms.status === 'new'

  return (
    <WalletAction style={{ textAlign: 'center' }}>
      <LogoHeader />
      <h2>
        {i18n.str`Digital cash withdrawal`}
      </h2>
      <section>
        <div>
          <Part title="Total to withdraw" text={amountToString(Amounts.sub(Amounts.parseOrThrow(amount), details.withdrawFee).amount)} kind='positive' />
          <Part title="Chosen amount" text={amountToString(amount)} kind='neutral' />
          {Amounts.isNonZero(details.withdrawFee) &&
            <Part title="Exchange fee" text={amountToString(details.withdrawFee)} kind='negative' />
          }
          <Part title="Exchange" text={details.exchangeInfo.baseUrl} kind='neutral' big />
        </div>
      </section>
      {!reviewing &&
        <section>
          <LinkSuccess
            upperCased
          >
            {i18n.str`Edit exchange`}
          </LinkSuccess>
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
          <div>
            <CheckboxOutlined
              name="terms"
              enabled={accepted}
              label={i18n.str`I accept the exchange terms of service`}
              onToggle={() => {
                onAccept(!accepted)
                onReview(false)
              }}
            />
          </div>
        </section>
      }

      <section>
        {terms.status === 'new' && !accepted &&
          <div>
            <ButtonSuccess
              upperCased
              disabled={!details.exchangeInfo.baseUrl}
              onClick={() => onReview(true)}
            >
              {i18n.str`Review exchange terms of service`}
            </ButtonSuccess>
          </div>
        }
        {terms.status === 'changed' && !accepted &&
          <div>
            <ButtonWarning
              upperCased
              disabled={!details.exchangeInfo.baseUrl}
              onClick={() => onReview(true)}
            >
              {i18n.str`Review new version of terms of service`}
            </ButtonWarning>
          </div>
        }
        {(terms.status === 'accepted' || (needsReview && accepted)) &&
          <div>
            <ButtonSuccess
              upperCased
              disabled={!details.exchangeInfo.baseUrl}
              onClick={onWithdraw}
            >
              {i18n.str`Confirm withdrawal`}
            </ButtonSuccess>
          </div>
        }
        {terms.status === 'notfound' &&
          <div>
            <ButtonDestructive
              upperCased
              disabled={true}
            >
              {i18n.str`Exchange doesn't have terms of service`}
            </ButtonDestructive>
          </div>
        }
      </section>
    </WalletAction>
  )
}

export function WithdrawPage({ talerWithdrawUri, ...rest }: Props): JSX.Element {
  const [uriInfo, setUriInfo] = useState<WithdrawUriInfoResponse | undefined>(undefined);
  const [details, setDetails] = useState<ExchangeWithdrawDetails | undefined>(undefined);
  const [cancelled, setCancelled] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<boolean>(false);
  const [updateCounter, setUpdateCounter] = useState(1);
  const [reviewing, setReviewing] = useState<boolean>(false)
  const [accepted, setAccepted] = useState<boolean>(false)

  useEffect(() => {
    return onUpdateNotification(() => {
      console.log('updating...')
      setUpdateCounter(updateCounter + 1);
    });
  }, []);

  useEffect(() => {
    console.log('on effect yes', talerWithdrawUri)
    if (!talerWithdrawUri) return
    const fetchData = async (): Promise<void> => {
      try {
        const res = await getWithdrawalDetailsForUri({ talerWithdrawUri });
        setUriInfo(res);
      } catch (e) {
        console.error('error', JSON.stringify(e, undefined, 2))
        setError(true)
      }
    };
    fetchData();
  }, [selecting, talerWithdrawUri, updateCounter]);

  useEffect(() => {
    async function fetchData() {
      if (!uriInfo || !uriInfo.defaultExchangeBaseUrl) return
      const res = await getExchangeWithdrawalInfo({
        exchangeBaseUrl: uriInfo.defaultExchangeBaseUrl,
        amount: Amounts.parseOrThrow(uriInfo.amount)
      })
      setDetails(res)
    }
    fetchData()
  }, [uriInfo])

  if (!talerWithdrawUri) {
    return <span><i18n.Translate>missing withdraw uri</i18n.Translate></span>;
  }

  const onWithdraw = async (): Promise<void> => {
    if (!details) {
      throw Error("can't accept, no exchange selected");
    }
    console.log("accepting exchange", details.exchangeInfo.baseUrl);
    const res = await acceptWithdrawal(talerWithdrawUri, details.exchangeInfo.baseUrl);
    console.log("accept withdrawal response", res);
    if (res.confirmTransferUrl) {
      document.location.href = res.confirmTransferUrl;
    }
  };

  if (cancelled) {
    return <span><i18n.Translate>Withdraw operation has been cancelled.</i18n.Translate></span>;
  }
  if (error) {
    return <span><i18n.Translate>This URI is not valid anymore.</i18n.Translate></span>;
  }
  if (!uriInfo) {
    return <span><i18n.Translate>Loading...</i18n.Translate></span>;
  }
  if (!details) {
    return <span><i18n.Translate>Getting withdrawal details.</i18n.Translate></span>;
  }

  return <View onWithdraw={onWithdraw}
    // setCancelled={setCancelled} setSelecting={setSelecting}
    details={details} amount={uriInfo.amount}
    terms={{} as any}
    accepted={accepted} onAccept={setAccepted}
    reviewing={reviewing} onReview={setReviewing}
  // terms={[]}
  />
}

