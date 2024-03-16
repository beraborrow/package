import React from "react";
import { Text, Flex, Button } from "theme-ui";

import { ConnectKitButton } from "connectkit";

export const UserAccount: React.FC = () => {

  return (
    <Flex sx={{gap: "20px", alignItems: "center"}}>
      <img src="./faucet.svg" className="w-8 h-8"/>
      <ConnectKitButton.Custom>
        {connectKit => (
          <Button
            variant="outline"
            sx={{ alignItems: "center", px: 2, py: "12px" }}
            onClick={connectKit.show}
          >
            <Text as="span" sx={{ ml: 32, mr: 32, fontSize: 18 }}>
              {/* {shortenAddress(account)} */}
              Connected
            </Text>
          </Button>
        )}
      </ConnectKitButton.Custom>
    </Flex>
  );
};
