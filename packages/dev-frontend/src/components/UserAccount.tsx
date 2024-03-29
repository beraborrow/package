import React, { useState } from "react";
import { Text, Flex, Button } from "theme-ui";

import { ConnectKitButton } from "connectkit";

import { useChainId } from "wagmi";
import { writeContract, prepareWriteContract, waitForTransaction } from "@wagmi/core"
import FaucetConfig from "../config/faucet.json"
import { toast } from "react-toastify"

export const UserAccount: React.FC = () => {

  const chainId = useChainId()
  const [pending, setPending] = useState(false)

  const faucet = async () => {
    if (pending) return
    setPending(true)
    try {
      let data: any = {
        chainId: chainId,
        address: FaucetConfig.address,
        abi: FaucetConfig.abi,
        functionName: "send",
        args: []
      }
      const preparedData: any = await prepareWriteContract(data)
      const writeData = await writeContract(preparedData)
      const txPendingData = waitForTransaction(writeData)
      toast.promise(txPendingData, {
        pending: "Waiting for pending... 👌",
      });
      const txData = await txPendingData;
      if (txData && txData.status === 1) {
        toast.success(`You received 2 iBGTs Successfully! 👌`)
      } else {
        toast.error("Error! Transaction is failed.");
      }
    } catch (error: any) {
      try {
        if (error?.reason) {
          toast.error(error?.reason?.replace("execution reverted: ", ""));
        } else {
          toast.error("Unknown Error! Something went wrong.");
        }
      } catch (error) {
        toast.error("Error! Something went wrong.");
      }
    }
    setPending (false)
  }

  return (
    <Flex sx={{ gap: "20px", alignItems: "center" }}>
      <img src="./faucet.svg" className="w-8 h-8 cursor-pointer" onClick={faucet} />
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
