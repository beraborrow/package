import { Button } from "theme-ui";
import { Decimal, BeraBorrowStoreState, StabilityDepositChange } from "@beraborrow/lib-base";
import { useLiquitySelector } from "@beraborrow/lib-react";

import { useBeraBorrow } from "../../hooks/BeraBorrowContext";
import { useTransactionFunction } from "../Transaction";

type StabilityDepositActionProps = {
  transactionId: string;
  change: StabilityDepositChange<Decimal>;
};

const selectFrontendRegistered = ({ frontend }: BeraBorrowStoreState) =>
  frontend.status === "registered";

export const StabilityDepositAction: React.FC<StabilityDepositActionProps> = ({
  children,
  transactionId,
  change
}) => {
  const { config, beraborrow } = useBeraBorrow();
  const frontendRegistered = useLiquitySelector(selectFrontendRegistered);

  const frontendTag = frontendRegistered ? config.frontendTag : undefined;

  const [sendTransaction] = useTransactionFunction(
    transactionId,
    change.depositNECT
      ? beraborrow.send.depositNECTInStabilityPool.bind(beraborrow.send, change.depositNECT, frontendTag)
      : beraborrow.send.withdrawNECTFromStabilityPool.bind(beraborrow.send, change.withdrawNECT)
  );

  return <Button style={{width: "100%", marginTop: "16px", color: "#0B1722"}} onClick={sendTransaction}>{children}</Button>;
};
