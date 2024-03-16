import React, { useState } from "react";
import { Input } from "theme-ui";

import {
  Decimal,
  Decimalish,
  StabilityDeposit,
  BeraBorrowStoreState,
} from "@beraborrow/lib-base";

import { useLiquitySelector } from "@beraborrow/lib-react";

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
  dispatch,
  children
}) => {
  const { nectBalance, nectInStabilityPool } = useLiquitySelector(select);
  const [isWithdraw, setIsWithdraw] = useState<boolean>(false)
  
  const [editing, setEditing] = useState<string>();

  const nectInStabilityPoolAfterChange = nectInStabilityPool
    .sub(originalDeposit.currentNECT)
    .add(editedNECT);

  const newPoolShare = editedNECT.mulDiv(100, nectInStabilityPoolAfterChange);

  return (
    <>
      <div className="flex flex-row justify-between text-lg font-medium p-0 border border-dark-gray rounded-[260px]">
        <div className={`${!isWithdraw ? "bg-dark-gray text-[#150D39]" : "bg-transparent text-dark-gray"} cursor-pointer w-full text-center px-5 py-[18px] rounded-l-[260px]`} onClick={() => setIsWithdraw(!isWithdraw)}>Deposit</div>
        <span className={`${isWithdraw ? "bg-dark-gray text-[#150D39]" : "bg-transparent text-dark-gray"} cursor-pointer w-full text-center px-5 py-[18px] rounded-r-[260px]`} onClick={() => setIsWithdraw(!isWithdraw)}>Withdraw</span>
        {/* {isDirty && !isTransactionPending && (
          <Button variant="titleIcon" sx={{ ":enabled:hover": { color: "danger" } }} onClick={reset}>
            <Icon name="history" size="lg" />
          </Button>
        )} */}
      </div>

      <div className="px-0 py-4 mt-[44px] text-dark-gray">
        <div className="mb-[48px]">
          <div className="flex flex-row font-medium text-lg justify-between mb-[14px]">
              <div>{isWithdraw ? "Withdraw": "Deposit"}</div>
              <div className="flex flex-row">
                  <div>Balance</div>
                  <div className="ml-2 font-normal">{`${nectBalance.prettify(4)}`} NECT</div>
              </div>
          </div>
          <div 
              // className={`flex flex-row items-center justify-between border ${editing !== "collateral" && editedNECT.eq(0) ? "border-[#F45348]" : "border-[#FFEDD4]"} rounded-[180px] px-5 py-[14px]`}
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
                      defaultValue={editedNECT.toString(4)}
                      onChange={(e) => dispatch({ type: "setDeposit", newValue: e.target.value })}
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
                    <div className="opacity-60">{editedNECT.prettify(4)}</div>
                  )
                }
                <div className="flex flex-row items-center font-medium text-lg">
                    {/* <span className="w-4 h-4 rounded-full bg-[#BDFAE2] mr-2" /> */}
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
                  className={`flex flex-row items-center justify-between border border-[#FFEDD4] rounded-[180px] p-5`}
                >
                    <div className="opacity-60">{editedNECT.mulDiv(newPoolShare, 100).prettify(4)}</div>
                    <div className="flex flex-row items-center font-medium text-lg">
                        {/* <span className="w-4 h-4 rounded-full bg-[#BDFAE2] mr-2" /> */}
                        NECT
                    </div>
                </div>
            </div>
          )
        }

        {/* {!originalDeposit.isEmpty && (
          <>
            <StaticRow
              label="Liquidation gain"
              inputId="deposit-gain"
              amount={originalDeposit.collateralGain.prettify(4)}
              color={originalDeposit.collateralGain.nonZero && "success"}
              unit="ETH"
            />

            <StaticRow
              label="Reward"
              inputId="deposit-reward"
              amount={originalDeposit.pollenReward.prettify()}
              color={originalDeposit.pollenReward.nonZero && "success"}
              unit={GT}
              infoIcon={
                <InfoIcon
                  tooltip={
                    <Card variant="tooltip" sx={{ width: "240px" }}>
                      Although the POLLEN rewards accrue every minute, the value on the UI only updates
                      when a user transacts with the Stability Pool. Therefore you may receive more
                      rewards than is displayed when you claim or adjust your deposit.
                    </Card>
                  }
                />
              }
            />
          </>
        )} */}
        {children}
      </div>

      {/* {changePending && <LoadingOverlay />} */}
    </>
  );
};
