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
import { css } from "@linaria/core";
import { Fragment, h, VNode } from "preact";
import { useTranslationContext } from "../context/translation.js";
import { Alert } from "../mui/Alert.js";
import { Button } from "../mui/Button.js";
import { ButtonHandler } from "../mui/handlers.js";
import { Paper } from "../mui/Paper.js";

const margin = css`
  margin: 1em;
`;

export function NoBalanceHelp({
  goToWalletManualWithdraw,
}: {
  goToWalletManualWithdraw: ButtonHandler;
}): VNode {
  const { i18n } = useTranslationContext();
  return (
    <Paper class={margin}>
      <Alert title="Your wallet is empty." severity="info">
        <Button
          fullWidth
          color="info"
          variant="outlined"
          onClick={goToWalletManualWithdraw.onClick}
        >
          <i18n.Translate>Get digital cash</i18n.Translate>
        </Button>
      </Alert>
    </Paper>
  );
}
