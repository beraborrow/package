import { useEffect } from "react";

import { BeraBorrowStoreState, POLLENStake } from "@beraborrow/lib-base";
import { BeraBorrowStoreUpdate, useBeraBorrowReducer } from "@beraborrow/lib-react";

import { useMyTransactionState } from "../../Transaction";

import { StakingViewAction, StakingViewContext } from "./StakingViewContext";

type StakingViewProviderAction =
  | BeraBorrowStoreUpdate
  | StakingViewAction
  | { type: "startChange" | "abortChange" };

type StakingViewProviderState = {
  pollenStake: POLLENStake;
  changePending: boolean;
  adjusting: boolean;
};

const init = ({ pollenStake }: BeraBorrowStoreState): StakingViewProviderState => ({
  pollenStake,
  changePending: false,
  adjusting: false
});

const reduce = (
  state: StakingViewProviderState,
  action: StakingViewProviderAction
): StakingViewProviderState => {
  // console.log(state);
  // console.log(action);

  switch (action.type) {
    case "startAdjusting":
      return { ...state, adjusting: true };

    case "cancelAdjusting":
      return { ...state, adjusting: false };

    case "startChange":
      return { ...state, changePending: true };

    case "abortChange":
      return { ...state, changePending: false };

    case "updateStore": {
      const {
        oldState: { pollenStake: oldStake },
        stateChange: { pollenStake: updatedStake }
      } = action;

      if (updatedStake) {
        const changeCommitted =
          !updatedStake.stakedPOLLEN.eq(oldStake.stakedPOLLEN) ||
          updatedStake.collateralGain.lt(oldStake.collateralGain) ||
          updatedStake.nectGain.lt(oldStake.nectGain);

        return {
          ...state,
          pollenStake: updatedStake,
          adjusting: false,
          changePending: changeCommitted ? false : state.changePending
        };
      }
    }
  }

  return state;
};

export const StakingViewProvider: React.FC = ({ children }) => {
  const stakingTransactionState = useMyTransactionState("stake");
  const [{ adjusting, changePending, pollenStake }, dispatch] = useBeraBorrowReducer(reduce, init);

  useEffect(() => {
    if (
      stakingTransactionState.type === "waitingForApproval" ||
      stakingTransactionState.type === "waitingForConfirmation"
    ) {
      dispatch({ type: "startChange" });
    } else if (
      stakingTransactionState.type === "failed" ||
      stakingTransactionState.type === "cancelled"
    ) {
      dispatch({ type: "abortChange" });
    }
  }, [stakingTransactionState.type, dispatch]);

  return (
    <StakingViewContext.Provider
      value={{
        view: adjusting ? "ADJUSTING" : pollenStake.isEmpty ? "NONE" : "ACTIVE",
        changePending,
        dispatch
      }}
    >
      {children}
    </StakingViewContext.Provider>
  );
};
