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
          <i18n.Translate>You have no balance.</i18n.Translate>
        </b>
        {" "}
        <i18n.Translate>Withdraw some funds into your wallet.</i18n.Translate>
      </p>
      <ButtonBoxWarning onClick={() => goToWalletManualWithdraw()}>
        <i18n.Translate>Withdraw</i18n.Translate>
      </ButtonBoxWarning>
    </WarningBox>
  );
}
