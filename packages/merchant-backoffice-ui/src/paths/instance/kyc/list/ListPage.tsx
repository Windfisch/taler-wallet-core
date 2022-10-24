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

import { h, VNode } from "preact";
import { MerchantBackend } from "../../../../declaration";
import { Translate, useTranslator } from "../../../../i18n";

export interface Props {
  status: MerchantBackend.Instances.AccountKycRedirects;
}

export function ListPage({ status }: Props): VNode {
  const i18n = useTranslator();

  return (
    <section class="section is-main-section">
      <div class="card has-table">
        <header class="card-header">
          <p class="card-header-title">
            <span class="icon">
              <i class="mdi mdi-clock" />
            </span>
            <Translate>Pending KYC verification</Translate>
          </p>

          <div class="card-header-icon" aria-label="more options" />
        </header>
        <div class="card-content">
          <div class="b-table has-pagination">
            <div class="table-wrapper has-mobile-cards">
              {status.pending_kycs.length > 0 ? (
                <PendingTable entries={status.pending_kycs} />
              ) : (
                <EmptyTable />
              )}
            </div>
          </div>
        </div>
      </div>

      {status.timeout_kycs.length > 0 ? (
        <div class="card has-table">
          <header class="card-header">
            <p class="card-header-title">
              <span class="icon">
                <i class="mdi mdi-clock" />
              </span>
              <Translate>Timed out</Translate>
            </p>

            <div class="card-header-icon" aria-label="more options" />
          </header>
          <div class="card-content">
            <div class="b-table has-pagination">
              <div class="table-wrapper has-mobile-cards">
                {status.timeout_kycs.length > 0 ? (
                  <TimedOutTable entries={status.timeout_kycs} />
                ) : (
                  <EmptyTable />
                )}
              </div>
            </div>
          </div>
        </div>
      ) : undefined}
    </section>
  );
}
interface PendingTableProps {
  entries: MerchantBackend.Instances.MerchantAccountKycRedirect[];
}

interface TimedOutTableProps {
  entries: MerchantBackend.Instances.ExchangeKycTimeout[];
}

function PendingTable({ entries }: PendingTableProps): VNode {
  return (
    <div class="table-container">
      <table class="table is-striped is-hoverable is-fullwidth">
        <thead>
          <tr>
            <th>
              <Translate>Exchange</Translate>
            </th>
            <th>
              <Translate>Target account</Translate>
            </th>
            <th>
              <Translate>KYC URL</Translate>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            return (
              <tr key={i}>
                <td>{e.exchange_url}</td>
                <td>{e.payto_uri}</td>
                <td>
                  <a href={e.kyc_url} target="_black" rel="noreferrer">
                    {e.kyc_url}
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TimedOutTable({ entries }: TimedOutTableProps): VNode {
  return (
    <div class="table-container">
      <table class="table is-striped is-hoverable is-fullwidth">
        <thead>
          <tr>
            <th>
              <Translate>Exchange</Translate>
            </th>
            <th>
              <Translate>Code</Translate>
            </th>
            <th>
              <Translate>Http Status</Translate>
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => {
            return (
              <tr key={i}>
                <td>{e.exchange_url}</td>
                <td>{e.exchange_code}</td>
                <td>{e.exchange_http_status}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function EmptyTable(): VNode {
  return (
    <div class="content has-text-grey has-text-centered">
      <p>
        <span class="icon is-large">
          <i class="mdi mdi-emoticon-happy mdi-48px" />
        </span>
      </p>
      <p>
        <Translate>No pending kyc verification!</Translate>
      </p>
    </div>
  );
}
