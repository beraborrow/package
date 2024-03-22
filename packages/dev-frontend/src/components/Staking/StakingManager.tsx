import React from "react";
import { Button, Flex } from "theme-ui";

import {
  Decimal,
  Decimalish,
  BeraBorrowStoreState,
  POLLENStake,
  POLLENStakeChange
} from "@beraborrow/lib-base";

import { LiquityStoreUpdate, useLiquityReducer, useLiquitySelector } from "@beraborrow/lib-react";

import { GT, COIN } from "../../strings";

import { useStakingView } from "./context/StakingViewContext";
import { StakingEditor } from "./StakingEditor";
import { StakingManagerAction } from "./StakingManagerAction";
import { ActionDescription, Amount } from "../ActionDescription";
import { ErrorDescription } from "../ErrorDescription";

const init = ({ pollenStake }: BeraBorrowStoreState) => ({
  originalStake: pollenStake,
  editedPOLLEN: pollenStake.stakedPOLLEN
});

type StakeManagerState = ReturnType<typeof init>;
type StakeManagerAction =
  | LiquityStoreUpdate
  | { type: "revert" }
  | { type: "setStake"; newValue: Decimalish };

const reduce = (state: StakeManagerState, action: StakeManagerAction): StakeManagerState => {
  // console.log(state);
  // console.log(action);

  const { originalStake, editedPOLLEN } = state;

  switch (action.type) {
    case "setStake":
      return { ...state, editedPOLLEN: Decimal.from(action.newValue) };

    case "revert":
      return { ...state, editedPOLLEN: originalStake.stakedPOLLEN };

    case "updateStore": {
      const {
        stateChange: { pollenStake: updatedStake }
      } = action;

      if (updatedStake) {
        return {
          originalStake: updatedStake,
          editedPOLLEN: updatedStake.apply(originalStake.whatChanged(editedPOLLEN))
        };
      }
    }
  }

  return state;
};

const selectPOLLENBalance = ({ pollenBalance }: BeraBorrowStoreState) => pollenBalance;

type StakingManagerActionDescriptionProps = {
  originalStake: POLLENStake;
  change: POLLENStakeChange<Decimal>;
};

const StakingManagerActionDescription: React.FC<StakingManagerActionDescriptionProps> = ({
  originalStake,
  change
}) => {
  const stakePOLLEN = change.stakePOLLEN?.prettify().concat(" ", GT);
  const unstakePOLLEN = change.unstakePOLLEN?.prettify().concat(" ", GT);
  const collateralGain = originalStake.collateralGain.nonZero?.prettify(4).concat(" iBGT");
  const nectGain = originalStake.nectGain.nonZero?.prettify().concat(" ", COIN);

  if (originalStake.isEmpty && stakePOLLEN) {
    return (
      <ActionDescription>
        You are staking <Amount>{stakePOLLEN}</Amount>.
      </ActionDescription>
    );
  }

  return (
    <ActionDescription>
      {stakePOLLEN && (
        <>
          You are adding <Amount>{stakePOLLEN}</Amount> to your stake
        </>
      )}
      {unstakePOLLEN && (
        <>
          You are withdrawing <Amount>{unstakePOLLEN}</Amount> to your wallet
        </>
      )}
      {(collateralGain || nectGain) && (
        <>
          {" "}
          and claiming{" "}
          {collateralGain && nectGain ? (
            <>
              <Amount>{collateralGain}</Amount> and <Amount>{nectGain}</Amount>
            </>
          ) : (
            <>
              <Amount>{collateralGain ?? nectGain}</Amount>
            </>
          )}
        </>
      )}
      .
    </ActionDescription>
  );
};

export const StakingManager: React.FC = () => {
  const { dispatch: dispatchStakingViewAction } = useStakingView();
  const [{ originalStake, editedPOLLEN }, dispatch] = useLiquityReducer(reduce, init);
  const pollenBalance = useLiquitySelector(selectPOLLENBalance);

  const change = originalStake.whatChanged(editedPOLLEN);
  const [validChange, description] = !change
    ? [undefined, undefined]
    : change.stakePOLLEN?.gt(pollenBalance)
    ? [
        undefined,
        <ErrorDescription>
          The amount you're trying to stake exceeds your balance by{" "}
          <Amount>
            {change.stakePOLLEN.sub(pollenBalance).prettify()} {GT}
          </Amount>
          .
        </ErrorDescription>
      ]
    : [change, <StakingManagerActionDescription originalStake={originalStake} change={change} />];

  const makingNewStake = originalStake.isEmpty;

  return (
    <StakingEditor title={"Staking"} {...{ originalStake, editedPOLLEN, dispatch }}>
      {description ??
        (makingNewStake ? (
          <ActionDescription>Enter the amount of {GT} you'd like to stake.</ActionDescription>
        ) : (
          <ActionDescription>Adjust the {GT} amount to stake or withdraw.</ActionDescription>
        ))}

      <Flex variant="layout.actions">
        <Button
          variant="cancel"
          onClick={() => dispatchStakingViewAction({ type: "cancelAdjusting" })}
        >
          Cancel
        </Button>

        {validChange ? (
          <StakingManagerAction change={validChange}>Confirm</StakingManagerAction>
        ) : (
          <Button disabled>Confirm</Button>
        )}
      </Flex>
    </StakingEditor>
  );
};
