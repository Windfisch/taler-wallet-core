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

import {
  Amounts,
  FeeDescription,
  FeeDescriptionPair,
} from "@gnu-taler/taler-util";
import { styled } from "@linaria/react";
import { Fragment, h, VNode } from "preact";
import { useState } from "preact/hooks";
import { Amount } from "../../components/Amount.js";
import { LoadingError } from "../../components/LoadingError.js";
import { SelectList } from "../../components/SelectList.js";
import { Input, LinkPrimary, SvgIcon } from "../../components/styled/index.js";
import { Time } from "../../components/Time.js";
import { useTranslationContext } from "../../context/translation.js";
import { Button } from "../../mui/Button.js";
import arrowDown from "../../svg/chevron-down.svg";
import { State } from "./index.js";

const ButtonGroup = styled.div`
  & > button {
    margin-left: 8px;
    margin-right: 8px;
  }
`;

const FeeDescriptionTable = styled.table`
  & {
    margin-bottom: 20px;
    width: 100%;
    border-collapse: collapse;
  }
  td {
    padding: 8px;
  }
  td.fee {
    text-align: center;
  }
  th.fee {
    text-align: center;
  }
  td.value {
    text-align: right;
    width: 1%;
    white-space: nowrap;
  }
  td.icon {
    width: 24px;
  }
  td.icon > div {
    width: 24px;
    height: 24px;
    margin: 0px;
  }
  td.expiration {
    text-align: center;
  }

  tr[data-main="true"] {
    background-color: #add8e662;
  }
  tr[data-main="true"] > td.value,
  tr[data-main="true"] > td.expiration,
  tr[data-main="true"] > td.fee {
    border-bottom: lightgray solid 1px;
  }
  tr[data-hidden="true"] {
    display: none;
  }
  tbody > tr.value[data-hasMore="true"],
  tbody > tr.value[data-hasMore="true"] > td {
    cursor: pointer;
  }
  th {
    position: sticky;
    top: 0;
    background-color: white;
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  & > * {
    margin-bottom: 20px;
  }
`;

export function ErrorLoadingView({ error }: State.LoadingUriError): VNode {
  const { i18n } = useTranslationContext();

  return (
    <LoadingError
      title={<i18n.Translate>Could not load tip status</i18n.Translate>}
      error={error}
    />
  );
}

export function NoExchangesView(state: State.NoExchanges): VNode {
  const { i18n } = useTranslationContext();
  return (
    <div>
      <i18n.Translate>no exchanges</i18n.Translate>
    </div>
  );
}

export function ComparingView({
  exchanges,
  selected,
  onReset,
  onSelect,
  pairTimeline,
}: State.Comparing): VNode {
  const { i18n } = useTranslationContext();
  return (
    <Container>
      <h2>
        <i18n.Translate>Service fee description</i18n.Translate>
      </h2>

      <section>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p>
            <Input>
              <SelectList
                label={
                  <i18n.Translate>
                    Select {selected.currency} exchange
                  </i18n.Translate>
                }
                list={exchanges.list}
                name="lang"
                value={exchanges.value}
                onChange={exchanges.onChange}
              />
            </Input>
          </p>
          <ButtonGroup>
            <Button variant="outlined" onClick={onReset.onClick}>
              <i18n.Translate>Reset</i18n.Translate>
            </Button>
            <Button variant="contained" onClick={onSelect.onClick}>
              <i18n.Translate>Use this exchange</i18n.Translate>
            </Button>
          </ButtonGroup>
        </div>
      </section>
      <section>
        <dl>
          <dt>
            <i18n.Translate>Auditors</i18n.Translate>
          </dt>
          {selected.auditors.length === 0 ? (
            <dd style={{ color: "red" }}>
              <i18n.Translate>Doesn&apos;t have auditors</i18n.Translate>
            </dd>
          ) : (
            selected.auditors.map((a) => {
              <dd>{a.auditor_url}</dd>;
            })
          )}
        </dl>
        <table>
          <tr>
            <td>
              <i18n.Translate>currency</i18n.Translate>
            </td>
            <td>{selected.currency}</td>
          </tr>
        </table>
      </section>
      <section>
        <h2>
          <i18n.Translate>Operations</i18n.Translate>
        </h2>
        <p>
          <i18n.Translate>Deposits</i18n.Translate>
        </p>
        <FeeDescriptionTable>
          <thead>
            <tr>
              <th>&nbsp;</th>
              <th>
                <i18n.Translate>Denomination</i18n.Translate>
              </th>
              <th class="fee">
                <i18n.Translate>Fee</i18n.Translate>
              </th>
              <th>
                <i18n.Translate>Until</i18n.Translate>
              </th>
            </tr>
          </thead>
          <tbody>
            <RenderFeePairByValue list={pairTimeline.deposit} />
          </tbody>
        </FeeDescriptionTable>
        <p>
          <i18n.Translate>Withdrawals</i18n.Translate>
        </p>
        <FeeDescriptionTable>
          <thead>
            <tr>
              <th>&nbsp;</th>
              <th>
                <i18n.Translate>Denomination</i18n.Translate>
              </th>
              <th class="fee">
                <i18n.Translate>Fee</i18n.Translate>
              </th>
              <th>
                <i18n.Translate>Until</i18n.Translate>
              </th>
            </tr>
          </thead>
          <tbody>
            <RenderFeePairByValue list={pairTimeline.withdraw} />
          </tbody>
        </FeeDescriptionTable>
        <p>
          <i18n.Translate>Refunds</i18n.Translate>
        </p>
        <FeeDescriptionTable>
          <thead>
            <tr>
              <th>&nbsp;</th>
              <th>
                <i18n.Translate>Denomination</i18n.Translate>
              </th>
              <th class="fee">
                <i18n.Translate>Fee</i18n.Translate>
              </th>
              <th>
                <i18n.Translate>Until</i18n.Translate>
              </th>
            </tr>
          </thead>
          <tbody>
            <RenderFeePairByValue list={pairTimeline.refund} />
          </tbody>
        </FeeDescriptionTable>{" "}
        <p>
          <i18n.Translate>Refresh</i18n.Translate>
        </p>
        <FeeDescriptionTable>
          <thead>
            <tr>
              <th>&nbsp;</th>
              <th>
                <i18n.Translate>Denomination</i18n.Translate>
              </th>
              <th class="fee">
                <i18n.Translate>Fee</i18n.Translate>
              </th>
              <th>
                <i18n.Translate>Until</i18n.Translate>
              </th>
            </tr>
          </thead>
          <tbody>
            <RenderFeePairByValue list={pairTimeline.refresh} />
          </tbody>
        </FeeDescriptionTable>{" "}
      </section>
      <section>
        <table>
          <thead>
            <tr>
              <td>
                <i18n.Translate>Wallet operations</i18n.Translate>
              </td>
              <td>
                <i18n.Translate>Fee</i18n.Translate>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>history(i) </td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>kyc (i) </td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>account (i) </td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>purse (i) </td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>wire SEPA (i) </td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>closing SEPA(i) </td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>wad SEPA (i) </td>
              <td>0.1</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <ButtonGroup>
          <LinkPrimary>Privacy policy</LinkPrimary>
          <LinkPrimary>Terms of service</LinkPrimary>
        </ButtonGroup>
      </section>
    </Container>
  );
}

export function ReadyView({
  exchanges,
  selected,
  onClose,
  timeline,
}: State.Ready): VNode {
  const { i18n } = useTranslationContext();

  return (
    <Container>
      <h2>
        <i18n.Translate>Service fee description</i18n.Translate>
      </h2>

      <section>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <p>
            <Input>
              <SelectList
                label={
                  <i18n.Translate>
                    Select {selected.currency} exchange
                  </i18n.Translate>
                }
                list={exchanges.list}
                name="lang"
                value={exchanges.value}
                onChange={exchanges.onChange}
              />
            </Input>
          </p>
          <Button variant="outlined" onClick={onClose.onClick}>
            <i18n.Translate>Close</i18n.Translate>
          </Button>
        </div>
      </section>
      <section>
        <dl>
          <dt>Auditors</dt>
          {selected.auditors.length === 0 ? (
            <dd style={{ color: "red" }}>
              <i18n.Translate>Doesn&apos;t have auditors</i18n.Translate>
            </dd>
          ) : (
            selected.auditors.map((a) => {
              <dd>{a.auditor_url}</dd>;
            })
          )}
        </dl>
        <table>
          <tr>
            <td>
              <i18n.Translate>currency</i18n.Translate>
            </td>
            <td>{selected.currency}</td>
          </tr>
        </table>
      </section>
      <section>
        <h2>
          <i18n.Translate>Operations</i18n.Translate>
        </h2>
        <p>
          <i18n.Translate>Deposits</i18n.Translate>
        </p>
        <FeeDescriptionTable>
          <thead>
            <tr>
              <th>&nbsp;</th>
              <th>
                <i18n.Translate>Denomination</i18n.Translate>
              </th>
              <th class="fee">
                <i18n.Translate>Fee</i18n.Translate>
              </th>
              <th>
                <i18n.Translate>Until</i18n.Translate>
              </th>
            </tr>
          </thead>
          <tbody>
            <RenderFeeDescriptionByValue first={timeline.deposit} />
          </tbody>
        </FeeDescriptionTable>
        <p>
          <i18n.Translate>Withdrawals</i18n.Translate>
        </p>
        <FeeDescriptionTable>
          <thead>
            <tr>
              <th>&nbsp;</th>
              <th>
                <i18n.Translate>Denomination</i18n.Translate>
              </th>
              <th class="fee">
                <i18n.Translate>Fee</i18n.Translate>
              </th>
              <th>
                <i18n.Translate>Until</i18n.Translate>
              </th>
            </tr>
          </thead>
          <tbody>
            <RenderFeeDescriptionByValue first={timeline.withdraw} />
          </tbody>
        </FeeDescriptionTable>
        <p>
          <i18n.Translate>Refunds</i18n.Translate>
        </p>
        <FeeDescriptionTable>
          <thead>
            <tr>
              <th>&nbsp;</th>
              <th>
                <i18n.Translate>Denomination</i18n.Translate>
              </th>
              <th class="fee">
                <i18n.Translate>Fee</i18n.Translate>
              </th>
              <th>
                <i18n.Translate>Until</i18n.Translate>
              </th>
            </tr>
          </thead>
          <tbody>
            <RenderFeeDescriptionByValue first={timeline.refund} />
          </tbody>
        </FeeDescriptionTable>{" "}
        <p>
          <i18n.Translate>Refresh</i18n.Translate>
        </p>
        <FeeDescriptionTable>
          <thead>
            <tr>
              <th>&nbsp;</th>
              <th>
                <i18n.Translate>Denomination</i18n.Translate>
              </th>
              <th class="fee">
                <i18n.Translate>Fee</i18n.Translate>
              </th>
              <th>
                <i18n.Translate>Until</i18n.Translate>
              </th>
            </tr>
          </thead>
          <tbody>
            <RenderFeeDescriptionByValue first={timeline.refresh} />
          </tbody>
        </FeeDescriptionTable>{" "}
      </section>
      <section>
        <table>
          <thead>
            <tr>
              <td>
                <i18n.Translate>Wallet operations</i18n.Translate>
              </td>
              <td>
                <i18n.Translate>Fee</i18n.Translate>
              </td>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>history(i) </td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>kyc (i) </td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>account (i) </td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>purse (i) </td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>wire SEPA (i) </td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>closing SEPA(i) </td>
              <td>0.1</td>
            </tr>
            <tr>
              <td>wad SEPA (i) </td>
              <td>0.1</td>
            </tr>
          </tbody>
        </table>
      </section>
      <section>
        <ButtonGroup>
          <LinkPrimary>Privacy policy</LinkPrimary>
          <LinkPrimary>Terms of service</LinkPrimary>
        </ButtonGroup>
      </section>
    </Container>
  );
}

function FeeDescriptionRowsGroup({
  infos,
}: {
  infos: FeeDescription[];
}): VNode {
  const [expanded, setExpand] = useState(false);
  const hasMoreInfo = infos.length > 1;
  return (
    <Fragment>
      {infos.map((info, idx) => {
        const main = idx === 0;
        return (
          <tr
            key={idx}
            class="value"
            data-hasMore={!hasMoreInfo}
            data-main={main}
            data-hidden={!main && !expanded}
            onClick={() => setExpand((p) => !p)}
          >
            <td class="icon">
              {hasMoreInfo && main ? (
                <SvgIcon
                  title="Select this contact"
                  dangerouslySetInnerHTML={{ __html: arrowDown }}
                  color="currentColor"
                  transform={expanded ? "" : "rotate(-90deg)"}
                />
              ) : undefined}
            </td>
            <td class="value">
              {main ? <Amount value={info.value} hideCurrency /> : ""}
            </td>
            {info.fee ? (
              <td class="fee">{<Amount value={info.fee} hideCurrency />}</td>
            ) : undefined}
            <td class="expiration">
              <Time timestamp={info.until} format="dd-MMM-yyyy" />
            </td>
          </tr>
        );
      })}
    </Fragment>
  );
}

function FeePairRowsGroup({ infos }: { infos: FeeDescriptionPair[] }): VNode {
  const [expanded, setExpand] = useState(false);
  const hasMoreInfo = infos.length > 1;
  return (
    <Fragment>
      {infos.map((info, idx) => {
        const main = idx === 0;
        return (
          <tr
            key={idx}
            class="value"
            data-hasMore={!hasMoreInfo}
            data-main={main}
            data-hidden={!main && !expanded}
            onClick={() => setExpand((p) => !p)}
          >
            <td class="icon">
              {hasMoreInfo && main ? (
                <SvgIcon
                  title="Select this contact"
                  dangerouslySetInnerHTML={{ __html: arrowDown }}
                  color="currentColor"
                  transform={expanded ? "" : "rotate(-90deg)"}
                />
              ) : undefined}
            </td>
            <td class="value">
              {main ? <Amount value={info.value} hideCurrency /> : ""}
            </td>
            {info.left ? (
              <td class="fee">{<Amount value={info.left} hideCurrency />}</td>
            ) : (
              <td class="fee"> --- </td>
            )}
            {info.right ? (
              <td class="fee">{<Amount value={info.right} hideCurrency />}</td>
            ) : (
              <td class="fee"> --- </td>
            )}
            <td class="expiration">
              <Time timestamp={info.until} format="dd-MMM-yyyy" />
            </td>
          </tr>
        );
      })}
    </Fragment>
  );
}

/**
 * Group by value and then render using FeePairRowsGroup
 * @param param0
 * @returns
 */
function RenderFeePairByValue({ list }: { list: FeeDescriptionPair[] }): VNode {
  return (
    <Fragment>
      {
        list.reduce(
          (prev, info, idx) => {
            const next = idx >= list.length - 1 ? undefined : list[idx + 1];

            const nextIsMoreInfo =
              next !== undefined && Amounts.cmp(next.value, info.value) === 0;

            prev.rows.push(info);

            if (nextIsMoreInfo) {
              return prev;
            }

            prev.rows = [];
            prev.views.push(<FeePairRowsGroup infos={prev.rows} />);
            return prev;
          },
          { rows: [], views: [] } as {
            rows: FeeDescriptionPair[];
            views: h.JSX.Element[];
          },
        ).views
      }
    </Fragment>
  );
}
/**
 *
 * Group by value and then render using FeeDescriptionRowsGroup
 * @param param0
 * @returns
 */
function RenderFeeDescriptionByValue({
  first,
}: {
  first: FeeDescription[];
}): VNode {
  return (
    <Fragment>
      {
        first.reduce(
          (prev, info, idx) => {
            const next = idx >= first.length - 1 ? undefined : first[idx + 1];

            const nextIsMoreInfo =
              next !== undefined && Amounts.cmp(next.value, info.value) === 0;

            prev.rows.push(info);

            if (nextIsMoreInfo) {
              return prev;
            }

            prev.rows = [];
            prev.views.push(<FeeDescriptionRowsGroup infos={prev.rows} />);
            return prev;
          },
          { rows: [], views: [] } as {
            rows: FeeDescription[];
            views: h.JSX.Element[];
          },
        ).views
      }
    </Fragment>
  );
}
