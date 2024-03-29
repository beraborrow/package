import React, { useState } from "react";
import { Heading, Box, Card, Button } from "theme-ui";

import { Decimal, Decimalish, Difference, BeraBorrowStoreState, POLLENStake } from "@beraborrow/lib-base";
import { useBeraBorrowSelector } from "@beraborrow/lib-react";

import { COIN, GT } from "../../strings";

import { Icon } from "../Icon";
import { EditableRow, StaticRow } from "../Trove/Editor";
import { LoadingOverlay } from "../LoadingOverlay";

import { useStakingView } from "./context/StakingViewContext";

const select = ({ pollenBalance, totalStakedPOLLEN }: BeraBorrowStoreState) => ({
  pollenBalance,
  totalStakedPOLLEN
});

type StakingEditorProps = {
  title: string;
  originalStake: POLLENStake;
  editedPOLLEN: Decimal;
  dispatch: (action: { type: "setStake"; newValue: Decimalish } | { type: "revert" }) => void;
};

export const StakingEditor: React.FC<StakingEditorProps> = ({
  children,
  title,
  originalStake,
  editedPOLLEN,
  dispatch
}) => {
  const { pollenBalance, totalStakedPOLLEN } = useBeraBorrowSelector(select);
  const { changePending } = useStakingView();
  const editingState = useState<string>();

  const edited = !editedPOLLEN.eq(originalStake.stakedPOLLEN);

  const maxAmount = originalStake.stakedPOLLEN.add(pollenBalance);
  const maxedOut = editedPOLLEN.eq(maxAmount);

  const totalStakedPOLLENAfterChange = totalStakedPOLLEN.sub(originalStake.stakedPOLLEN).add(editedPOLLEN);

  const originalPoolShare = originalStake.stakedPOLLEN.mulDiv(100, totalStakedPOLLEN);
  const newPoolShare = editedPOLLEN.mulDiv(100, totalStakedPOLLENAfterChange);
  const poolShareChange =
    originalStake.stakedPOLLEN.nonZero && Difference.between(newPoolShare, originalPoolShare).nonZero;

  return (
    <Card>
      <Heading>
        {title}
        {edited && !changePending && (
          <Button
            variant="titleIcon"
            sx={{ ":enabled:hover": { color: "danger" } }}
            onClick={() => dispatch({ type: "revert" })}
          >
            <Icon name="history" size="lg" />
          </Button>
        )}
      </Heading>

      <Box sx={{ p: [2, 3] }}>
        <EditableRow
          label="Stake"
          inputId="stake-pollen"
          amount={editedPOLLEN.prettify()}
          maxAmount={maxAmount.toString()}
          maxedOut={maxedOut}
          unit={GT}
          {...{ editingState }}
          editedAmount={editedPOLLEN.toString(2)}
          setEditedAmount={newValue => dispatch({ type: "setStake", newValue })}
        />

        {newPoolShare.infinite ? (
          <StaticRow label="Pool share" inputId="stake-share" amount="N/A" />
        ) : (
          <StaticRow
            label="Pool share"
            inputId="stake-share"
            amount={newPoolShare.prettify(4)}
            pendingAmount={poolShareChange?.prettify(4).concat("%")}
            pendingColor={poolShareChange?.positive ? "success" : "danger"}
            unit="%"
          />
        )}

        {!originalStake.isEmpty && (
          <>
            <StaticRow
              label="Redemption gain"
              inputId="stake-gain-ibgt"
              amount={originalStake.collateralGain.prettify(4)}
              color={originalStake.collateralGain.nonZero && "success"}
              unit="iBGT"
            />

            <StaticRow
              label="Issuance gain"
              inputId="stake-gain-nect"
              amount={originalStake.nectGain.prettify()}
              color={originalStake.nectGain.nonZero && "success"}
              unit={COIN}
            />
          </>
        )}

        {children}
      </Box>

      {changePending && <LoadingOverlay />}
    </Card>
  );
};
