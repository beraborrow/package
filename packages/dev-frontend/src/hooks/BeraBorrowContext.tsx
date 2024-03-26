import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { Provider } from "@ethersproject/abstract-provider";
import { FallbackProvider } from "@ethersproject/providers";
import { useProvider, useSigner, useAccount, useChainId } from "wagmi";

import {
  BlockPolledBeraBorrowStore,
  EthersBeraBorrow,
  EthersBeraBorrowWithStore,
  _connectByChainId
} from "@beraborrow/lib-ethers";

import { BeraBorrowFrontendConfig, getConfig } from "../config";
import { BatchedProvider } from "../providers/BatchingProvider";

type BeraBorrowContextValue = {
  config: BeraBorrowFrontendConfig;
  account: string;
  provider: Provider;
  beraborrow: EthersBeraBorrowWithStore<BlockPolledBeraBorrowStore>;
};

const BeraBorrowContext = createContext<BeraBorrowContextValue | undefined>(undefined);

type BeraBorrowProviderProps = {
  loader?: React.ReactNode;
  unsupportedNetworkFallback?: React.ReactNode;
  unsupportedMainnetFallback?: React.ReactNode;
};

export const BeraBorrowProvider: React.FC<BeraBorrowProviderProps> = ({
  children,
  loader,
  unsupportedNetworkFallback,
  unsupportedMainnetFallback
}) => {
  const provider = useProvider<FallbackProvider>();
  const signer = useSigner();
  const account = useAccount();
  const chainId = useChainId();
  const [config, setConfig] = useState<BeraBorrowFrontendConfig>();

  const connection = useMemo(() => {
    if (config && provider && signer.data && account.address) {
      const batchedProvider = new BatchedProvider(provider, chainId);
      // batchedProvider._debugLog = true;

      try {
        return _connectByChainId(batchedProvider, signer.data, chainId, {
          userAddress: account.address,
          frontendTag: config.frontendTag,
          useStore: "blockPolled"
        });
      } catch (err) {
        console.error(err);
      }
    }
  }, [config, provider, signer.data, account.address, chainId]);

  useEffect(() => {
    getConfig().then(setConfig);
  }, []);

  if (!config || !provider || !signer.data || !account.address) {
    return <>{loader}</>;
  }

  if (config.testnetOnly && chainId === 1) {
    return <>{unsupportedMainnetFallback}</>;
  }

  if (!connection) {
    return <>{unsupportedNetworkFallback}</>;
  }

  const beraborrow = EthersBeraBorrow._from(connection);
  beraborrow.store.logging = true;

  return (
    <BeraBorrowContext.Provider
      value={{ config, account: account.address, provider: connection.provider, beraborrow }}
    >
      {children}
    </BeraBorrowContext.Provider>
  );
};

export const useBeraBorrow = () => {
  const beraborrowContext = useContext(BeraBorrowContext);

  if (!beraborrowContext) {
    throw new Error("You must provide a BeraBorrowContext via BeraBorrowProvider");
  }

  return beraborrowContext;
};
