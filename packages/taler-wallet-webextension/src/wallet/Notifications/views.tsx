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
  AbsoluteTime,
  AttentionInfo,
  AttentionType,
} from "@gnu-taler/taler-util";
import { Fragment, h, VNode } from "preact";
import { LoadingError } from "../../components/LoadingError.js";
import {
  Column,
  DateSeparator,
  HistoryRow,
  LargeText,
  SmallLightText,
} from "../../components/styled/index.js";
import { Time } from "../../components/Time.js";
import { useTranslationContext } from "../../context/translation.js";
import { Avatar } from "../../mui/Avatar.js";
import { Button } from "../../mui/Button.js";
import { Grid } from "../../mui/Grid.js";
import { Pages } from "../../NavigationBar.js";
import { assertUnreachable } from "../../utils/index.js";
import { State } from "./index.js";

export function LoadingUriView({ error }: State.LoadingUriError): VNode {
  const { i18n } = useTranslationContext();

  return (
    <LoadingError
      title={<i18n.Translate>Could not load notifications</i18n.Translate>}
      error={error}
    />
  );
}

const term = 1000 * 60 * 60 * 24;
function normalizeToDay(x: number): number {
  return Math.round(x / term) * term;
}

export function ReadyView({ list }: State.Ready): VNode {
  const { i18n } = useTranslationContext();
  if (list.length < 1) {
    return (
      <section>
        <i18n.Translate>No notification left</i18n.Translate>
      </section>
    );
  }

  const byDate = list.reduce((rv, x) => {
    const theDate = x.when.t_ms === "never" ? 0 : normalizeToDay(x.when.t_ms);
    if (theDate) {
      (rv[theDate] = rv[theDate] || []).push(x);
    }

    return rv;
  }, {} as { [x: string]: typeof list });
  const datesWithNotifications = Object.keys(byDate);

  return (
    <section>
      {datesWithNotifications.map((d, i) => {
        return (
          <Fragment key={i}>
            <DateSeparator>
              <Time
                timestamp={{ t_ms: Number.parseInt(d, 10) }}
                format="dd MMMM yyyy"
              />
            </DateSeparator>
            {byDate[d].map((n, i) => (
              <NotificationItem
                key={i}
                info={n.info}
                isRead={n.read}
                timestamp={n.when}
              />
            ))}
          </Fragment>
        );
      })}
    </section>
  );
}

function NotificationItem({
  info,
  isRead,
  timestamp,
}: {
  info: AttentionInfo;
  timestamp: AbsoluteTime;
  isRead: boolean;
}): VNode {
  switch (info.type) {
    case AttentionType.KycWithdrawal:
      return (
        <NotificationLayout
          timestamp={timestamp}
          href={Pages.balanceTransaction({ tid: info.transactionId })}
          title="Withdrawal on hold"
          subtitle="Know-your-customer validation is required"
          iconPath={"K"}
          isRead={isRead}
        />
      );
    case AttentionType.MerchantRefund:
      return (
        <NotificationLayout
          timestamp={timestamp}
          href={Pages.balanceTransaction({ tid: info.transactionId })}
          title="Merchant has refund your payment"
          subtitle="Accept or deny refund"
          iconPath={"K"}
          isRead={isRead}
        />
      );
    case AttentionType.BackupUnpaid:
      return (
        <NotificationLayout
          timestamp={timestamp}
          href={`${Pages.ctaPay}?talerPayUri=${info.talerUri}`}
          title="Backup provider is unpaid"
          subtitle="Complete the payment or remove the service provider"
          iconPath={"K"}
          isRead={isRead}
        />
      );
    case AttentionType.AuditorDenominationsExpires:
      return <div>not implemented</div>;
    case AttentionType.AuditorKeyExpires:
      return <div>not implemented</div>;
    case AttentionType.AuditorTosChanged:
      return <div>not implemented</div>;
    case AttentionType.ExchangeDenominationsExpired:
      return <div>not implemented</div>;
    // case AttentionType.ExchangeDenominationsExpiresSoon:
    //   return <div>not implemented</div>;
    case AttentionType.ExchangeKeyExpired:
      return <div>not implemented</div>;
    // case AttentionType.ExchangeKeyExpiresSoon:
    //   return <div>not implemented</div>;
    case AttentionType.ExchangeTosChanged:
      return <div>not implemented</div>;
    case AttentionType.BackupExpiresSoon:
      return <div>not implemented</div>;
    case AttentionType.PushPaymentReceived:
      return <div>not implemented</div>;
    case AttentionType.PullPaymentPaid:
      return <div>not implemented</div>;
    default:
      assertUnreachable(info);
  }
}

function NotificationLayout(props: {
  title: string;
  href: string;
  subtitle?: string;
  timestamp: AbsoluteTime;
  iconPath: string;
  isRead: boolean;
}): VNode {
  const { i18n } = useTranslationContext();
  return (
    <HistoryRow
      href={props.href}
      style={{
        backgroundColor: props.isRead ? "lightcyan" : "inherit",
        alignItems: "center",
      }}
    >
      <Avatar
        style={{
          border: "solid gray 1px",
          color: "gray",
          boxSizing: "border-box",
        }}
      >
        {props.iconPath}
      </Avatar>
      <Column>
        <LargeText>
          <div>{props.title}</div>
          {props.subtitle && (
            <div style={{ color: "gray", fontSize: "medium", marginTop: 5 }}>
              {props.subtitle}
            </div>
          )}
        </LargeText>
        <SmallLightText style={{ marginTop: 5 }}>
          <Time timestamp={props.timestamp} format="HH:mm" />
        </SmallLightText>
      </Column>
      <Column>
        <Grid>
          <Button variant="outlined">
            <i18n.Translate>Ignore</i18n.Translate>
          </Button>
        </Grid>
      </Column>
    </HistoryRow>
  );
}
