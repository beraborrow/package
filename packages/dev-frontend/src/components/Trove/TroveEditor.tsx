import React, { useCallback } from "react";

import {
  Decimalish,
  Decimal,
  Trove,
  BeraBorrowStoreState,
} from "@beraborrow/lib-base";
import { useLiquitySelector } from "@beraborrow/lib-react";
import { useTroveView } from "./context/TroveViewContext";

type TroveEditorProps = {
  original: Trove;
  edited: Trove;
  fee: Decimal;
  borrowingRate: Decimal;
  changePending: boolean;
  dispatch: (
    action: { type: "setCollateral" | "setDebt"; newValue: Decimalish } | { type: "revert" }
  ) => void;
};

const select = ({ trove, fees, price, accountBalance }: BeraBorrowStoreState) => ({ 
  trove,
  fees,
  price,
  accountBalance
});

export const TroveEditor: React.FC<TroveEditorProps> = ({
  children,
}) => {
  const { dispatchEvent } = useTroveView();
  const { trove } = useLiquitySelector(select);

  // const feePct = new Percent(borrowingRate);

  // const originalCollateralRatio = !original.isEmpty ? original.collateralRatio(price) : undefined;
  // const collateralRatio = !edited.isEmpty ? edited.collateralRatio(price) : undefined;
  // const collateralRatioChange = Difference.between(collateralRatio, originalCollateralRatio);


  const handleOpenTrove = useCallback(() => {
    dispatchEvent("TROVE_ADJUSTED");
  }, [dispatchEvent]);

  return (
    <>
      <div className="flex flex-row justify-between text-lg font-medium p-0 border border-dark-gray rounded-[260px]">
        <div className="cursor-pointer bg-transparent text-dark-gray w-full text-center px-5 py-[18px]" onClick={handleOpenTrove}>Borrow</div>
        <span className=" bg-dark-gray text-[#150D39] w-full text-center px-5 py-[18px] rounded-r-[260px]">Redeem</span>
      </div>

      <div className="px-0 py-4 mt-[44px] text-dark-gray">
        <div className="mb-[28px]">
          <div className="flex flex-row font-medium text-lg justify-between mb-[14px]">
              <div>Pay back</div>
          </div>
          <div className={`flex flex-row items-center justify-between border border-[#FFEDD4] rounded-[180px] px-5 py-[14px]`}>
            <input 
                className="bg-transparent text-lg w-full outline-none opacity-60"
                value={trove.debt.toString(4)}
                disabled
            />
            <div className="flex flex-row items-center font-medium text-lg">
                {/* <span className="w-4 h-4 rounded-full bg-[#BDFAE2] mr-2" /> */}
                NECT
            </div>
          </div>
        </div>
        <div className="mb-[28px]">
          <div className="flex flex-row font-medium text-lg justify-between mb-[14px]">
              <div>iBGT to be redeemed</div>
              {/* <div className="flex flex-row">
                  <div>Balance</div>
                  <div className="ml-2 font-normal">{`${availableiBGT.prettify(4)}`} iBGT</div>
              </div> */}
          </div>
          <div className={`flex flex-row items-center justify-between border border-[#FFEDD4] rounded-[180px] px-5 py-[14px]`}>
            <input 
                className="bg-transparent text-lg w-full outline-none opacity-60"
                value={trove.collateral.toString(4)}
                disabled
            />
            <div className="flex flex-row items-center font-medium text-lg">
                {/* <span className="w-4 h-4 rounded-full bg-[#BDFAE2] mr-2" /> */}
                iBGT
            </div>
          </div>
        </div>
        <div className="mb-[14px]">
            <div className="flex flex-row justify-between text-lg font-normal mb-[14px]">
                <div>+ Redeemption fee</div>
                <div>{`${0}`} NECT</div>
            </div>
            <div className="my-[14px] h-0 w-full border-t border-[#BDFAE2]" />
            <div className="flex flex-row justify-between text-lg font-normal mb-[14px]">
                <div>Total debt</div>
                <div>{(trove.debt).prettify(2)} NECT</div>
            </div>
        </div>
      </div>
      {children}
      {/* {changePending && <LoadingOverlay />} */}
    </>
  );
};
