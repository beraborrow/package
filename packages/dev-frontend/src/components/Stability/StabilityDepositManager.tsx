import React, { useEffect } from "react";
import { Button, Flex } from "theme-ui";

import { Decimal, Decimalish, BeraBorrowStoreState } from "@beraborrow/lib-base";
import { BeraBorrowStoreUpdate, useBeraBorrowReducer, useBeraBorrowSelector } from "@beraborrow/lib-react";

import { COIN } from "../../strings";

import { ActionDescription } from "../ActionDescription";
import { useMyTransactionState } from "../Transaction";

import { StabilityDepositEditor } from "./StabilityDepositEditor";
import { StabilityDepositAction } from "./StabilityDepositAction";
import { useStabilityView } from "./context/StabilityViewContext";
import {
  selectForStabilityDepositChangeValidation,
  validateStabilityDepositChange
} from "./validation/validateStabilityDepositChange";

const init = ({ stabilityDeposit }: BeraBorrowStoreState) => ({
  originalDeposit: stabilityDeposit,
  editedNECT: stabilityDeposit.currentNECT,
  changePending: false
});

type StabilityDepositManagerState = ReturnType<typeof init>;
type StabilityDepositManagerAction =
  | BeraBorrowStoreUpdate
  | { type: "startChange" | "finishChange" | "revert" }
  | { type: "setDeposit"; newValue: Decimalish };

const reduceWith = (action: StabilityDepositManagerAction) => (
  state: StabilityDepositManagerState
): StabilityDepositManagerState => reduce(state, action);

const finishChange = reduceWith({ type: "finishChange" });
const revert = reduceWith({ type: "revert" });

const reduce = (
  state: StabilityDepositManagerState,
  action: StabilityDepositManagerAction
): StabilityDepositManagerState => {
  // console.log(state);
  // console.log(action);

  const { originalDeposit, editedNECT, changePending } = state;

  switch (action.type) {
    case "startChange": {
      console.log("changeStarted");
      return { ...state, changePending: true };
    }

    case "finishChange":
      return { ...state, changePending: false };

    case "setDeposit":
      return { ...state, editedNECT: Decimal.from(action.newValue) };

    case "revert":
      return { ...state, editedNECT: originalDeposit.currentNECT };

    case "updateStore": {
      const {
        stateChange: { stabilityDeposit: updatedDeposit }
      } = action;

      if (!updatedDeposit) {
        return state;
      }

      const newState = { ...state, originalDeposit: updatedDeposit };

      const changeCommitted =
        !updatedDeposit.initialNECT.eq(originalDeposit.initialNECT) ||
        updatedDeposit.currentNECT.gt(originalDeposit.currentNECT) ||
        updatedDeposit.collateralGain.lt(originalDeposit.collateralGain) ||
        updatedDeposit.pollenReward.lt(originalDeposit.pollenReward);

      if (changePending && changeCommitted) {
        return finishChange(revert(newState));
      }

      return {
        ...newState,
        editedNECT: updatedDeposit.apply(originalDeposit.whatChanged(editedNECT))
      };
    }
  }
};

const transactionId = "stability-deposit";

export const StabilityDepositManager: React.FC = () => {
  const [{ originalDeposit, editedNECT, changePending }, dispatch] = useBeraBorrowReducer(reduce, init);
  const validationContext = useBeraBorrowSelector(selectForStabilityDepositChangeValidation);
  const { dispatchEvent } = useStabilityView();

  const [validChange, description] = validateStabilityDepositChange(
    originalDeposit,
    editedNECT,
    validationContext
  );

  const makingNewDeposit = originalDeposit.isEmpty;

  const myTransactionState = useMyTransactionState(transactionId);

  useEffect(() => {
    if (
      myTransactionState.type === "waitingForApproval" ||
      myTransactionState.type === "waitingForConfirmation"
    ) {
      dispatch({ type: "startChange" });
    } else if (myTransactionState.type === "failed" || myTransactionState.type === "cancelled") {
      dispatch({ type: "finishChange" });
    } else if (myTransactionState.type === "confirmedOneShot") {
      dispatchEvent("DEPOSIT_CONFIRMED");
    }
  }, [myTransactionState.type, dispatch, dispatchEvent]);

  return (
    <StabilityDepositEditor
      originalDeposit={originalDeposit}
      editedNECT={editedNECT}
      changePending={changePending}
      dispatch={dispatch}
    >
      {description ??
        (makingNewDeposit ? (
          <ActionDescription>Enter the amount of {COIN} you'd like to deposit.</ActionDescription>
        ) : (
          <ActionDescription>Adjust the {COIN} amount to deposit or withdraw.</ActionDescription>
        ))}

      <Flex variant="layout.actions">
        {/* <Button variant="cancel" onClick={handleCancel}>
          Cancel
        </Button> */}
        {
          !changePending ?
          (validChange ? (
            <StabilityDepositAction transactionId={transactionId} change={validChange}>
              Complete transaction
            </StabilityDepositAction>
          ) : (
            <Button style={{width: "100%", marginTop: "16px", backgroundColor: "#f6f6f6", color: "#0B1722", borderColor: "#f6f6f6"}} disabled>Complete transaction</Button>
          )) : (<Button sx={{width: "100%"}} disabled>Transaction in progress</Button>)
        }
      </Flex>
    </StabilityDepositEditor>
  );
};
