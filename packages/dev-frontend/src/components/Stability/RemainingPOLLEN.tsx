import React from "react";
import { Flex } from "theme-ui";

import { BeraBorrowStoreState } from "@beraborrow/lib-base";
import { useBeraBorrowSelector } from "@beraborrow/lib-react";

const selector = ({ remainingStabilityPoolPOLLENReward }: BeraBorrowStoreState) => ({
  remainingStabilityPoolPOLLENReward
});

export const RemainingPOLLEN: React.FC = () => {
  const { remainingStabilityPoolPOLLENReward } = useBeraBorrowSelector(selector);

  return (
    <Flex sx={{ mr: 2, fontSize: 2, fontWeight: "medium" }}>
      {remainingStabilityPoolPOLLENReward.prettify(0)} POLLEN remaining
    </Flex>
  );
};
