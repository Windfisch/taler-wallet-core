import { h, VNode } from "preact";
import { ButtonBoxWarning, WarningBox } from "../components/styled";
import { useTranslationContext } from "../context/translation";

export function NoBalanceHelp({
  goToWalletManualWithdraw,
}: {
  goToWalletManualWithdraw: () => void;
}): VNode {
  const { i18n } = useTranslationContext();
  return (
    <WarningBox>
      <p>
        <b>
          <i18n.Translate>You have no balance to show.</i18n.Translate>
        </b>
        <br />
        <i18n.Translate>
          To withdraw money you can start from your bank site or click the
          "withdraw" button to use a known exchange.
        </i18n.Translate>
      </p>
      <ButtonBoxWarning onClick={() => goToWalletManualWithdraw()}>
        <i18n.Translate>Withdraw</i18n.Translate>
      </ButtonBoxWarning>
    </WarningBox>
  );
}
