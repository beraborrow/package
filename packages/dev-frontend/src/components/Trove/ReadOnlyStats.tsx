import React from "react";
// import { Card, Heading, Box, Flex, Button, Grid } from "theme-ui";
import { useBeraBorrowSelector } from "@beraborrow/lib-react";
import { BeraBorrowStoreState } from "@beraborrow/lib-base";
import { DisabledEditableRow } from "./Editor";
// import { useTroveView } from "./context/TroveViewContext";
// import { Icon } from "../Icon";
// import { COIN } from "../../strings";
// import { CollateralRatio } from "./CollateralRatio";

import { Percent, Decimal } from "@beraborrow/lib-base";
// import { AddressZero } from "@ethersproject/constants";
// import { useFluid } from "../../hooks/FluidContext";

// const select = ({ trove, price }: FluidStoreState) => ({ trove, price });

const select = ({
    trove,
    numberOfTroves,
    price,
    total,
    nectInStabilityPool,
    borrowingRate,
    redemptionRate,
    totalStakedPOLLEN,
    frontend
  }: BeraBorrowStoreState) => ({
    trove,
    numberOfTroves,
    price,
    total,
    nectInStabilityPool,
    borrowingRate,
    redemptionRate,
    totalStakedPOLLEN,
    kickbackRate: frontend.status === "registered" ? frontend.kickbackRate : null
  });

export const ReadOnlyStats: React.FC = () => {
    // const {
    //     fluid: {
    //         connection: { version: contractsVersion, deploymentDate, frontendTag }
    //     }
    // } = useFluid();

//   const { trove, price } = useBeraBorrowSelector(select);
  const {
    // trove,
    // numberOfTroves,
    price,
    nectInStabilityPool,
    total,
    borrowingRate,
    // totalStakedFLO,
    // kickbackRate
  } = useBeraBorrowSelector(select);

  // const saiInStabilityPoolPct =
  //   total.debt.nonZero && new Percent(saiInStabilityPool.div(total.debt));
  // const totalCollateralRatioPct = new Percent(total.collateralRatio(price));
  const borrowingFeePct = new Percent(borrowingRate);
  // const kickbackRatePct = frontendTag === AddressZero ? "100" : kickbackRate?.mul(100).prettify();

  return (
    <div className="mt-7 sm:mt-8">
      <div className="text-[32px] font-semibold p-0 py-2">Stats</div>
      <div className="px-0 py-4">
        {/* <Box> */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <DisabledEditableRow
            label="iBGT TVL"
            inputId="trove-tvl"
            amount={"$" + Decimal.from(total.collateral.mul(price)).shorten()}
            unit=""
          />
          <DisabledEditableRow
            label="Minted NECT"
            inputId="trove-minted-sai"
            amount={total.debt.shorten() + " / " + nectInStabilityPool.shorten()}
            unit=""
          />
          <DisabledEditableRow
            label="Mint fee"
            inputId="trove-ratio"
            amount={borrowingFeePct.toString(2)}
            unit=""
          />
          {/* <DisabledEditableRow
            label="Staked SEI APR"
            inputId="trove-price"
            amount={trove.collateral.prettify(4)}
            unit="iBGT"
          /> */}
          <DisabledEditableRow
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
          />
        </div>
      </div>
    </div>
  );
};
