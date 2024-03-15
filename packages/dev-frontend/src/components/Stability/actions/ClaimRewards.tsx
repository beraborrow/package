import React from "react";
import { Button } from "theme-ui";

import { useBeraBorrow } from "../../../hooks/BeraBorrowContext";
import { useTransactionFunction } from "../../Transaction";

type ClaimRewardsProps = {
  disabled?: boolean;
};

export const ClaimRewards: React.FC<ClaimRewardsProps> = ({ disabled, children }) => {
  const { beraborrow } = useBeraBorrow();

  const [sendTransaction] = useTransactionFunction(
    "stability-deposit",
    beraborrow.send.withdrawGainsFromStabilityPool.bind(beraborrow.send)
  );

  return (
    <Button onClick={sendTransaction} disabled={disabled}>
      {children}
    </Button>
  );
};
