import React, { useCallback, useEffect } from "react";
import { Card, Heading, Box, Flex, Button } from "theme-ui";

import { BeraBorrowStoreState } from "@beraborrow/lib-base";
import { useBeraBorrowSelector } from "@beraborrow/lib-react";

import { COIN, GT } from "../../strings";
import { Icon } from "../Icon";
import { LoadingOverlay } from "../LoadingOverlay";
import { useMyTransactionState } from "../Transaction";
import { DisabledEditableRow, StaticRow } from "../Trove/Editor";
import { ClaimAndMove } from "./actions/ClaimAndMove";
import { ClaimRewards } from "./actions/ClaimRewards";
import { useStabilityView } from "./context/StabilityViewContext";
import { RemainingPOLLEN } from "./RemainingPOLLEN";
import { Yield } from "./Yield";
import { InfoIcon } from "../InfoIcon";

const selector = ({ stabilityDeposit, trove, nectInStabilityPool }: BeraBorrowStoreState) => ({
  stabilityDeposit,
  trove,
  nectInStabilityPool
});

export const ActiveDeposit: React.FC = () => {
  const { dispatchEvent } = useStabilityView();
  const { stabilityDeposit, trove, nectInStabilityPool } = useBeraBorrowSelector(selector);

  const poolShare = stabilityDeposit.currentNECT.mulDiv(100, nectInStabilityPool);

  const handleAdjustDeposit = useCallback(() => {
    dispatchEvent("ADJUST_DEPOSIT_PRESSED");
  }, [dispatchEvent]);

  const hasReward = !stabilityDeposit.pollenReward.isZero;
  const hasGain = !stabilityDeposit.collateralGain.isZero;
  const hasTrove = !trove.isEmpty;

  const transactionId = "stability-deposit";
  const transactionState = useMyTransactionState(transactionId);
  const isWaitingForTransaction =
    transactionState.type === "waitingForApproval" ||
    transactionState.type === "waitingForConfirmation";

  useEffect(() => {
    if (transactionState.type === "confirmedOneShot") {
      dispatchEvent("REWARDS_CLAIMED");
    }
  }, [transactionState.type, dispatchEvent]);

  return (
    <Card>
      <Heading>
        Stability Pool
        {!isWaitingForTransaction && (
          <Flex sx={{ justifyContent: "flex-end" }}>
            <RemainingPOLLEN />
          </Flex>
        )}
      </Heading>
      <Box sx={{ p: [2, 3] }}>
        <Box>
          <DisabledEditableRow
            label="Deposit"
            inputId="deposit-nect"
            amount={stabilityDeposit.currentNECT.prettify()}
            unit={COIN}
          />

          <StaticRow
            label="Pool share"
            inputId="deposit-share"
            amount={poolShare.prettify(4)}
            unit="%"
          />

          <StaticRow
            label="Liquidation gain"
            inputId="deposit-gain"
            amount={stabilityDeposit.collateralGain.prettify(4)}
            color={stabilityDeposit.collateralGain.nonZero && "success"}
            unit="iBGT"
          />

          <Flex sx={{ alignItems: "center" }}>
            <StaticRow
              label="Reward"
              inputId="deposit-reward"
              amount={stabilityDeposit.pollenReward.prettify()}
              color={stabilityDeposit.pollenReward.nonZero && "success"}
              unit={GT}
              infoIcon={
                <InfoIcon
                  tooltip={
                    <Card variant="tooltip" sx={{ width: "240px" }}>
                      Although the POLLEN rewards accrue every minute, the value on the UI only updates
                      when a user transacts with the Stability Pool. Therefore you may receive more
                      rewards than is displayed when you claim or adjust your deposit.
                    </Card>
                  }
                />
              }
            />
            <Flex sx={{ justifyContent: "flex-end", flexShrink: 0 }}>
              <Yield />
            </Flex>
          </Flex>
        </Box>

        <Flex variant="layout.actions">
          <Button variant="outline" onClick={handleAdjustDeposit}>
            <Icon name="pen" size="sm" />
            &nbsp;Adjust
          </Button>

          <ClaimRewards disabled={!hasGain && !hasReward}>Claim iBGT and POLLEN</ClaimRewards>
        </Flex>

        {hasTrove && (
          <ClaimAndMove disabled={!hasGain}>Claim POLLEN and move iBGT to Trove</ClaimAndMove>
        )}
      </Box>

      {isWaitingForTransaction && <LoadingOverlay />}
    </Card>
  );
};
