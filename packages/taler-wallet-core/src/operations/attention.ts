/*
 This file is part of GNU Taler
 (C) 2019 GNUnet e.V.

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
 * Imports.
 */
import {
  AbsoluteTime,
  AttentionInfo,
  Logger,
  TalerProtocolTimestamp,
  UserAttentionByIdRequest,
  UserAttentionPriority,
  UserAttentionsCountResponse,
  UserAttentionsRequest,
  UserAttentionsResponse,
  UserAttentionUnreadList,
} from "@gnu-taler/taler-util";
import { InternalWalletState } from "../internal-wallet-state.js";

const logger = new Logger("operations/attention.ts");

export async function getUserAttentionsUnreadCount(
  ws: InternalWalletState,
  req: UserAttentionsRequest,
): Promise<UserAttentionsCountResponse> {
  const total = await ws.db
    .mktx((x) => [x.userAttention])
    .runReadOnly(async (tx) => {
      let count = 0;
      await tx.userAttention.iter().forEach((x) => {
        if (
          req.priority !== undefined &&
          UserAttentionPriority[x.info.type] !== req.priority
        )
          return;
        if (x.read !== undefined) return;
        count++;
      });

      return count;
    });

  return { total };
}

export async function getUserAttentions(
  ws: InternalWalletState,
  req: UserAttentionsRequest,
): Promise<UserAttentionsResponse> {
  return await ws.db
    .mktx((x) => [x.userAttention])
    .runReadOnly(async (tx) => {
      const pending: UserAttentionUnreadList = [];
      await tx.userAttention.iter().forEach((x) => {
        if (
          req.priority !== undefined &&
          UserAttentionPriority[x.info.type] !== req.priority
        )
          return;
        pending.push({
          info: x.info,
          when: {
            t_ms: x.createdMs,
          },
          read: x.read !== undefined,
        });
      });

      return { pending };
    });
}

export async function markAttentionRequestAsRead(
  ws: InternalWalletState,
  req: UserAttentionByIdRequest,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.userAttention])
    .runReadWrite(async (tx) => {
      const ua = await tx.userAttention.get([req.entityId, req.type]);
      if (!ua) throw Error("attention request not found");
      tx.userAttention.put({
        ...ua,
        read: TalerProtocolTimestamp.now(),
      });
    });
}

/**
 * the wallet need the user attention to complete a task
 * internal API
 *
 * @param ws
 * @param info
 */
export async function addAttentionRequest(
  ws: InternalWalletState,
  info: AttentionInfo,
  entityId: string,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.userAttention])
    .runReadWrite(async (tx) => {
      await tx.userAttention.put({
        info,
        entityId,
        createdMs: AbsoluteTime.now().t_ms as number,
        read: undefined,
      });
    });
}

/**
 * user completed the task, attention request is not needed
 * internal API
 *
 * @param ws
 * @param created
 */
export async function removeAttentionRequest(
  ws: InternalWalletState,
  req: UserAttentionByIdRequest,
): Promise<void> {
  await ws.db
    .mktx((x) => [x.userAttention])
    .runReadWrite(async (tx) => {
      const ua = await tx.userAttention.get([req.entityId, req.type]);
      if (!ua) throw Error("attention request not found");
      await tx.userAttention.delete([req.entityId, req.type]);
    });
}
