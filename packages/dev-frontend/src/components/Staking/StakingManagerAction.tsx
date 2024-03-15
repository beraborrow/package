import { Button } from "theme-ui";

import { Decimal, POLLENStakeChange } from "@beraborrow/lib-base";

import { useBeraBorrow } from "../../hooks/BeraBorrowContext";
import { useTransactionFunction } from "../Transaction";

type StakingActionProps = {
  change: POLLENStakeChange<Decimal>;
};

export const StakingManagerAction: React.FC<StakingActionProps> = ({ change, children }) => {
  const { beraborrow } = useBeraBorrow();

  const [sendTransaction] = useTransactionFunction(
    "stake",
    change.stakePOLLEN
      ? beraborrow.send.stakePOLLEN.bind(beraborrow.send, change.stakePOLLEN)
      : beraborrow.send.unstakePOLLEN.bind(beraborrow.send, change.unstakePOLLEN)
  );

  return <Button onClick={sendTransaction}>{children}</Button>;
};
