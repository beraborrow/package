import {
  Decimal,
  NECT_MINIMUM_DEBT,
  NECT_MINIMUM_NET_DEBT,
  Trove,
  TroveAdjustmentParams,
  TroveChange,
  Percent,
  MINIMUM_COLLATERAL_RATIO,
  CRITICAL_COLLATERAL_RATIO,
  BeraBorrowStoreState,
  TroveClosureParams,
  TroveCreationParams
} from "@beraborrow/lib-base";

import { COIN } from "../../../strings";

import { ActionDescription, Amount } from "../../ActionDescription";
import { ErrorDescription } from "../../ErrorDescription";

const mcrPercent = new Percent(MINIMUM_COLLATERAL_RATIO).toString(0);
const ccrPercent = new Percent(CRITICAL_COLLATERAL_RATIO).toString(0);

type TroveAdjustmentDescriptionParams = {
  params: TroveAdjustmentParams<Decimal>;
};

const TroveChangeDescription: React.FC<TroveAdjustmentDescriptionParams> = ({ params }) => (
  <ActionDescription>
    {params.depositCollateral && params.borrowNECT ? (
      <>
        You will deposit <Amount>{params.depositCollateral.prettify()} iBGT</Amount> and receive{" "}
        <Amount>
          {params.borrowNECT.prettify()} {COIN}
        </Amount>
      </>
    ) : params.repayNECT && params.withdrawCollateral ? (
      <>
        You will pay{" "}
        <Amount>
          {params.repayNECT.prettify()} {COIN}
        </Amount>{" "}
        and receive <Amount>{params.withdrawCollateral.prettify()} iBGT</Amount>
      </>
    ) : params.depositCollateral && params.repayNECT ? (
      <>
        You will deposit <Amount>{params.depositCollateral.prettify()} iBGT</Amount> and pay{" "}
        <Amount>
          {params.repayNECT.prettify()} {COIN}
        </Amount>
      </>
    ) : params.borrowNECT && params.withdrawCollateral ? (
      <>
        You will receive <Amount>{params.withdrawCollateral.prettify()} iBGT</Amount> and{" "}
        <Amount>
          {params.borrowNECT.prettify()} {COIN}
        </Amount>
      </>
    ) : params.depositCollateral ? (
      <>
        You will deposit <Amount>{params.depositCollateral.prettify()} iBGT</Amount>
      </>
    ) : params.withdrawCollateral ? (
      <>
        You will receive <Amount>{params.withdrawCollateral.prettify()} iBGT</Amount>
      </>
    ) : params.borrowNECT ? (
      <>
        You will receive{" "}
        <Amount>
          {params.borrowNECT.prettify()} {COIN}
        </Amount>
      </>
    ) : (
      <>
        You will pay{" "}
        <Amount>
          {params.repayNECT.prettify()} {COIN}
        </Amount>
      </>
    )}
    .
  </ActionDescription>
);

export const selectForTroveChangeValidation = ({
  price,
  total,
  accountBalance,
  nectBalance,
  numberOfTroves
}: BeraBorrowStoreState) => ({ price, total, accountBalance, nectBalance, numberOfTroves });

type TroveChangeValidationSelectedState = ReturnType<typeof selectForTroveChangeValidation>;

interface TroveChangeValidationContext extends TroveChangeValidationSelectedState {
  originalTrove: Trove;
  resultingTrove: Trove;
  recoveryMode: boolean;
  wouldTriggerRecoveryMode: boolean;
}

export const validateTroveChange = (
  originalTrove: Trove,
  adjustedTrove: Trove,
  borrowingRate: Decimal,
  selectedState: TroveChangeValidationSelectedState
): [
  validChange: Exclude<TroveChange<Decimal>, { type: "invalidCreation" }> | undefined,
  description: JSX.Element | undefined
] => {
  const { total, price } = selectedState;
  const change = originalTrove.whatChanged(adjustedTrove, borrowingRate);

  if (!change) {
    return [undefined, undefined];
  }

  // Reapply change to get the exact state the Trove will end up in (which could be slightly
  // different from `edited` due to imprecision).
  const resultingTrove = originalTrove.apply(change, borrowingRate);
  const recoveryMode = total.collateralRatioIsBelowCritical(price);
  const wouldTriggerRecoveryMode = total
    .subtract(originalTrove)
    .add(resultingTrove)
    .collateralRatioIsBelowCritical(price);

  const context: TroveChangeValidationContext = {
    ...selectedState,
    originalTrove,
    resultingTrove,
    recoveryMode,
    wouldTriggerRecoveryMode
  };

  if (change.type === "invalidCreation") {
    // Trying to create a Trove with negative net debt
    return [
      undefined,
      <ErrorDescription>
        Total debt must be at least{" "}
        <Amount>
          {NECT_MINIMUM_DEBT.toString()} {COIN}
        </Amount>
        .
      </ErrorDescription>
    ];
  }

  const errorDescription =
    change.type === "creation"
      ? validateTroveCreation(change.params, context)
      : change.type === "closure"
      ? validateTroveClosure(change.params, context)
      : validateTroveAdjustment(change.params, context);

  if (errorDescription) {
    return [undefined, errorDescription];
  }

  return [change, <TroveChangeDescription params={change.params} />];
};

const validateTroveCreation = (
  { depositCollateral, borrowNECT }: TroveCreationParams<Decimal>,
  {
    resultingTrove,
    recoveryMode,
    wouldTriggerRecoveryMode,
    accountBalance,
    price
  }: TroveChangeValidationContext
): JSX.Element | null => {
  if (borrowNECT.lt(NECT_MINIMUM_NET_DEBT)) {
    return (
      <ErrorDescription>
        You must borrow at least{" "}
        <Amount>
          {NECT_MINIMUM_NET_DEBT.toString()} {COIN}
        </Amount>
        .
      </ErrorDescription>
    );
  }

  if (recoveryMode) {
    if (!resultingTrove.isOpenableInRecoveryMode(price)) {
      return (
        <ErrorDescription>
          You're not allowed to open a Trove with less than <Amount>{ccrPercent}</Amount> Collateral
          Ratio during recovery mode. Please increase your Trove's Collateral Ratio.
        </ErrorDescription>
      );
    }
  } else {
    if (resultingTrove.collateralRatioIsBelowMinimum(price)) {
      return (
        <ErrorDescription>
          Collateral ratio must be at least <Amount>{mcrPercent}</Amount>.
        </ErrorDescription>
      );
    }

    if (wouldTriggerRecoveryMode) {
      return (
        <ErrorDescription>
          You're not allowed to open a Trove that would cause the Total Collateral Ratio to fall
          below <Amount>{ccrPercent}</Amount>. Please increase your Trove's Collateral Ratio.
        </ErrorDescription>
      );
    }
  }

  if (depositCollateral.gt(accountBalance)) {
    return (
      <ErrorDescription>
        The amount you're trying to deposit exceeds your balance by{" "}
        <Amount>{depositCollateral.sub(accountBalance).prettify()} iBGT</Amount>.
      </ErrorDescription>
    );
  }

  return null;
};

const validateTroveAdjustment = (
  { depositCollateral, withdrawCollateral, borrowNECT, repayNECT }: TroveAdjustmentParams<Decimal>,
  {
    originalTrove,
    resultingTrove,
    recoveryMode,
    wouldTriggerRecoveryMode,
    price,
    accountBalance,
    nectBalance
  }: TroveChangeValidationContext
): JSX.Element | null => {
  if (recoveryMode) {
    if (withdrawCollateral) {
      return (
        <ErrorDescription>
          You're not allowed to withdraw collateral during recovery mode.
        </ErrorDescription>
      );
    }

    if (borrowNECT) {
      if (resultingTrove.collateralRatioIsBelowCritical(price)) {
        return (
          <ErrorDescription>
            Your collateral ratio must be at least <Amount>{ccrPercent}</Amount> to borrow during
            recovery mode. Please improve your collateral ratio.
          </ErrorDescription>
        );
      }

      if (resultingTrove.collateralRatio(price).lt(originalTrove.collateralRatio(price))) {
        return (
          <ErrorDescription>
            You're not allowed to decrease your collateral ratio during recovery mode.
          </ErrorDescription>
        );
      }
    }
  } else {
    if (resultingTrove.collateralRatioIsBelowMinimum(price)) {
      return (
        <ErrorDescription>
          Collateral ratio must be at least <Amount>{mcrPercent}</Amount>.
        </ErrorDescription>
      );
    }

    if (wouldTriggerRecoveryMode) {
      return (
        <ErrorDescription>
          The adjustment you're trying to make would cause the Total Collateral Ratio to fall below{" "}
          <Amount>{ccrPercent}</Amount>. Please increase your Trove's Collateral Ratio.
        </ErrorDescription>
      );
    }
  }

  if (repayNECT) {
    if (resultingTrove.debt.lt(NECT_MINIMUM_DEBT)) {
      return (
        <ErrorDescription>
          Total debt must be at least{" "}
          <Amount>
            {NECT_MINIMUM_DEBT.toString()} {COIN}
          </Amount>
          .
        </ErrorDescription>
      );
    }

    if (repayNECT.gt(nectBalance)) {
      return (
        <ErrorDescription>
          The amount you're trying to repay exceeds your balance by{" "}
          <Amount>
            {repayNECT.sub(nectBalance).prettify()} {COIN}
          </Amount>
          .
        </ErrorDescription>
      );
    }
  }

  if (depositCollateral?.gt(accountBalance)) {
    return (
      <ErrorDescription>
        The amount you're trying to deposit exceeds your balance by{" "}
        <Amount>{depositCollateral.sub(accountBalance).prettify()} iBGT</Amount>.
      </ErrorDescription>
    );
  }

  return null;
};

const validateTroveClosure = (
  { repayNECT }: TroveClosureParams<Decimal>,
  {
    recoveryMode,
    wouldTriggerRecoveryMode,
    numberOfTroves,
    nectBalance
  }: TroveChangeValidationContext
): JSX.Element | null => {
  if (numberOfTroves === 1) {
    return (
      <ErrorDescription>
        You're not allowed to close your Trove when there are no other Troves in the system.
      </ErrorDescription>
    );
  }

  if (recoveryMode) {
    return (
      <ErrorDescription>
        You're not allowed to close your Trove during recovery mode.
      </ErrorDescription>
    );
  }

  if (repayNECT?.gt(nectBalance)) {
    return (
      <ErrorDescription>
        You need{" "}
        <Amount>
          {repayNECT.sub(nectBalance).prettify()} {COIN}
        </Amount>{" "}
        more to close your Trove.
      </ErrorDescription>
    );
  }

  if (wouldTriggerRecoveryMode) {
    return (
      <ErrorDescription>
        You're not allowed to close a Trove if it would cause the Total Collateralization Ratio to
        fall below <Amount>{ccrPercent}</Amount>. Please wait until the Total Collateral Ratio
        increases.
      </ErrorDescription>
    );
  }

  return null;
};
