import React, { useCallback, useEffect, useState, useRef } from "react";
import { Flex, Button, Input, Spinner } from "theme-ui";
import {
  BeraBorrowStoreState,
  Decimal,
  Trove,
  NECT_LIQUIDATION_RESERVE,
  // Difference
} from "@beraborrow/lib-base";
import { useLiquitySelector } from "@beraborrow/lib-react";

import { useStableTroveChange } from "../../hooks/useStableTroveChange";
import { useMyTransactionState } from "../Transaction";
import { TroveAction } from "./TroveAction";
import { ApproveAction } from "../ApproveAction"
import { useTroveView } from "./context/TroveViewContext";
import { ExpensiveTroveChangeWarning, GasEstimationState } from "./ExpensiveTroveChangeWarning";
import {
  selectForTroveChangeValidation,
  validateTroveChange
} from "./validation/validateTroveChange";

const selector = (state: BeraBorrowStoreState) => {
  const { trove, fees, price, accountBalance } = state;
  return {
    trove,
    fees,
    price,
    accountBalance,
    validationContext: selectForTroveChangeValidation(state)
  };
};

const TRANSACTION_ID = "trove-creation";
const GAS_ROOM_ETH = Decimal.from(0.1);

const feeFrom = (original: Trove, edited: Trove, borrowingRate: Decimal): Decimal => {
  const change = original.whatChanged(edited, borrowingRate);

  if (change && change.type !== "invalidCreation" && change.params.borrowNECT) {
    return change.params.borrowNECT.mul(borrowingRate);
  } else {
    return Decimal.ZERO;
  }
};

export const Borrow: React.FC = () => {
  const { dispatchEvent } = useTroveView();
  const { trove, fees, price, accountBalance, validationContext } = useLiquitySelector(selector);
  const [editing, setEditing] = useState<string>();
  const previousTrove = useRef<Trove>(trove);
  const [collateral, setCollateral] = useState<Decimal>(trove.collateral);
  const [netDebt, setNetDebt] = useState<Decimal>(trove.netDebt);
  const [custom, setCustom] = useState<Boolean>(false)

  const transactionState = useMyTransactionState(TRANSACTION_ID);
  const borrowingRate = fees.borrowingRate();

  useEffect(() => {
    if (transactionState.type === "confirmedOneShot") {
      dispatchEvent("TROVE_ADJUSTED");
    }
  }, [transactionState.type, dispatchEvent]);

  useEffect(() => {
    // if (!previousTrove.current.collateral.eq(trove.collateral)) {
      // const unsavedChanges = Difference.between(collateral, previousTrove.current.collateral);
      // const nextCollateral = applyUnsavedCollateralChanges(unsavedChanges, trove);
      // setCollateral(nextCollateral);
    // }
    // if (!previousTrove.current.netDebt.eq(trove.netDebt)) {
      // const unsavedChanges = Difference.between(netDebt, previousTrove.current.netDebt);
      // const nextNetDebt = applyUnsavedNetDebtChanges(unsavedChanges, trove);
      // setNetDebt(nextNetDebt);
    // }
    previousTrove.current = trove;
  }, [trove, collateral, netDebt]);

  const isDirty = !collateral.eq(trove.collateral) || !netDebt.eq(trove.netDebt);
  const isDebtIncrease = netDebt.gt(trove.netDebt);
  const debtIncreaseAmount = isDebtIncrease ? netDebt.sub(trove.netDebt) : Decimal.ZERO;

  const fee = isDebtIncrease
    ? feeFrom(trove, new Trove(trove.collateral, trove.debt.add(debtIncreaseAmount)), borrowingRate)
    : Decimal.ZERO;
  const totalDebt = netDebt.add(NECT_LIQUIDATION_RESERVE).add(fee);
  const maxBorrowingRate = borrowingRate.add(0.005);
  const updatedTrove = isDirty ? new Trove(collateral, totalDebt) : trove;
  const availableEth = accountBalance.gt(GAS_ROOM_ETH)
    ? accountBalance.sub(GAS_ROOM_ETH)
    : Decimal.ZERO;

  const [troveChange, ] = validateTroveChange(
    trove,
    updatedTrove,
    borrowingRate,
    validationContext
  );

  const stableTroveChange = useStableTroveChange(troveChange);
  const [gasEstimationState, setGasEstimationState] = useState<GasEstimationState>({ type: "idle" });

  const isTransactionPending =
    transactionState.type === "waitingForApproval" ||
    transactionState.type === "waitingForConfirmation";

  if (trove.status !== "open") {
    return null;
  }

  const onCollateralRatioChange = (e: any) => {
    if (isNaN(Number(e.target.value))) return
    if (Number(e.target.value) <= 0) {
      setCollateral(Decimal.from(netDebt.add(NECT_LIQUIDATION_RESERVE).add(fee).mulDiv(1.1, price)))
      return
    }
    setCollateral(Decimal.from(netDebt.add(NECT_LIQUIDATION_RESERVE).add(fee).mulDiv(Number(e.target.value)/100, price)))
  }

  const onNetDebtChange = (e: any) => {
    setNetDebt(Decimal.from(e.target.value))
  }

  const onCollateralChange = (e: any) => {
    setCollateral(Decimal.from(e.target.value))
  }

  const handleRedeemTrove = useCallback(() => {
    dispatchEvent("CLOSE_TROVE_PRESSED");
  }, [dispatchEvent]);

  return (
    <>
      <div className="flex flex-row justify-between text-lg font-medium p-0 border border-dark-gray rounded-[260px]">
        <div className="bg-dark-gray text-[#150D39] w-full text-center px-5 py-[18px] rounded-l-[260px]">Borrow</div>
        <span className="cursor-pointer bg-transparent text-dark-gray w-full text-center px-5 py-[18px]" onClick={handleRedeemTrove}>Redeem</span>
        {/* {isDirty && !isTransactionPending && (
          <Button variant="titleIcon" sx={{ ":enabled:hover": { color: "danger" } }} onClick={reset}>
            <Icon name="history" size="lg" />
          </Button>
        )} */}
      </div>

      <div className="px-0 py-4 mt-[44px] text-dark-gray">
        <div className="mb-[28px]">
            <div className="flex flex-row font-medium text-lg justify-between mb-[14px]">
                <div>Pay back</div>
                <div className="flex flex-row">
                    <div>Balance</div>
                    <div className="ml-2 font-normal">{`${availableEth.prettify(4)}`} iBGT</div>
                </div>
            </div>
            <div
              // className={`flex flex-row items-center justify-between border ${editing !== "collateral" && collateral.eq(0) ? "border-[#F45348]" : "border-[#FFEDD4]"} rounded-[180px] px-5 py-[14px]`}
              className={`flex flex-row items-center justify-between border border-[#FFEDD4] rounded-[180px] px-5 py-[14px]`}
              onClick={() => setEditing("collateral")}
            >
                {/* <input 
                    className="bg-transparent text-lg w-full outline-none"
                    value={collateral.toString(4)}
                    onChange={(e) => onCollateralChange(e)}
                    onBlur={() => setEditing(undefined)}
                    onClick={() => setEditing("collateral")}
                /> */}
                {
                  editing === "collateral" ? (
                    <Input
                      autoFocus
                      id="trove-collateral"
                      type="number"
                      step="any"
                      defaultValue={collateral.toString(4)}
                      onChange={e => onCollateralChange(e)}
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
                    <div className="opacity-60">{collateral.prettify(4)}</div>
                  )
                }
                <div className="flex flex-row items-center font-medium text-lg">
                    iBGT
                </div>
            </div>
            {/* {
              editing !== "collateral" && collateral.eq(0) &&
              <span className="flex flex-row justify-end text-[#F45348] text-lg mt-1 italic">*Please enter a value</span>
            } */}
        </div>
        <div className="mb-[28px]">
            <div className="text-lg font-medium">Calculate Debt</div>
            <div className="flex flex-row items-center text-lg font-medium justify-between">
                <div className="flex flex-row gap-2">
                    <span className={`${custom?"opacity-30": "opacity-100"} cursor-pointer`} onClick={() => setCustom(!custom)}>Auto</span>
                    <span className={`${custom?"opacity-100": "opacity-30"} cursor-pointer`} onClick={() => setCustom(!custom)}>Custom</span>
                </div>
                <div
                  onClick={() => setEditing("collateral-ratio")}
                  className={`flex flex-row justify-between border ${custom?"border-[#FFEDD4]":"border-transparent"} rounded-[30px] p-[14px]`}
                >
                    {/* <input 
                        className="bg-transparent text-lg outline-none w-[100px]"
                        value={collateralRatio?.mul(100).toString(1)}
                        disabled={custom?false:true}
                        onChange={(e) => onCollateralRatioChange(e)}
                    /> */}
                    {
                      (custom && editing === "collateral-ratio") ? 
                      <Input
                        autoFocus
                        id="trove-collateral-ratio"
                        type="number"
                        step="any"
                        defaultValue={updatedTrove.collateralRatio(price).mul(100).gt(10000)?"0":updatedTrove.collateralRatio(price).mul(100).toString(1)}
                        onChange={e => onCollateralRatioChange(e)}
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
                      /> : <div>{updatedTrove.collateralRatio(price).mul(100).gt(10000)?"0":updatedTrove.collateralRatio(price).mul(100).prettify(1)}</div>
                    }
                    <div className="text-lg font-medium">%</div>
                </div>
                
            </div>
        </div>
        <div className="mb-[28px]">
            <div className="flex flex-row font-medium text-lg justify-between mb-[14px]">
                NECT to be minted
            </div>
            <div
              // className={`flex flex-row items-center justify-between border ${editing !== "netdebt" && netDebt.eq(0) ? "border-[#F45348]" : "border-[#FFEDD4]"} rounded-[180px] px-5 py-[14px]`}
              className={`flex flex-row items-center justify-between border border-[#FFEDD4] rounded-[180px] px-5 py-[14px]`}
              onClick={() => setEditing("netdebt")}
            >
                {
                  editing === "netdebt" ? (
                    <Input
                      autoFocus
                      id="trove-netdebt"
                      type="number"
                      step="any"
                      defaultValue={netDebt.toString(4)}
                      onChange={e => onNetDebtChange(e)}
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
                    <div className="opacity-60">{netDebt.prettify(4)}</div>
                  )
                }
                <div className="flex flex-row items-center font-medium text-lg">
                    NECT
                </div>
            </div>
            {/* {
              editing !== "netdebt" && netDebt.eq(0) &&
              <span className="flex flex-row justify-end text-[#F45348] text-lg mt-1 italic">*Please enter a value</span>
            } */}
        </div>
        <div className="mb-[28px]">
            <div className="flex flex-row justify-between text-lg font-normal mb-[14px]">
                <div>+ Net debt</div>
                <div>{`${netDebt.prettify(4)}`} NECT</div>
            </div>
            <div className="flex flex-row justify-between text-lg font-normal mb-[14px]">
                <div>+ Mint fee</div>
                <div>{`${fee.prettify(4)}`} NECT</div>
            </div>
            <div className="flex flex-row justify-between text-lg font-normal mb-[14px]">
                <div>+ Liquidation reserve</div>
                <div>{`${NECT_LIQUIDATION_RESERVE}`} NECT</div>
            </div>
            <div className="my-[14px] h-0 w-full border-t border-dark-gray" />
            <div className="flex flex-row justify-between text-lg font-normal mb-[14px]">
                <div>Total debt</div>
                <div>{totalDebt.prettify(2)} NECT</div>
            </div>
        </div>

        <ExpensiveTroveChangeWarning
          troveChange={stableTroveChange}
          maxBorrowingRate={maxBorrowingRate}
          borrowingFeeDecayToleranceMinutes={60}
          gasEstimationState={gasEstimationState}
          setGasEstimationState={setGasEstimationState}
        />

        {/* {description ?? <div />} */}

        <Flex variant="layout.actions">
          {
            !isTransactionPending ? 
            (gasEstimationState.type === "insufficient-allowance" ? 
            (<ApproveAction 
                troveChange={stableTroveChange}
                maxBorrowingRate={maxBorrowingRate}
                borrowingFeeDecayToleranceMinutes={60}
                gasEstimationState={gasEstimationState}
                setGasEstimationState={setGasEstimationState}
              >
                Approve
              </ApproveAction>) :
              (
                gasEstimationState.type === "inProgress" ? (
                  <Button sx={{width: "100%"}} disabled>
                    <Spinner size="24px" sx={{ color: "background" }} />
                  </Button>
                ) :
                (stableTroveChange ? (
                  <TroveAction
                    transactionId={TRANSACTION_ID}
                    change={stableTroveChange}
                    maxBorrowingRate={maxBorrowingRate}
                    borrowingFeeDecayToleranceMinutes={60}
                  >
                    Complete transaction
                  </TroveAction>
                ) : (
                  <Button sx={{width: "100%", backgroundColor: "#f6f6f6", color: "#0B1722", borderColor: "#f6f6f6"}} disabled>Complete transaction</Button>
                ))
              )
            ): (<Button sx={{width: "100%", color: "#0B1722"}} disabled>Transaction in progress</Button>)
          }
        </Flex>
      </div>
    </>
  );
};
