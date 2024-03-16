import { Button } from "theme-ui";

import { Decimal, TroveChange } from "@beraborrow/lib-base";

import { useBeraBorrow } from "../../hooks/BeraBorrowContext";
import { useTransactionFunction } from "../Transaction";

type TroveActionProps = {
  transactionId: string;
  change: Exclude<TroveChange<Decimal>, { type: "invalidCreation" }>;
  maxBorrowingRate: Decimal;
  borrowingFeeDecayToleranceMinutes: number;
};

export const TroveAction: React.FC<TroveActionProps> = ({
  children,
  transactionId,
  change,
  maxBorrowingRate,
  borrowingFeeDecayToleranceMinutes
}) => {
  const { beraborrow } = useBeraBorrow();

  const [sendTransaction] = useTransactionFunction(
    transactionId,
    change.type === "creation"
      ? beraborrow.send.openTrove.bind(beraborrow.send, change.params, {
          maxBorrowingRate,
          borrowingFeeDecayToleranceMinutes
        })
      : change.type === "closure"
      ? beraborrow.send.closeTrove.bind(beraborrow.send)
      : beraborrow.send.adjustTrove.bind(beraborrow.send, change.params, {
          maxBorrowingRate,
          borrowingFeeDecayToleranceMinutes
        })
  );

  return <Button sx={{width: "100%", color: "#0B1722"}} onClick={sendTransaction}>{children}</Button>;
};
