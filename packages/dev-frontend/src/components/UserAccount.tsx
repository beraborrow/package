import React from "react";
import { Text, Flex, Button } from "theme-ui";

import { ConnectKitButton } from "connectkit";

export const UserAccount: React.FC = () => {

  return (
    <Flex sx={{gap: "20px", alignItems: "center"}}>
      <img src="./faucet.svg" className="w-8 h-8 lg:w-[52px] lg:h-[52px]"/>
      <ConnectKitButton.Custom>
        {connectKit => (
          <Button
            variant="outline"
            sx={{ alignItems: "center", p: 2 }}
            onClick={connectKit.show}
          >
            <Text as="span" sx={{ ml: 42, mr: 42, fontSize: 18 }}>
              {/* {shortenAddress(account)} */}
              Connected
            </Text>
          </Button>
        )}
      </ConnectKitButton.Custom>
    </Flex>
  );
};
