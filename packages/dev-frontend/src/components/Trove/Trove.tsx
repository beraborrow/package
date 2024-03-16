import React from "react";
import { TroveManager } from "./TroveManager";
import { ReadOnlyTrove } from "./ReadOnlyTrove";
import { Borrow } from "./Borrow";
import { Opening } from "./Opening";
import { useTroveView } from "./context/TroveViewContext";
import { ReadOnlyStats } from "./ReadOnlyStats";
import { Decimal } from "@beraborrow/lib-base";

export const Trove: React.FC = props => {
  const { view } = useTroveView();

  return (
    <>
      <div className='flex flex-col lg:flex-row items-center text-[32px] md:text-[40px] lg:text-[48px] font-bold leading-[48px] -tracking-[1.44px] mx-auto py-4 md:py-8 h-[120px] my-4'>
        <span className='text-dark-gray'>110% collateral ratio</span><span className="hidden lg:block">&nbsp;-&nbsp;</span>
        <span className='flex flex-row items-center bg-clip-text bg-orange-gradient text-transparent min-h-[45px] lg:min-h-[62px]'>leverage up to 11x</span>
      </div>
      <div className="w-auto md:w-[570px] mx-5 md:mx-auto">
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
