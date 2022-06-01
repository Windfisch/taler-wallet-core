import { css } from "@linaria/core";
import { Fragment, h, VNode } from "preact";
import { Alert } from "../mui/Alert.js";
import { Button } from "../mui/Button.js";
import { Paper } from "../mui/Paper.js";
import { Typography } from "../mui/Typography.js";

export function NoBalanceHelp({
  goToWalletManualWithdraw,
}: {
  goToWalletManualWithdraw: () => Promise<void>;
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
          onClick={goToWalletManualWithdraw}
        >
          <Typography>Withdraw</Typography>
        </Button>
      </Alert>
    </Paper>
  );
}
