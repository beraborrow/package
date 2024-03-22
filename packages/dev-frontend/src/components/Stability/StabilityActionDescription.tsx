import React from "react";

import { Decimal, StabilityDeposit, StabilityDepositChange } from "@beraborrow/lib-base";

import { COIN, GT } from "../../strings";
import { ActionDescription, Amount } from "../ActionDescription";

type StabilityActionDescriptionProps = {
  originalDeposit: StabilityDeposit;
  change: StabilityDepositChange<Decimal>;
};

export const StabilityActionDescription: React.FC<StabilityActionDescriptionProps> = ({
  originalDeposit,
  change
}) => {
  const collateralGain = originalDeposit.collateralGain.nonZero?.prettify(4).concat(" iBGT");
  const pollenReward = originalDeposit.pollenReward.nonZero?.prettify().concat(" ", GT);

  return (
    <ActionDescription>
      {change.depositNECT ? (
        <>
          You are depositing{" "}
          <Amount>
            {change.depositNECT.prettify()} {COIN}
          </Amount>{" "}
          in the Stability Pool
        </>
      ) : (
        <>
          You are withdrawing{" "}
          <Amount>
            {change.withdrawNECT.prettify()} {COIN}
          </Amount>{" "}
          to your wallet
        </>
      )}
      {(collateralGain || pollenReward) && (
        <>
          {" "}
          and claiming at least{" "}
          {collateralGain && pollenReward ? (
            <>
              <Amount>{collateralGain}</Amount> and <Amount>{pollenReward}</Amount>
            </>
          ) : (
            <Amount>{collateralGain ?? pollenReward}</Amount>
          )}
        </>
      )}
      .
    </ActionDescription>
  );
};
