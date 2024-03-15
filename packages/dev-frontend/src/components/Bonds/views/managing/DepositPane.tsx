import { Decimal } from "@beraborrow/lib-base";
import React, { useEffect, useState } from "react";
import { Flex, Button, Spinner, Checkbox, Label, Card, Text } from "theme-ui";
import { Amount } from "../../../ActionDescription";
import { ErrorDescription } from "../../../ErrorDescription";
import { Icon } from "../../../Icon";
import { InfoIcon } from "../../../InfoIcon";
import { DisabledEditableRow, EditableRow } from "../../../Trove/Editor";
import { useBondView } from "../../context/BondViewContext";
import { BNectAmmTokenIndex } from "../../context/transitions";
import { PoolDetails } from "./PoolDetails";
import type { Address, ApprovePressedPayload } from "../../context/transitions";

export const DepositPane: React.FC = () => {
  const {
    dispatchEvent,
    statuses,
    nectBalance,
    bNectBalance,
    isBNectApprovedWithAmmZapper,
    isNectApprovedWithAmmZapper,
    getExpectedLpTokens,
    addresses,
    bNectAmmBNectBalance,
    bNectAmmNectBalance
  } = useBondView();

  const editingState = useState<string>();
  const [bNectAmount, setBNectAmount] = useState<Decimal>(Decimal.ZERO);
  const [nectAmount, setNectAmount] = useState<Decimal>(Decimal.ZERO);
  const [lpTokens, setLpTokens] = useState<Decimal>(Decimal.ZERO);
  const [shouldStakeInGauge, setShouldStakeInGauge] = useState(true);
  const [shouldDepositBalanced, setShouldDepositBalanced] = useState(true);

  const coalescedBNectBalance = bNectBalance ?? Decimal.ZERO;
  const coalescedNectBalance = nectBalance ?? Decimal.ZERO;

  const isApprovePending = statuses.APPROVE_SPENDER === "PENDING";
  const isManageLiquidityPending = statuses.MANAGE_LIQUIDITY === "PENDING";
  const isBNectBalanceInsufficient = bNectAmount.gt(coalescedBNectBalance);
  const isNectBalanceInsufficient = nectAmount.gt(coalescedNectBalance);
  const isAnyBalanceInsufficient = isBNectBalanceInsufficient || isNectBalanceInsufficient;

  const isDepositingNect = nectAmount.gt(0);
  const isDepositingBNect = bNectAmount.gt(0);

  const zapperNeedsNectApproval = isDepositingNect && !isNectApprovedWithAmmZapper;
  const zapperNeedsBNectApproval = isDepositingBNect && !isBNectApprovedWithAmmZapper;
  const isApprovalNeeded = zapperNeedsNectApproval || zapperNeedsBNectApproval;

  const poolBalanceRatio =
    bNectAmmBNectBalance && bNectAmmNectBalance
      ? bNectAmmNectBalance.div(bNectAmmBNectBalance)
      : Decimal.ONE;

  const handleApprovePressed = () => {
    const tokensNeedingApproval = new Map<BNectAmmTokenIndex, Address>();
    if (zapperNeedsNectApproval) {
      tokensNeedingApproval.set(BNectAmmTokenIndex.NECT, addresses.BNECT_LP_ZAP_ADDRESS);
    }
    if (zapperNeedsBNectApproval) {
      tokensNeedingApproval.set(BNectAmmTokenIndex.BNECT, addresses.BNECT_LP_ZAP_ADDRESS);
    }

    dispatchEvent("APPROVE_PRESSED", { tokensNeedingApproval } as ApprovePressedPayload);
  };

  const handleConfirmPressed = () => {
    dispatchEvent("CONFIRM_PRESSED", {
      action: "addLiquidity",
      bNectAmount,
      nectAmount,
      minLpTokens: lpTokens,
      shouldStakeInGauge
    });
  };

  const handleBackPressed = () => {
    dispatchEvent("BACK_PRESSED");
  };

  const handleToggleShouldStakeInGauge = () => {
    setShouldStakeInGauge(toggle => !toggle);
  };

  const handleToggleShouldDepositBalanced = () => {
    if (!shouldDepositBalanced) {
      setBNectAmount(Decimal.ZERO);
      setNectAmount(Decimal.ZERO);
    }
    setShouldDepositBalanced(toggle => !toggle);
  };

  const handleSetAmount = (token: "bNECT" | "NECT", amount: Decimal) => {
    if (shouldDepositBalanced) {
      if (token === "bNECT") setNectAmount(poolBalanceRatio.mul(amount));
      else if (token === "NECT") setBNectAmount(amount.div(poolBalanceRatio));
    }

    if (token === "bNECT") setBNectAmount(amount);
    else if (token === "NECT") setNectAmount(amount);
  };

  useEffect(() => {
    if (bNectAmount.isZero && nectAmount.isZero) {
      setLpTokens(Decimal.ZERO);
      return;
    }

    let cancelled = false;

    const timeoutId = setTimeout(async () => {
      try {
        const expectedLpTokens = await getExpectedLpTokens(bNectAmount, nectAmount);
        if (cancelled) return;
        setLpTokens(expectedLpTokens);
      } catch (error) {
        console.error("getExpectedLpTokens() failed");
        console.log(error);
      }
    }, 200);

    return () => {
      clearTimeout(timeoutId);
      cancelled = true;
    };
  }, [bNectAmount, nectAmount, getExpectedLpTokens]);

  return (
    <>
      <EditableRow
        label="bNECT amount"
        inputId="deposit-bnect"
        amount={bNectAmount.prettify(2)}
        unit="bNECT"
        editingState={editingState}
        editedAmount={bNectAmount.toString()}
        setEditedAmount={amount => handleSetAmount("bNECT", Decimal.from(amount))}
        maxAmount={coalescedBNectBalance.toString()}
        maxedOut={bNectAmount.eq(coalescedBNectBalance)}
      />

      <EditableRow
        label="NECT amount"
        inputId="deposit-nect"
        amount={nectAmount.prettify(2)}
        unit="NECT"
        editingState={editingState}
        editedAmount={nectAmount.toString()}
        setEditedAmount={amount => handleSetAmount("NECT", Decimal.from(amount))}
        maxAmount={coalescedNectBalance.toString()}
        maxedOut={nectAmount.eq(coalescedNectBalance)}
      />

      <Flex sx={{ justifyContent: "center", mb: 3 }}>
        <Icon name="arrow-down" size="lg" />
      </Flex>

      <DisabledEditableRow
        label="Mint LP tokens"
        inputId="deposit-mint-lp-tokens"
        amount={lpTokens.prettify(2)}
      />

      <Label>
        <Flex sx={{ alignItems: "center" }}>
          <Checkbox checked={shouldDepositBalanced} onChange={handleToggleShouldDepositBalanced} />
          <Text sx={{ fontWeight: 300, fontSize: "16px" }}>Deposit tokens in a balanced ratio</Text>
          <InfoIcon
            placement="right"
            size="xs"
            tooltip={
              <Card variant="tooltip">
                Tick this box to deposit bNECT and NECT-3CRV in the pool's current liquidity ratio.
                Current ratio = 1 bNECT : {poolBalanceRatio.prettify(2)} NECT.
              </Card>
            }
          />
        </Flex>
      </Label>

      <Label mb={2}>
        <Flex sx={{ alignItems: "center" }}>
          <Checkbox checked={shouldStakeInGauge} onChange={handleToggleShouldStakeInGauge} />
          <Text sx={{ fontWeight: 300, fontSize: "16px" }}>Stake LP tokens in Curve gauge</Text>
          <InfoIcon
            placement="right"
            size="xs"
            tooltip={
              <Card variant="tooltip">
                Tick this box to have your Curve LP tokens staked in the bNECT Curve gauge. Staked LP
                tokens will earn protocol fees and Curve rewards.
              </Card>
            }
          />
        </Flex>
      </Label>

      <PoolDetails />

      {isAnyBalanceInsufficient && (
        <ErrorDescription>
          Deposit exceeds your balance by{" "}
          {isBNectBalanceInsufficient && (
            <>
              <Amount>{bNectAmount.sub(coalescedBNectBalance).prettify(2)} bNECT</Amount>
              {isNectBalanceInsufficient && <> and </>}
            </>
          )}
          {isNectBalanceInsufficient && (
            <Amount>{nectAmount.sub(coalescedNectBalance).prettify(2)} NECT</Amount>
          )}
        </ErrorDescription>
      )}

      <Flex variant="layout.actions">
        <Button
          variant="cancel"
          onClick={handleBackPressed}
          disabled={isApprovePending || isManageLiquidityPending}
        >
          Back
        </Button>

        {!isApprovalNeeded ? (
          <Button
            variant="primary"
            onClick={handleConfirmPressed}
            disabled={
              (bNectAmount.isZero && nectAmount.isZero) ||
              isAnyBalanceInsufficient ||
              isManageLiquidityPending
            }
          >
            {isManageLiquidityPending ? (
              <Spinner size="28px" sx={{ color: "white" }} />
            ) : (
              <>Confirm</>
            )}
          </Button>
        ) : (
          <Button variant="primary" onClick={handleApprovePressed} disabled={isApprovePending}>
            {isApprovePending ? <Spinner size="28px" sx={{ color: "white" }} /> : <>Approve</>}
          </Button>
        )}
      </Flex>
    </>
  );
};
