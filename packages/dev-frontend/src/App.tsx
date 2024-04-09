import React, { useState, useMemo } from "react";
import { createClient, WagmiConfig, Chain } from "wagmi";
import { localhost } from "wagmi/chains";
import { ConnectKitProvider } from "connectkit";
import { Flex, Heading, ThemeProvider, Paragraph, Link } from "theme-ui";

import getDefaultClient from "./connectkit/defaultClient";
import { BeraBorrowProvider } from "./hooks/BeraBorrowContext";
import { WalletConnector } from "./components/WalletConnector";
import { TransactionProvider } from "./components/Transaction";
import { Icon } from "./components/Icon";
import { getConfig } from "./config";
import theme from "./theme";

import { DisposableWalletProvider } from "./testUtils/DisposableWalletProvider";
import { BeraBorrowFrontend } from "./BeraBorrowFrontend";
import { AppLoader } from "./components/AppLoader";
import { useAsyncValue } from "./hooks/AsyncValue";

import { CurPageContext } from "./contexts/CurPageContext";

const isDemoMode = import.meta.env.VITE_APP_DEMO_MODE === "true";

const berachain = {
  id: 80085,
  name: "Berachain",
  network: "bera",
  nativeCurrency: {
    decimals: 18,
    name: "BERA",
    symbol: "BERA",
  },
  rpcUrls: {
    public: { http: [import.meta.env.VITE_APP_RPC_URL] },
    default: { http: [import.meta.env.VITE_APP_RPC_URL] },
  },
} as const satisfies Chain;

if (isDemoMode) {
  const berachain = new DisposableWalletProvider(
    import.meta.env.VITE_APP_RPC_URL || `http://${window.location.hostname || "localhost"}:8545`,
    "0x4d5db4107d237df6a3d58ee5f70ae63d73d7658d4026f2eefd2f204c81682cb7"
  );

  Object.assign(window, { berachain });
}

// Start pre-fetching the config
getConfig().then(config => {
  // console.log("Frontend config:");
  // console.log(config);
  Object.assign(window, { config });
});

const UnsupportedMainnetFallback: React.FC = () => (
  <Flex
    sx={{
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      textAlign: "center"
    }}
  >
    <Heading sx={{ mb: 3 }}>
      <Icon name="exclamation-triangle" /> This app is for testing purposes only.
    </Heading>

    <Paragraph sx={{ mb: 3 }}>Please change your network to Görli or Sepolia.</Paragraph>

    <Paragraph>
      If you'd like to use the BeraBorrow Protocol on mainnet, please pick a frontend{" "}
      <Link href="https://www.beraborrow.com/frontend">
        here <Icon name="external-link-alt" size="xs" />
      </Link>
      .
    </Paragraph>
  </Flex>
);

const UnsupportedNetworkFallback: React.FC = () => (
  <Flex
    sx={{
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100vh",
      textAlign: "center"
    }}
  >
    <Heading sx={{ mb: 3 }}>
      <Icon name="exclamation-triangle" /> BeraBorrow is not supported on this network.
    </Heading>
    Please switch to mainnet, Berachain.
  </Flex>
);

const App = () => {
  const config = useAsyncValue(getConfig);
  const loader = <AppLoader />;

  const [curPage, setCurPage] = useState (0)

  const contextValue = useMemo(
    () => ({ curPage, setCurPage }),
    [curPage]
  );

  return (
    <ThemeProvider theme={theme}>
      {config.loaded && (
        <WagmiConfig
          client={createClient(
            getDefaultClient({
              appName: "BeraBorrow",
              chains:
                isDemoMode || import.meta.env.MODE === "test"
                  ? [localhost]
                  : config.value.testnetOnly
                  ? [berachain]
                  : [berachain],
              walletConnectProjectId: config.value.walletConnectProjectId,
              infuraId: config.value.infuraApiKey,
              alchemyId: config.value.alchemyApiKey
            })
          )}
        >
          <ConnectKitProvider options={{ hideBalance: true }}>
            <WalletConnector loader={loader}>
              <BeraBorrowProvider
                loader={loader}
                unsupportedNetworkFallback={<UnsupportedNetworkFallback />}
                unsupportedMainnetFallback={<UnsupportedMainnetFallback />}
              >
                <TransactionProvider>
                  <CurPageContext.Provider value={contextValue}>
                    <BeraBorrowFrontend loader={loader} />
                  </CurPageContext.Provider>
                </TransactionProvider>
              </BeraBorrowProvider>
            </WalletConnector>
          </ConnectKitProvider>
        </WagmiConfig>
      )}
    </ThemeProvider>
  );
};

export default App;
