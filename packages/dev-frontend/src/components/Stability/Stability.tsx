import React from "react";
import { StabilityDepositManager } from "./StabilityDepositManager";
import { StabilityStats } from "./StabilityStats";
import { useStabilityView } from "./context/StabilityViewContext";

export const Stability: React.FC = props => {
  const { view } = useStabilityView();

  return (
    <>
      <div className='flex flex-row items-center text-[48px] font-bold leading-[130%] -tracking-[1.44px] mx-auto py-4 h-[120px] my-4 text-dark-gray align-middle'>
        Stability Pool
      </div>
      <div className="w-auto md:w-[570px] mx-5 md:mx-auto">
        {
          (view === "NONE" || view === "DEPOSITING") ? <StabilityDepositManager {...props} /> :
          (view === "ADJUSTING") ? <StabilityDepositManager {...props} /> : <StabilityDepositManager {...props} />
        }
        <div className="my-[14px] h-0 w-full border-t border-[#BDFAE2]" />
        <StabilityStats />
      </div>
    </>
  )
  // switch (view) {
  //   case "NONE": {
  //     return <NoDeposit {...props} />;
  //   }
  //   case "DEPOSITING": {
  //     return <StabilityDepositManager {...props} />;
  //   }
  //   case "ADJUSTING": {
  //     return <StabilityDepositManager {...props} />;
  //   }
  //   case "ACTIVE": {
  //     return <ActiveDeposit {...props} />;
  //   }
  // }
};
