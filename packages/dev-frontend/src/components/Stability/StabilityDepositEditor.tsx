import React, { useEffect, useState } from "react";
import { Input } from "theme-ui";

import {
  Decimal,
  Decimalish,
  StabilityDeposit,
  BeraBorrowStoreState,
} from "@beraborrow/lib-base";

import { useBeraBorrowSelector } from "@beraborrow/lib-react";

import { StaticRow } from "../Trove/Editor";

const select = ({ nectBalance, nectInStabilityPool }: BeraBorrowStoreState) => ({
  nectBalance,
  nectInStabilityPool
});

type StabilityDepositEditorProps = {
  originalDeposit: StabilityDeposit;
  editedNECT: Decimal;
  changePending: boolean;
  dispatch: (action: { type: "setDeposit"; newValue: Decimalish } | { type: "revert" }) => void;
};

export const StabilityDepositEditor: React.FC<StabilityDepositEditorProps> = ({
  originalDeposit,
  editedNECT,
  changePending,
  dispatch,
  children
}) => {
  const { nectBalance, nectInStabilityPool } = useBeraBorrowSelector(select);
  const [isWithdraw, setIsWithdraw] = useState<boolean>(false)

  const [depositAmount, setDepositAmount] = useState<Number>(0)
  const [withdrawAmount, setWithdrawAmount] = useState<Number>(0)
  
  const [editing, setEditing] = useState<string>();

  const nectInStabilityPoolAfterChange = nectInStabilityPool
    .sub(originalDeposit.currentNECT)
    .add(editedNECT);

  const newPoolShare = editedNECT.mulDiv(100, nectInStabilityPoolAfterChange);

  useEffect (() => {
    dispatch({ 
      type: "setDeposit",
      newValue: !isWithdraw ? originalDeposit.currentNECT.add(Number(depositAmount)) : originalDeposit.currentNECT.sub(Number(withdrawAmount))
    });
  }, [isWithdraw])

  useEffect (() => {
    if (isWithdraw) {
      if (!changePending) setWithdrawAmount (0)
    } else {
      if (!changePending) setDepositAmount (0)
    }
  }, [changePending])

  return (
    <>
      <div className="flex flex-row justify-between text-lg font-medium p-0 border border-dark-gray rounded-[260px]">
        <div className={`${!isWithdraw ? "bg-dark-gray text-[#150D39]" : "bg-transparent text-dark-gray"} cursor-pointer w-full text-center px-5 py-[18px] rounded-l-[260px]`} onClick={() => setIsWithdraw(!isWithdraw)}>Deposit</div>
        <span className={`${isWithdraw ? "bg-dark-gray text-[#150D39]" : "bg-transparent text-dark-gray"} cursor-pointer w-full text-center px-5 py-[18px] rounded-r-[260px]`} onClick={() => setIsWithdraw(!isWithdraw)}>Withdraw</span>
      </div>

      <div className="px-0 py-4 mt-[44px] text-dark-gray">
        <div className="mb-[48px]">
          <div className="flex flex-row font-medium text-lg justify-between mb-[14px]">
              <div>{isWithdraw ? "Withdraw": "Deposit"}</div>
              <div className="flex flex-row">
                  <div>Balance</div>
                  <div className="ml-2 font-normal">
                    {`${!isWithdraw ? nectBalance.prettify(4) : originalDeposit.currentNECT.toString()}`}
                    &nbsp;NECT
                  </div>
              </div>
          </div>
          <div 
              className={`flex flex-row items-center justify-between border border-[#FFEDD4] rounded-[180px] px-5 py-[14px]`}
              onClick={() => setEditing("collateral")}
            >
                {
                  editing === "collateral" ? (
                      <Input
                        autoFocus
                        id="trove-collateral"
                        type="number"
                        step="any"
                        defaultValue={
                          !isWithdraw ? depositAmount.toString() : withdrawAmount.toString()
                        }
                        onChange={(e) => {
                          dispatch({ 
                            type: "setDeposit",
                            newValue: !isWithdraw ? originalDeposit.currentNECT.add(Number(e.target.value)) : originalDeposit.currentNECT.sub(Number(e.target.value))
                          });
                          !isWithdraw ? setDepositAmount(Number(e.target.value)) : setWithdrawAmount(Number(e.target.value))
                        }}
                        onBlur={() => {setEditing(undefined)}}
                        variant="editor"
                        sx={{
                          backgroundColor: "transparent",
                          fontSize: "18px",
                          fontWeight: "medium",
                          width: "100%",
                          outline: "2px solid transparent",
                          outlineOffset: "2px",
                          borderColor: "transparent",
                          padding: 0,
                          marginRight: "4px"
                        }}
                      />
                  ):(
                    <div className="opacity-60">
                      {!isWithdraw ? depositAmount.toString() : withdrawAmount.toString()}
                    </div>
                  )
                }
                <div className="flex flex-row items-center font-medium text-lg">
                    NECT
                </div>
            </div>
        </div>
        {
          isWithdraw ?
          <StaticRow
            label="Rewards received"
            inputId="deposit-rewards-received"
            amount={originalDeposit.pollenReward.prettify()}
            color={originalDeposit.pollenReward.nonZero && "success"}
            unit="POLLEN"
          /> : 
          newPoolShare.infinite ? (
            <StaticRow label="Pool share" inputId="deposit-share" amount="N/A" />
          ) : (
            <div className="mb-[28px]">
              <div className="flex flex-row font-medium text-lg justify-between mb-[14px]">
                  <div>Pool share</div>
                  <div className="flex flex-row">
                      <div className="ml-2 font-normal">{`${newPoolShare.prettify(4)}`} %</div>
                  </div>
              </div>
              <div 
                  className={`flex flex-row items-center justify-between border border-[#FFEDD4] rounded-[180px] px-5 py-[14px]`}
                >
                    <div className="opacity-60">{editedNECT.mulDiv(newPoolShare, 100).prettify(4)}</div>
                    <div className="flex flex-row items-center font-medium text-lg">
                        NECT
                    </div>
                </div>
            </div>
          )
        }
        {children}
      </div>
      {/* {changePending && <LoadingOverlay />} */}
    </>
  );
};
