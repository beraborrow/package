import React, { useState, useCallback } from "react";
import { Heading, Box, Card, Input } from "theme-ui";
import { useStabilityView } from "./context/StabilityViewContext";

import {
  Decimal,
  Decimalish,
  StabilityDeposit,
  LiquityStoreState,
  Difference
} from "@liquity/lib-base";

import { useLiquitySelector } from "@liquity/lib-react";

import { COIN, GT } from "../../strings";

import { Icon } from "../Icon";
import { EditableRow, StaticRow } from "../Trove/Editor";
import { LoadingOverlay } from "../LoadingOverlay";
import { InfoIcon } from "../InfoIcon";

const select = ({ lusdBalance, lusdInStabilityPool }: LiquityStoreState) => ({
  lusdBalance,
  lusdInStabilityPool
});

type StabilityDepositEditorProps = {
  originalDeposit: StabilityDeposit;
  editedLUSD: Decimal;
  changePending: boolean;
  dispatch: (action: { type: "setDeposit"; newValue: Decimalish } | { type: "revert" }) => void;
};

export const StabilityDepositEditor: React.FC<StabilityDepositEditorProps> = ({
  originalDeposit,
  editedLUSD,
  changePending,
  dispatch,
  children
}) => {
  const { lusdBalance, lusdInStabilityPool } = useLiquitySelector(select);
  const [isWithdraw, setIsWithdraw] = useState<boolean>(false)
  
  const [editing, setEditing] = useState<string>();

  const lusdInStabilityPoolAfterChange = lusdInStabilityPool
    .sub(originalDeposit.currentLUSD)
    .add(editedLUSD);

  const newPoolShare = editedLUSD.mulDiv(100, lusdInStabilityPoolAfterChange);

  return (
    <>
      <div className="flex flex-row justify-between text-lg font-medium p-0 border border-dark-gray rounded-[260px]">
        <div className={`${!isWithdraw ? "bg-dark-gray text-[#150D39]" : "bg-transparent text-dark-gray"} cursor-pointer w-full text-center p-5 rounded-l-[260px]`} onClick={() => setIsWithdraw(!isWithdraw)}>Deposit</div>
        <span className={`${isWithdraw ? "bg-dark-gray text-[#150D39]" : "bg-transparent text-dark-gray"} cursor-pointer w-full text-center p-5 rounded-r-[260px]`} onClick={() => setIsWithdraw(!isWithdraw)}>Withdraw</span>
        {/* {isDirty && !isTransactionPending && (
          <Button variant="titleIcon" sx={{ ":enabled:hover": { color: "danger" } }} onClick={reset}>
            <Icon name="history" size="lg" />
          </Button>
        )} */}
      </div>

      <div className="px-0 py-4 mt-[44px] text-dark-gray">
        <div className={`${isWithdraw ? "mb-[48px]" : "mb-[28px]"}`}>
          <div className="flex flex-row font-medium text-lg justify-between mb-[14px]">
              <div>{isWithdraw ? "Withdraw": "Deposit"}</div>
              <div className="flex flex-row">
                  <div>Balance</div>
                  <div className="ml-2 font-normal">{`${lusdBalance.prettify(4)}`} NECT</div>
              </div>
          </div>
          <div 
              className={`flex flex-row items-center justify-between border ${editing !== "collateral" && editedLUSD.eq(0) ? "border-[#F45348]" : "border-[#FFEDD4]"} rounded-[180px] p-5`}
              onClick={() => setEditing("collateral")}
            >
                {
                  editing === "collateral" ? (
                    <Input
                      autoFocus
                      id="trove-collateral"
                      type="number"
                      step="any"
                      defaultValue={editedLUSD.toString(4)}
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
                    <div className="opacity-60">{editedLUSD.prettify(4)}</div>
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
            amount={originalDeposit.lqtyReward.prettify()}
            color={originalDeposit.lqtyReward.nonZero && "success"}
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
                    <div className="opacity-60">{editedLUSD.mulDiv(newPoolShare, 100).prettify(4)}</div>
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
              amount={originalDeposit.lqtyReward.prettify()}
              color={originalDeposit.lqtyReward.nonZero && "success"}
              unit={GT}
              infoIcon={
                <InfoIcon
                  tooltip={
                    <Card variant="tooltip" sx={{ width: "240px" }}>
                      Although the LQTY rewards accrue every minute, the value on the UI only updates
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
