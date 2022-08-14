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
import { Alert } from "../mui/Alert.js";
import { Button } from "../mui/Button.js";
import { ButtonHandler } from "../mui/handlers.js";
import { Paper } from "../mui/Paper.js";
import { Typography } from "../mui/Typography.js";

export function NoBalanceHelp({
  goToWalletManualWithdraw,
}: {
  goToWalletManualWithdraw: ButtonHandler;
}): VNode {
  return (
    <Paper
      class={css`
        margin: 1em;
      `}
    >
      <Alert title="You have no balance." severity="warning">
        <Typography>Withdraw some funds into your wallet.</Typography>
        <Button
          fullWidth
          color="warning"
          variant="outlined"
          onClick={goToWalletManualWithdraw.onClick}
        >
          <Typography>Get digital cash</Typography>
        </Button>
      </Alert>
    </Paper>
  );
}
