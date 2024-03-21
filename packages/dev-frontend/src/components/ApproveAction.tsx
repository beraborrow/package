import { Button } from "theme-ui";

import { Decimal, TroveChange } from "@beraborrow/lib-base";

import { useBeraBorrow } from "../hooks/BeraBorrowContext";
import { useBondContracts } from "./Bonds/context/useBondContracts";
import { api } from "./Bonds/context/api"
import { PopulatedEthersLiquityTransaction } from "@beraborrow/lib-ethers";
import { toast } from 'react-toastify'

export type GasEstimationState =
  | { type: "idle" | "inProgress" | "insufficient-allowance" }
  | { type: "complete"; populatedTx: PopulatedEthersLiquityTransaction };

type ApproveActionProps = {
  troveChange?: Exclude<TroveChange<Decimal>, { type: "invalidCreation" }>;
  maxBorrowingRate: Decimal;
  borrowingFeeDecayToleranceMinutes: number;
  gasEstimationState: GasEstimationState;
  setGasEstimationState: (newState: GasEstimationState) => void;
};


export const ApproveAction: React.FC<ApproveActionProps> = ({
  children,
  troveChange,
  maxBorrowingRate,
  borrowingFeeDecayToleranceMinutes,
  gasEstimationState,
  setGasEstimationState
}) => {
  const { beraborrow } = useBeraBorrow();
  const contracts = useBondContracts();

  const sendTransaction = async() => {
    setGasEstimationState({ type: "inProgress" });
    try {
      await api.approveToken(contracts.ibgtToken, beraborrow.connection.addresses.borrowerOperations, beraborrow.connection.signer)
      toast(() => (
        <div className="flex flex-row text-lg gap-2 text-[#BDFAE2]">
          <div className="flex flex-row mt-2 items-center w-[14px] h-[14px] bg-[#BDFAE2] rounded-full"/>
          Approve transaction completed.
        </div>
      ))
    } catch(e) {
      toast(() => (
        <div className="flex flex-row text-lg gap-2 text-[#F45348]">
          <div className="flex flex-row mt-2 items-center w-[14px] h-[14px] bg-[#F45348] rounded-full"/>
          Approve failed. Please try again.
        </div>
      ))
    }
    if (troveChange && troveChange.type !== "closure") {
  
        let cancelled = false;
  
        const timeoutId = setTimeout(async () => {
          let populatedTx: PopulatedEthersLiquityTransaction;
          try {
          populatedTx = await (troveChange.type === "creation"
            ? beraborrow.populate.openTrove(troveChange.params, {
                maxBorrowingRate,
                borrowingFeeDecayToleranceMinutes
              })
            : beraborrow.populate.adjustTrove(troveChange.params, {
                maxBorrowingRate,
                borrowingFeeDecayToleranceMinutes
              }));
              if (!cancelled) {
                setGasEstimationState({ type: "complete", populatedTx });
                console.log(
                  "Estimated TX cost: " +
                    Decimal.from(`${populatedTx.rawPopulatedTransaction.gasLimit}`).prettify(0)
                );
              }
          } catch(err: any) {
            if (err.message.includes ("ERC20: insufficient-allowance")) {
              setGasEstimationState({ type: "insufficient-allowance" });
            }
          }
        }, 333);
  
        return () => {
          clearTimeout(timeoutId);
          cancelled = true;
        };
      } else {
        setGasEstimationState({ type: "idle" });
      }
  }

  return <Button sx={{width: "100%", color: "#0B1722"}} onClick={sendTransaction}>{children}</Button>;
};
