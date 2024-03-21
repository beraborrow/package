import { Decimal } from "@beraborrow/lib-base";
import {
  BNECTLPZap,
  BNECTLPZap__factory,
  BNECTToken,
  BondNFT,
  ChickenBondManager,
  ERC20Faucet,
  ERC20Faucet__factory
} from "@beraborrow/chicken-bonds/nect/types";
import {
  CurveCryptoSwap2ETH,
  CurveLiquidityGaugeV5__factory
} from "@beraborrow/chicken-bonds/nect/types/external";
import { CurveCryptoSwap2ETH__factory } from "@beraborrow/chicken-bonds/nect/types/external";
import {
  BNECTToken__factory,
  BondNFT__factory,
  ChickenBondManager__factory
} from "@beraborrow/chicken-bonds/nect/types";
import type { NECTToken,IERC20 } from "@beraborrow/lib-ethers/dist/types";
import NECTTokenAbi from "@beraborrow/lib-ethers/abi/NECTToken.json";
import IERC20Abi from "@beraborrow/lib-ethers/abi/IERC20.json";
import { useContract } from "../../../hooks/useContract";
import { useBeraBorrow } from "../../../hooks/BeraBorrowContext";
import { useCallback } from "react";
import type { BondsApi } from "./api";
import type { BNectLpRewards, Bond, ProtocolInfo, Stats } from "./transitions";
import { BNectAmmTokenIndex } from "./transitions";
import type { Addresses } from "./transitions";
import { useChainId } from "wagmi";
import { useBondAddresses } from "./BondAddressesContext";
import type { CurveLiquidityGaugeV5 } from "@beraborrow/chicken-bonds/nect/types/external/CurveLiquidityGaugeV5";

type BondsInformation = {
  protocolInfo: ProtocolInfo;
  bonds: Bond[];
  stats: Stats;
  bNectBalance: Decimal;
  nectBalance: Decimal;
  lpTokenBalance: Decimal;
  stakedLpTokenBalance: Decimal;
  lpTokenSupply: Decimal;
  bNectAmmBNectBalance: Decimal;
  bNectAmmNectBalance: Decimal;
  lpRewards: BNectLpRewards;
};

type BondContracts = {
  addresses: Addresses;
  nectToken: NECTToken | undefined;
  ibgtToken: IERC20 | undefined
  bNectToken: BNECTToken | undefined;
  bondNft: BondNFT | undefined;
  chickenBondManager: ChickenBondManager | undefined;
  bNectAmm: CurveCryptoSwap2ETH | undefined;
  bNectAmmZapper: BNECTLPZap | undefined;
  bNectGauge: CurveLiquidityGaugeV5 | undefined;
  hasFoundContracts: boolean;
  getLatestData: (account: string, api: BondsApi) => Promise<BondsInformation | undefined>;
};

export const useBondContracts = (): BondContracts => {
  const { beraborrow } = useBeraBorrow();
  const chainId = useChainId();
  const isMainnet = chainId === 1;

  const addresses = useBondAddresses();

  const {
    BNECT_AMM_ADDRESS,
    BNECT_TOKEN_ADDRESS,
    BOND_NFT_ADDRESS,
    CHICKEN_BOND_MANAGER_ADDRESS,
    NECT_OVERRIDE_ADDRESS,
    BNECT_LP_ZAP_ADDRESS,
    BNECT_AMM_STAKING_ADDRESS
  } = addresses;

  const [nectTokenDefault, nectTokenDefaultStatus] = useContract<NECTToken>(
    beraborrow.connection.addresses.nectToken,
    NECTTokenAbi
  );

  const [ibgtTokenDefault,] = useContract<IERC20>(
    beraborrow.connection.addresses.iBGTToken,
    IERC20Abi
  );

  const [nectTokenOverride, nectTokenOverrideStatus] = useContract<ERC20Faucet>(
    NECT_OVERRIDE_ADDRESS,
    ERC20Faucet__factory.abi
  );

  const [nectToken, nectTokenStatus] =
    NECT_OVERRIDE_ADDRESS === null
      ? [nectTokenDefault, nectTokenDefaultStatus]
      : [(nectTokenOverride as unknown) as NECTToken, nectTokenOverrideStatus];

  const [ibgtToken] = [ibgtTokenDefault]
  
  const [bNectToken, bNectTokenStatus] = useContract<BNECTToken>(
    BNECT_TOKEN_ADDRESS,
    BNECTToken__factory.abi
  );

  const [bondNft, bondNftStatus] = useContract<BondNFT>(BOND_NFT_ADDRESS, BondNFT__factory.abi);
  const [chickenBondManager, chickenBondManagerStatus] = useContract<ChickenBondManager>(
    CHICKEN_BOND_MANAGER_ADDRESS,
    ChickenBondManager__factory.abi
  );

  const [bNectAmm, bNectAmmStatus] = useContract<CurveCryptoSwap2ETH>(
    BNECT_AMM_ADDRESS,
    CurveCryptoSwap2ETH__factory.abi
  );

  const [bNectAmmZapper, bNectAmmZapperStatus] = useContract<BNECTLPZap>(
    BNECT_LP_ZAP_ADDRESS,
    BNECTLPZap__factory.abi
  );

  const [bNectGauge, bNectGaugeStatus] = useContract<CurveLiquidityGaugeV5>(
    BNECT_AMM_STAKING_ADDRESS,
    CurveLiquidityGaugeV5__factory.abi
  );

  const hasFoundContracts =
    [
      nectTokenStatus,
      bondNftStatus,
      chickenBondManagerStatus,
      bNectTokenStatus,
      bNectAmmStatus,
      ...(isMainnet ? [bNectAmmZapperStatus] : []),
      bNectGaugeStatus
    ].find(status => status === "FAILED") === undefined;

  const getLatestData = useCallback(
    async (account: string, api: BondsApi): Promise<BondsInformation | undefined> => {
      if (
        nectToken === undefined ||
        bondNft === undefined ||
        chickenBondManager === undefined ||
        bNectToken === undefined ||
        bNectAmm === undefined ||
        bNectGauge === undefined
      ) {
        return undefined;
      }

      const protocolInfoPromise = api.getProtocolInfo(
        bNectToken,
        bNectAmm,
        chickenBondManager,
        isMainnet
      );

      const bondsPromise = api.getAccountBonds(
        account,
        bondNft,
        chickenBondManager,
        await protocolInfoPromise
      );

      const [protocolInfo, stats, lpToken] = await Promise.all([
        protocolInfoPromise,
        api.getStats(chickenBondManager),
        api.getLpToken(bNectAmm)
      ]);

      const [
        bNectBalance,
        nectBalance,
        lpTokenBalance,
        stakedLpTokenBalance,
        lpTokenSupply,
        bNectAmmCoinBalances,
        lpRewards
      ] = await Promise.all([
        api.getTokenBalance(account, bNectToken),
        api.getTokenBalance(account, nectToken),
        api.getTokenBalance(account, lpToken),
        isMainnet ? api.getTokenBalance(account, bNectGauge) : Decimal.ZERO,
        api.getTokenTotalSupply(lpToken),
        api.getCoinBalances(bNectAmm),
        isMainnet ? api.getLpRewards(account, bNectGauge) : []
      ]);

      const bonds = await bondsPromise;

      return {
        protocolInfo,
        bonds,
        stats,
        bNectBalance,
        nectBalance,
        lpTokenBalance,
        stakedLpTokenBalance,
        lpTokenSupply,
        bNectAmmBNectBalance: bNectAmmCoinBalances[BNectAmmTokenIndex.BNECT],
        bNectAmmNectBalance: bNectAmmCoinBalances[BNectAmmTokenIndex.NECT],
        lpRewards
      };
    },
    [chickenBondManager, bondNft, bNectToken, nectToken, bNectAmm, isMainnet, bNectGauge]
  );

  return {
    addresses,
    nectToken,
    ibgtToken,
    bNectToken,
    bondNft,
    chickenBondManager,
    bNectAmm,
    bNectAmmZapper,
    bNectGauge,
    getLatestData,
    hasFoundContracts
  };
};
