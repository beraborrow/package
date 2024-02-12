import React from "react";
// import { Card, Heading, Box, Flex, Button, Grid } from "theme-ui";
import { useLiquitySelector } from "@liquity/lib-react";
import { LiquityStoreState } from "@liquity/lib-base";
import { DisabledEditableRow } from "../Trove/Editor";
// import { useTroveView } from "./context/TroveViewContext";
// import { Icon } from "../Icon";
// import { COIN } from "../../strings";
// import { CollateralRatio } from "./CollateralRatio";

import { Percent, Decimal } from "@liquity/lib-base";
// import { AddressZero } from "@ethersproject/constants";
// import { useFluid } from "../../hooks/FluidContext";

// const select = ({ trove, price }: FluidStoreState) => ({ trove, price });

const select = ({
    trove,
    numberOfTroves,
    price,
    total,
    lusdInStabilityPool,
    borrowingRate,
    redemptionRate,
    totalStakedLQTY,
    frontend,
    remainingStabilityPoolLQTYReward
  }: LiquityStoreState) => ({
    trove,
    numberOfTroves,
    price,
    total,
    lusdInStabilityPool,
    borrowingRate,
    redemptionRate,
    totalStakedLQTY,
    remainingStabilityPoolLQTYReward,
    kickbackRate: frontend.status === "registered" ? frontend.kickbackRate : null
  });

export const StabilityStats: React.FC = () => {
    // const {
    //     fluid: {
    //         connection: { version: contractsVersion, deploymentDate, frontendTag }
    //     }
    // } = useFluid();

//   const { trove, price } = useLiquitySelector(select);
  const {
    // trove,
    // numberOfTroves,
    price,
    lusdInStabilityPool,
    total,
    borrowingRate,
    remainingStabilityPoolLQTYReward
    // totalStakedFLO,
    // kickbackRate
  } = useLiquitySelector(select);

  // const saiInStabilityPoolPct =
  //   total.debt.nonZero && new Percent(saiInStabilityPool.div(total.debt));
  // const totalCollateralRatioPct = new Percent(total.collateralRatio(price));
  const borrowingFeePct = new Percent(borrowingRate);
  // const kickbackRatePct = frontendTag === AddressZero ? "100" : kickbackRate?.mul(100).prettify();

  return (
    <div className="mt-7 sm:mt-8">
      <div className="text-[32px] font-semibold p-0 py-2">Your contributions</div>
      <div className="px-0 py-4">
        {/* <Box> */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <DisabledEditableRow
            label="Amount contributed to pool"
            inputId="stability-pool"
            amount={lusdInStabilityPool.shorten()}
            unit="NECT"
          />
          <DisabledEditableRow
            label="Rewards accumulated"
            inputId="stability-rewards"
            amount={remainingStabilityPoolLQTYReward.prettify(0)}
            unit="POLLEN"
          />
          <DisabledEditableRow
            label="Lockup time"
            inputId="stability-lockup-time"
            amount="N/A"
            unit=""
          />
          {/* <DisabledEditableRow
            label="Staked SEI APR"
            inputId="trove-price"
            amount={trove.collateral.prettify(4)}
            unit="ETH"
          /> */}
          {/* <DisabledEditableRow
            label="Borrow Interest rate"
            inputId="trove-price"
            amount={"0%"}
            unit=""
          />
          <DisabledEditableRow
            label="Minimum Collateral Ratio"
            inputId="trove-price"
            amount={"110%"}
            unit=""
          /> */}
        </div>
      </div>
    </div>
  );
};
