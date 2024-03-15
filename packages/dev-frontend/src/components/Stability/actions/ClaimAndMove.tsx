import React from "react";
import { Button } from "theme-ui";
import { useBeraBorrow } from "../../../hooks/BeraBorrowContext";
import { useTransactionFunction } from "../../Transaction";

type ClaimAndMoveProps = {
  disabled?: boolean;
};

export const ClaimAndMove: React.FC<ClaimAndMoveProps> = ({ disabled, children }) => {
  const { beraborrow } = useBeraBorrow();

  const [sendTransaction] = useTransactionFunction(
    "stability-deposit",
    beraborrow.send.transferCollateralGainToTrove.bind(beraborrow.send)
  );

  return (
    <Button
      variant="outline"
      sx={{ mt: 3, width: "100%" }}
      onClick={sendTransaction}
      disabled={disabled}
    >
      {children}
    </Button>
  );
};
