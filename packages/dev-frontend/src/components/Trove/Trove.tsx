import React from "react";
import { TroveManager } from "./TroveManager";
import { ReadOnlyTrove } from "./ReadOnlyTrove";
import { Borrow } from "./Borrow";
import { Opening } from "./Opening";
import { Adjusting } from "./Adjusting";
import { RedeemedTrove } from "./RedeemedTrove";
import { useTroveView } from "./context/TroveViewContext";
import { ReadOnlyStats } from "./ReadOnlyStats";
import { Decimal } from "@liquity/lib-base";

export const Trove: React.FC = props => {
  const { view } = useTroveView();

  return (
    <>
      <div className='flex flex-row text-[48px] font-bold leading-6 -tracking-[1.44px] mx-auto py-8 h-[110px] my-4'>
        <span className='text-dark-gray'>110% collateral ratio -</span>&nbsp;
        <span className='bg-clip-text bg-orange-gradient text-transparent'>leverage up to 11x</span>
      </div>
      <div className="w-[570px] mx-auto">
        {
          (view === "ACTIVE" || view === "ADJUSTING") && <Borrow />
        }
        {
          (view === "OPENING" || view === "LIQUIDATED" || view === "NONE" || view === "REDEEMED") && <Opening />
        }
        {
          view === "CLOSING" && <TroveManager {...props} collateral={Decimal.ZERO} debt={Decimal.ZERO}  />
        }
        <div className="h-0 w-full border-t border-dark-gray my-8" />
        <ReadOnlyTrove {...props} />
        <div className="h-0 w-full border-t border-dark-gray my-8" />
        <ReadOnlyStats {...props} />
      </div>
    </>
  )
};
