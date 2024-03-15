import React, { useEffect, useState } from "react";
import { Card, Box, Heading, Flex, Button } from "theme-ui";
import { Empty } from "./Empty";
import { BondList } from "./BondList";
import { useBondView } from "../../context/BondViewContext";
import { BONDS } from "../../lexicon";
import { InfoIcon } from "../../../InfoIcon";
import { BNectAmmTokenIndex, SwapPressedPayload } from "../../context/transitions";
import { useBeraBorrow } from "../../../../hooks/BeraBorrowContext";
import { useBondAddresses } from "../../context/BondAddressesContext";

export const Idle: React.FC = () => {
  const { beraborrow } = useBeraBorrow();
  const { NECT_OVERRIDE_ADDRESS } = useBondAddresses();

  const { dispatchEvent, bonds, getNectFromFaucet, nectBalance, hasLoaded } = useBondView();
  const [chain, setChain] = useState<number>();

  useEffect(() => {
    (async () => {
      if (beraborrow.connection.signer === undefined || chain !== undefined) return;
      const chainId = await beraborrow.connection.signer.getChainId();
      setChain(chainId);
    })();
  }, [chain, beraborrow.connection.signer]);

  if (!hasLoaded) return null;

  const hasBonds = bonds !== undefined && bonds.length > 0;

  const showNectFaucet = NECT_OVERRIDE_ADDRESS !== null && nectBalance?.eq(0);

  const handleManageLiquidityPressed = () => dispatchEvent("MANAGE_LIQUIDITY_PRESSED");

  const handleBuyBNectPressed = () =>
    dispatchEvent("SWAP_PRESSED", { inputToken: BNectAmmTokenIndex.NECT } as SwapPressedPayload);

  const handleSellBNectPressed = () =>
    dispatchEvent("SWAP_PRESSED", { inputToken: BNectAmmTokenIndex.BNECT } as SwapPressedPayload);

  return (
    <>
      <Flex variant="layout.actions" sx={{ mt: 4, mb: 3 }}>
        <Button variant="outline" onClick={handleManageLiquidityPressed}>
          Manage liquidity
        </Button>

        <Button variant="outline" onClick={handleBuyBNectPressed}>
          Buy bNECT
        </Button>

        <Button variant="outline" onClick={handleSellBNectPressed}>
          Sell bNECT
        </Button>

        {showNectFaucet && (
          <Button variant={hasBonds ? "outline" : "primary"} onClick={() => getNectFromFaucet()}>
            Get 10k NECT
          </Button>
        )}

        {hasBonds && (
          <Button variant="primary" onClick={() => dispatchEvent("CREATE_BOND_PRESSED")}>
            Create another bond
          </Button>
        )}
      </Flex>

      {!hasBonds && (
        <Card>
          <Heading>
            <Flex>
              {BONDS.term}
              <InfoIcon
                placement="left"
                size="xs"
                tooltip={<Card variant="tooltip">{BONDS.description}</Card>}
              />
            </Flex>
          </Heading>
          <Box sx={{ p: [2, 3] }}>
            <Empty />

            <Flex variant="layout.actions" mt={4}>
              <Button variant="primary" onClick={() => dispatchEvent("CREATE_BOND_PRESSED")}>
                Create bond
              </Button>
            </Flex>
          </Box>
        </Card>
      )}

      {hasBonds && <BondList />}
    </>
  );
};
