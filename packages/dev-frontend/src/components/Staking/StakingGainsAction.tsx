import { Button } from "theme-ui";

import { BeraBorrowStoreState } from "@beraborrow/lib-base";
import { useBeraBorrowSelector } from "@beraborrow/lib-react";

import { useBeraBorrow } from "../../hooks/BeraBorrowContext";
import { useTransactionFunction } from "../Transaction";

const selectPOLLENStake = ({ pollenStake }: BeraBorrowStoreState) => pollenStake;

export const StakingGainsAction: React.FC = () => {
  const { beraborrow } = useBeraBorrow();
  const { collateralGain, nectGain } = useBeraBorrowSelector(selectPOLLENStake);

  const [sendTransaction] = useTransactionFunction(
    "stake",
    beraborrow.send.withdrawGainsFromStaking.bind(beraborrow.send)
  );

  return (
    <Button onClick={sendTransaction} disabled={collateralGain.isZero && nectGain.isZero}>
      Claim gains
    </Button>
  );
};
