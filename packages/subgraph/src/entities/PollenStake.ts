import { ethereum, Address, BigInt, BigDecimal } from "@graphprotocol/graph-ts";

import { PollenStakeChange, PollenStake } from "../../generated/schema";

import { decimalize, DECIMAL_ZERO, BIGINT_ZERO } from "../utils/bignumbers";

import {
  decreaseNumberOfActivePOLLENStakes,
  increaseNumberOfActivePOLLENStakes,
  increaseTotalNumberOfPOLLENStakes
} from "./Global";

import { getUser } from "./User";
import { beginChange, initChange, finishChange } from "./Change";
import { updateSystemStateByPollenStakeChange } from "./SystemState";

function startPOLLENStakeChange(event: ethereum.Event): PollenStakeChange {
  let sequenceNumber = beginChange();
  let stakeChange = new PollenStakeChange(sequenceNumber.toString());
  stakeChange.issuanceGain = DECIMAL_ZERO;
  stakeChange.redemptionGain = DECIMAL_ZERO;
  initChange(stakeChange, event, sequenceNumber);
  return stakeChange;
}

function finishPOLLENStakeChange(stakeChange: PollenStakeChange): void {
  finishChange(stakeChange);
  stakeChange.save();
}

function getUserStake(address: Address): PollenStake | null {
  let user = getUser(address);

  if (user.stake == null) {
    return null;
  }

  return PollenStake.load(user.stake);
}

function createStake(address: Address): PollenStake {
  let user = getUser(address);
  let stake = new PollenStake(address.toHexString());

  stake.owner = user.id;
  stake.amount = DECIMAL_ZERO;

  user.stake = stake.id;
  user.save();

  return stake;
}

function getOperationType(stake: PollenStake | null, nextStakeAmount: BigDecimal): string {
  let isCreating = stake.amount == DECIMAL_ZERO && nextStakeAmount > DECIMAL_ZERO;
  if (isCreating) {
    return "stakeCreated";
  }

  let isIncreasing = nextStakeAmount > stake.amount;
  if (isIncreasing) {
    return "stakeIncreased";
  }

  let isRemoving = nextStakeAmount == DECIMAL_ZERO;
  if (isRemoving) {
    return "stakeRemoved";
  }

  return "stakeDecreased";
}

export function updateStake(event: ethereum.Event, address: Address, newStake: BigInt): void {
  let stake = getUserStake(address);
  let isUserFirstStake = stake == null;

  if (stake == null) {
    stake = createStake(address);
  }

  let nextStakeAmount = decimalize(newStake);

  let stakeChange = startPOLLENStakeChange(event);
  stakeChange.stake = stake.id;
  stakeChange.stakeOperation = getOperationType(stake, nextStakeAmount);
  stakeChange.stakedAmountBefore = stake.amount;
  stakeChange.stakedAmountChange = nextStakeAmount.minus(stake.amount);
  stakeChange.stakedAmountAfter = nextStakeAmount;

  stake.amount = nextStakeAmount;

  if (stakeChange.stakeOperation == "stakeCreated") {
    if (isUserFirstStake) {
      increaseTotalNumberOfPOLLENStakes();
    } else {
      increaseNumberOfActivePOLLENStakes();
    }
  } else if (stakeChange.stakeOperation == "stakeRemoved") {
    decreaseNumberOfActivePOLLENStakes();
  }

  updateSystemStateByPollenStakeChange(stakeChange);
  finishPOLLENStakeChange(stakeChange);

  stake.save();
}

export function withdrawStakeGains(
  event: ethereum.Event,
  address: Address,
  NECTGain: BigInt,
  ETHGain: BigInt
): void {
  if (NECTGain == BIGINT_ZERO && ETHGain == BIGINT_ZERO) {
    return;
  }

  let stake = getUserStake(address) || createStake(address);
  let stakeChange: PollenStakeChange = startPOLLENStakeChange(event);
  stakeChange.stake = stake.id;
  stakeChange.stakeOperation = "gainsWithdrawn";
  stakeChange.issuanceGain = decimalize(NECTGain);
  stakeChange.redemptionGain = decimalize(ETHGain);
  stakeChange.stakedAmountBefore = stake.amount;
  stakeChange.stakedAmountChange = DECIMAL_ZERO;
  stakeChange.stakedAmountAfter = stake.amount;

  updateSystemStateByPollenStakeChange(stakeChange);
  finishPOLLENStakeChange(stakeChange);

  stake.save();
}
