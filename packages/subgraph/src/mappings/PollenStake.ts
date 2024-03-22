import { StakeChanged, StakingGainsWithdrawn } from "../../generated/POLLENStaking/POLLENStaking";

import { updateStake, withdrawStakeGains } from "../entities/PollenStake";

export function handleStakeChanged(event: StakeChanged): void {
  updateStake(event, event.params.staker, event.params.newStake);
}

export function handleStakeGainsWithdrawn(event: StakingGainsWithdrawn): void {
  withdrawStakeGains(event, event.params.staker, event.params.NECTGain, event.params.iBGTGain);
}
