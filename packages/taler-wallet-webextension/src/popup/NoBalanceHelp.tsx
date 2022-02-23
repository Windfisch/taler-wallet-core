import { Translate } from "@gnu-taler/taler-util";
import { h, VNode } from "preact";
import { ButtonBoxWarning, WarningBox } from "../components/styled";

export function NoBalanceHelp({
  goToWalletManualWithdraw,
}: {
  goToWalletManualWithdraw: () => void;
}): VNode {
  return (
    <WarningBox>
      <p>
        <b>
          <Translate>You have no balance to show.</Translate>
        </b>
        <br />
        <Translate>
          To withdraw money you can start from your bank site or click the
          "withdraw" button to use a known exchange.
        </Translate>
      </p>
      <ButtonBoxWarning onClick={() => goToWalletManualWithdraw()}>
        <Translate>Withdraw</Translate>
      </ButtonBoxWarning>
    </WarningBox>
  );
}
