import React from "react";
import { Grid } from "theme-ui";
import { useLiquitySelector } from "@liquity/lib-react";
import { LiquityStoreState } from "@liquity/lib-base";
import { DisabledEditableRow } from "./Editor";
import { useTroveView } from "./context/TroveViewContext";
import { Icon } from "../Icon";
import { COIN } from "../../strings";
import { CollateralRatio } from "./CollateralRatio";

const select = ({ trove, price }: LiquityStoreState) => ({ trove, price });

export const ReadOnlyTrove: React.FC = () => {

  const { trove, price } = useLiquitySelector(select);
  const { view } = useTroveView();

  const liquidationPrice = trove.collateral.eq(0) ? price : trove.debt.mulDiv(1.1, trove.collateral)

  return (
    <div className="mt-7 sm:mt-8">
      <div className="text-[32px] font-semibold p-0 py-2">
        {view === "CLOSING" ? "Current Borrowing" : "Your Borrowing"}
      </div>
      <div className="px-0 mt-4">
        <Grid gap={2} columns={[2, '1fr 2fr']}>
          <DisabledEditableRow
            label="Net Asset Value"
            inputId="trove-collateral"
            amount={"$" + trove.collateral.mul(price).prettify(4)}
            unit=""
          />
          <DisabledEditableRow
            label="Amount Borrowed"
            inputId="trove-debt"
            amount={trove.debt.prettify()}
            unit={COIN}
          />
          <DisabledEditableRow
            label="Collateral Health"
            inputId="trove-ratio"
            amount={(trove.collateralRatio(price).mul(100)).prettify(1)}
            unit="%"
          />
          <DisabledEditableRow
            label="Liquidation Price"
            inputId="trove-price"
            amount={"$" + liquidationPrice.prettify(4)}
            unit=""
          />
        </Grid>
      </div>
    </div>
  );
};
