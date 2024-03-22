import React, { useEffect, useState } from "react";
import { Card, Paragraph, Text } from "theme-ui";
import { Decimal, BeraBorrowStoreState } from "@beraborrow/lib-base";
import { useLiquitySelector } from "@beraborrow/lib-react";
import { InfoIcon } from "../InfoIcon";
import { Badge } from "../Badge";
import { fetchPollenPrice } from "./context/fetchPollenPrice";

const selector = ({ nectInStabilityPool, remainingStabilityPoolPOLLENReward }: BeraBorrowStoreState) => ({
  nectInStabilityPool,
  remainingStabilityPoolPOLLENReward
});

const yearlyIssuanceFraction = 0.5;
const dailyIssuanceFraction = Decimal.from(1 - yearlyIssuanceFraction ** (1 / 365));
const dailyIssuancePercentage = dailyIssuanceFraction.mul(100);

export const Yield: React.FC = () => {
  const { nectInStabilityPool, remainingStabilityPoolPOLLENReward } = useLiquitySelector(selector);

  const [pollenPrice, setPollenPrice] = useState<Decimal | undefined>(undefined);
  const hasZeroValue = remainingStabilityPoolPOLLENReward.isZero || nectInStabilityPool.isZero;

  useEffect(() => {
    (async () => {
      try {
        const { pollenPriceUSD } = await fetchPollenPrice();
        setPollenPrice(pollenPriceUSD);
      } catch (error) {
        console.error(error);
      }
    })();
  }, []);

  if (hasZeroValue || pollenPrice === undefined) return null;

  const pollenIssuanceOneDay = remainingStabilityPoolPOLLENReward.mul(dailyIssuanceFraction);
  const pollenIssuanceOneDayInUSD = pollenIssuanceOneDay.mul(pollenPrice);
  const aprPercentage = pollenIssuanceOneDayInUSD.mulDiv(365 * 100, nectInStabilityPool);
  const remainingPollenInUSD = remainingStabilityPoolPOLLENReward.mul(pollenPrice);

  if (aprPercentage.isZero) return null;

  return (
    <Badge>
      <Text>POLLEN APR {aprPercentage.toString(2)}%</Text>
      <InfoIcon
        tooltip={
          <Card variant="tooltip" sx={{ width: ["220px", "518px"] }}>
            <Paragraph>
              An <Text sx={{ fontWeight: "bold" }}>estimate</Text> of the POLLEN return on the NECT
              deposited to the Stability Pool over the next year, not including your iBGT gains from
              liquidations.
            </Paragraph>
            <Paragraph sx={{ fontSize: "12px", fontFamily: "monospace", mt: 2 }}>
              ($POLLEN_REWARDS * DAILY_ISSUANCE% / DEPOSITED_NECT) * 365 * 100 ={" "}
              <Text sx={{ fontWeight: "bold" }}> APR</Text>
            </Paragraph>
            <Paragraph sx={{ fontSize: "12px", fontFamily: "monospace" }}>
              ($
              {remainingPollenInUSD.shorten()} * {dailyIssuancePercentage.toString(4)}% / $
              {nectInStabilityPool.shorten()}) * 365 * 100 =
              <Text sx={{ fontWeight: "bold" }}> {aprPercentage.toString(2)}%</Text>
            </Paragraph>
          </Card>
        }
      ></InfoIcon>
    </Badge>
  );
};
