import { Heading, Box, Card, Flex, Button } from "theme-ui";

import { BeraBorrowStoreState } from "@beraborrow/lib-base";
import { useBeraBorrowSelector } from "@beraborrow/lib-react";

import { COIN, GT } from "../../strings";

import { DisabledEditableRow, StaticRow } from "../Trove/Editor";
import { LoadingOverlay } from "../LoadingOverlay";
import { Icon } from "../Icon";

import { useStakingView } from "./context/StakingViewContext";
import { StakingGainsAction } from "./StakingGainsAction";

const select = ({ pollenStake, totalStakedPOLLEN }: BeraBorrowStoreState) => ({
  pollenStake,
  totalStakedPOLLEN
});

export const ReadOnlyStake: React.FC = () => {
  const { changePending, dispatch } = useStakingView();
  const { pollenStake, totalStakedPOLLEN } = useBeraBorrowSelector(select);

  const poolShare = pollenStake.stakedPOLLEN.mulDiv(100, totalStakedPOLLEN);

  return (
    <Card>
      <Heading>Staking</Heading>

      <Box sx={{ p: [2, 3] }}>
        <DisabledEditableRow
          label="Stake"
          inputId="stake-pollen"
          amount={pollenStake.stakedPOLLEN.prettify()}
          unit={GT}
        />

        <StaticRow
          label="Pool share"
          inputId="stake-share"
          amount={poolShare.prettify(4)}
          unit="%"
        />

        <StaticRow
          label="Redemption gain"
          inputId="stake-gain-ibgt"
          amount={pollenStake.collateralGain.prettify(4)}
          color={pollenStake.collateralGain.nonZero && "success"}
          unit="iBGT"
        />

        <StaticRow
          label="Issuance gain"
          inputId="stake-gain-nect"
          amount={pollenStake.nectGain.prettify()}
          color={pollenStake.nectGain.nonZero && "success"}
          unit={COIN}
        />

        <Flex variant="layout.actions">
          <Button variant="outline" onClick={() => dispatch({ type: "startAdjusting" })}>
            <Icon name="pen" size="sm" />
            &nbsp;Adjust
          </Button>

          <StakingGainsAction />
        </Flex>
      </Box>

      {changePending && <LoadingOverlay />}
    </Card>
  );
};
