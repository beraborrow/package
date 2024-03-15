import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { BondViewContext, BondViewContextType } from "./BondViewContext";
import type {
  Stats,
  BondView,
  BondEvent,
  Payload,
  Bond,
  BondTransactionStatuses,
  CreateBondPayload,
  ProtocolInfo,
  OptimisticBond,
  SwapPayload,
  ApprovePressedPayload,
  ManageLiquidityPayload,
  BNectLpRewards
} from "./transitions";
import { BNectAmmTokenIndex } from "./transitions";
import { transitions } from "./transitions";
import { Decimal } from "@beraborrow/lib-base";
import { useBeraBorrow } from "../../../hooks/BeraBorrowContext";
import { api, _getProtocolInfo } from "./api";
import { useTransaction } from "../../../hooks/useTransaction";
import type { ERC20Faucet } from "@beraborrow/chicken-bonds/nect/types";
import { useBondContracts } from "./useBondContracts";
import { useChainId } from "wagmi";
import { useBondAddresses } from "./BondAddressesContext";

// Refresh backend values every 15 seconds
const SYNCHRONIZE_INTERVAL_MS = 15 * 1000;

const isValidEvent = (view: BondView, event: BondEvent): boolean => {
  return transitions[view][event] !== undefined;
};

const transition = (view: BondView, event: BondEvent): BondView => {
  const nextView = transitions[view][event] ?? view;
  return nextView;
};

export const EXAMPLE_NFT = "./bonds/egg-nft.png";

export const BondViewProvider: React.FC = props => {
  const { children } = props;
  const [view, setView] = useState<BondView>("IDLE");
  const viewRef = useRef<BondView>(view);
  const [selectedBondId, setSelectedBondId] = useState<string>();
  const [optimisticBond, setOptimisticBond] = useState<OptimisticBond>();
  const [shouldSynchronize, setShouldSynchronize] = useState<boolean>(true);
  const [bonds, setBonds] = useState<Bond[]>();
  const [stats, setStats] = useState<Stats>();
  const [protocolInfo, setProtocolInfo] = useState<ProtocolInfo>();
  const [simulatedProtocolInfo, setSimulatedProtocolInfo] = useState<ProtocolInfo>();
  const [isInfiniteBondApproved, setIsInfiniteBondApproved] = useState(false);
  const [lpRewards, setLpRewards] = useState<BNectLpRewards>();
  const [isNectApprovedWithBnectAmm, setIsNectApprovedWithBnectAmm] = useState(false);
  const [isBNectApprovedWithBnectAmm, setIsBNectApprovedWithBnectAmm] = useState(false);
  const [isNectApprovedWithAmmZapper, setIsNectApprovedWithAmmZapper] = useState(false);
  const [isBNectApprovedWithAmmZapper, setIsBNectApprovedWithAmmZapper] = useState(false);
  const [isBNectLpApprovedWithAmmZapper, setIsBNectLpApprovedWithAmmZapper] = useState(false);
  const [isBNectLpApprovedWithGauge, setIsBNectLpApprovedWithGauge] = useState(false);
  const [isSynchronizing, setIsSynchronizing] = useState(false);
  const [inputToken, setInputToken] = useState<BNectAmmTokenIndex.BNECT | BNectAmmTokenIndex.NECT>(
    BNectAmmTokenIndex.BNECT
  );
  const [statuses, setStatuses] = useState<BondTransactionStatuses>({
    APPROVE: "IDLE",
    CREATE: "IDLE",
    CANCEL: "IDLE",
    CLAIM: "IDLE",
    APPROVE_AMM: "IDLE",
    APPROVE_SPENDER: "IDLE",
    SWAP: "IDLE",
    MANAGE_LIQUIDITY: "IDLE"
  });
  const [bNectBalance, setBNectBalance] = useState<Decimal>();
  const [nectBalance, setNectBalance] = useState<Decimal>();
  const [lpTokenBalance, setLpTokenBalance] = useState<Decimal>();
  const [stakedLpTokenBalance, setStakedLpTokenBalance] = useState<Decimal>();

  const [lpTokenSupply, setLpTokenSupply] = useState<Decimal>();
  const [bNectAmmBNectBalance, setBNectAmmBNectBalance] = useState<Decimal>();
  const [bNectAmmNectBalance, setBNectAmmNectBalance] = useState<Decimal>();
  const [isBootstrapPeriodActive, setIsBootstrapPeriodActive] = useState<boolean>();
  const { account, beraborrow } = useBeraBorrow();
  const {
    NECT_OVERRIDE_ADDRESS,
    BNECT_AMM_ADDRESS,
    BNECT_LP_ZAP_ADDRESS,
    BNECT_AMM_STAKING_ADDRESS
  } = useBondAddresses();
  const contracts = useBondContracts();
  const chainId = useChainId();
  const isMainnet = chainId === 1;

  const setSimulatedMarketPrice = useCallback(
    (marketPrice: Decimal) => {
      if (protocolInfo === undefined) return;
      const simulatedProtocolInfo = _getProtocolInfo(
        marketPrice,
        protocolInfo.floorPrice,
        protocolInfo.claimBondFee,
        protocolInfo.alphaAccrualFactor
      );

      setSimulatedProtocolInfo({
        ...protocolInfo,
        ...simulatedProtocolInfo,
        simulatedMarketPrice: marketPrice
      });
    },
    [protocolInfo]
  );

  const resetSimulatedMarketPrice = useCallback(() => {
    if (protocolInfo === undefined) return;

    setSimulatedProtocolInfo({ ...protocolInfo });
  }, [protocolInfo]);

  const removeBondFromList = useCallback(
    (bondId: string) => {
      if (bonds === undefined) return;
      const idx = bonds.findIndex(bond => bond.id === bondId);
      const nextBonds = bonds.slice(0, idx).concat(bonds.slice(idx + 1));
      setBonds(nextBonds);
    },
    [bonds]
  );

  const changeBondStatusToClaimed = useCallback(
    (bondId: string) => {
      if (bonds === undefined) return;
      const idx = bonds.findIndex(bond => bond.id === bondId);
      const updatedBond: Bond = { ...bonds[idx], status: "CLAIMED" };
      const nextBonds = bonds
        .slice(0, idx)
        .concat(updatedBond)
        .concat(bonds.slice(idx + 1));
      setBonds(nextBonds);
    },
    [bonds]
  );

  const getNectFromFaucet = useCallback(async () => {
    if (contracts.nectToken === undefined || beraborrow.connection.signer === undefined) return;

    if (
      NECT_OVERRIDE_ADDRESS !== null &&
      (await contracts.nectToken.balanceOf(account)).eq(0) &&
      "tap" in contracts.nectToken
    ) {
      await (
        await ((contracts.nectToken as unknown) as ERC20Faucet)
          .connect(beraborrow.connection.signer)
          .tap()
      ).wait();
      setShouldSynchronize(true);
    }
  }, [contracts.nectToken, account, NECT_OVERRIDE_ADDRESS, beraborrow.connection.signer]);

  useEffect(() => {
    (async () => {
      if (
        contracts.nectToken === undefined ||
        contracts.chickenBondManager === undefined ||
        account === undefined ||
        isInfiniteBondApproved
      )
        return;
      const isApproved = await api.isInfiniteBondApproved(
        account,
        contracts.nectToken,
        contracts.chickenBondManager
      );
      setIsInfiniteBondApproved(isApproved);
    })();
  }, [contracts.nectToken, contracts.chickenBondManager, account, isInfiniteBondApproved]);

  useEffect(() => {
    (async () => {
      if (
        BNECT_AMM_ADDRESS === null ||
        contracts.nectToken === undefined ||
        isNectApprovedWithBnectAmm
      ) {
        return;
      }
      const isApproved = await (isMainnet
        ? api.isTokenApprovedWithBNectAmmMainnet(account, contracts.nectToken)
        : api.isTokenApprovedWithBNectAmm(account, contracts.nectToken, BNECT_AMM_ADDRESS));

      setIsNectApprovedWithBnectAmm(isApproved);
    })();
  }, [contracts.nectToken, account, isNectApprovedWithBnectAmm, isMainnet, BNECT_AMM_ADDRESS]);

  useEffect(() => {
    (async () => {
      if (
        BNECT_AMM_ADDRESS === null ||
        contracts.bNectToken === undefined ||
        isBNectApprovedWithBnectAmm
      ) {
        return;
      }

      const isApproved = await (isMainnet
        ? api.isTokenApprovedWithBNectAmmMainnet(account, contracts.bNectToken)
        : api.isTokenApprovedWithBNectAmm(account, contracts.bNectToken, BNECT_AMM_ADDRESS));

      setIsBNectApprovedWithBnectAmm(isApproved);
    })();
  }, [contracts.bNectToken, account, isBNectApprovedWithBnectAmm, isMainnet, BNECT_AMM_ADDRESS]);

  useEffect(() => {
    (async () => {
      if (
        BNECT_LP_ZAP_ADDRESS === null ||
        contracts.nectToken === undefined ||
        isNectApprovedWithAmmZapper
      ) {
        return;
      }

      const isNectApproved = await api.isTokenApprovedWithAmmZapper(
        account,
        contracts.nectToken,
        BNECT_LP_ZAP_ADDRESS
      );

      setIsNectApprovedWithAmmZapper(isNectApproved);
    })();
  }, [contracts.nectToken, account, isNectApprovedWithAmmZapper, BNECT_LP_ZAP_ADDRESS]);

  useEffect(() => {
    (async () => {
      if (contracts.bNectAmm === undefined || isBNectLpApprovedWithAmmZapper) return;
      const lpToken = await api.getLpToken(contracts.bNectAmm);
      const isLpApproved = await api.isTokenApprovedWithAmmZapper(
        account,
        lpToken,
        BNECT_LP_ZAP_ADDRESS
      );

      setIsBNectLpApprovedWithAmmZapper(isLpApproved);
    })();
  }, [contracts.bNectAmm, account, isBNectLpApprovedWithAmmZapper, BNECT_LP_ZAP_ADDRESS]);

  useEffect(() => {
    (async () => {
      if (
        BNECT_LP_ZAP_ADDRESS === null ||
        contracts.bNectToken === undefined ||
        isBNectApprovedWithAmmZapper
      ) {
        return;
      }

      const isBNectApproved = await api.isTokenApprovedWithAmmZapper(
        account,
        contracts.bNectToken,
        BNECT_LP_ZAP_ADDRESS
      );

      setIsNectApprovedWithAmmZapper(isBNectApproved);
    })();
  }, [contracts.bNectToken, account, isBNectApprovedWithAmmZapper, BNECT_LP_ZAP_ADDRESS]);

  useEffect(() => {
    if (isSynchronizing) return;
    const timer = setTimeout(() => setShouldSynchronize(true), SYNCHRONIZE_INTERVAL_MS);

    return () => {
      clearTimeout(timer);
    };
  }, [isSynchronizing]);

  useEffect(() => {
    (async () => {
      try {
        if (
          contracts.nectToken === undefined ||
          contracts.bondNft === undefined ||
          contracts.chickenBondManager === undefined ||
          contracts.bNectToken === undefined ||
          contracts.bNectAmm === undefined ||
          contracts.bNectGauge === undefined ||
          !shouldSynchronize ||
          isSynchronizing
        ) {
          return;
        }
        setIsSynchronizing(true);

        const latest = await contracts.getLatestData(account, api);
        if (latest === undefined) {
          setIsSynchronizing(false);
          return;
        }

        const {
          protocolInfo,
          bonds,
          stats,
          bNectBalance,
          nectBalance,
          lpTokenBalance,
          stakedLpTokenBalance,
          lpTokenSupply,
          bNectAmmBNectBalance,
          bNectAmmNectBalance,
          lpRewards
        } = latest;

        setProtocolInfo(protocolInfo);

        // Don't change the simualted price if we already have one since only the user should change it
        if (simulatedProtocolInfo === undefined) {
          const simulatedProtocolInfo = _getProtocolInfo(
            protocolInfo.simulatedMarketPrice,
            protocolInfo.floorPrice,
            protocolInfo.claimBondFee,
            protocolInfo.alphaAccrualFactor
          );
          setSimulatedProtocolInfo({
            ...protocolInfo,
            ...simulatedProtocolInfo,
            simulatedMarketPrice: protocolInfo.simulatedMarketPrice
          });
        }

        setShouldSynchronize(false);
        setLpRewards(lpRewards);
        setBNectBalance(bNectBalance);
        setNectBalance(nectBalance);
        setLpTokenBalance(lpTokenBalance);
        setStakedLpTokenBalance(stakedLpTokenBalance);
        setLpTokenSupply(lpTokenSupply);
        setBNectAmmBNectBalance(bNectAmmBNectBalance);
        setBNectAmmNectBalance(bNectAmmNectBalance);
        setStats(stats);
        setBonds(bonds);
        setOptimisticBond(undefined);
      } catch (error: unknown) {
        console.error("Synchronising effect exception", error);
      }

      setIsSynchronizing(false);
    })();
  }, [isSynchronizing, shouldSynchronize, account, contracts, simulatedProtocolInfo]);

  const [approveInfiniteBond, approveStatus] = useTransaction(async () => {
    await api.approveInfiniteBond(
      contracts.nectToken,
      contracts.chickenBondManager,
      beraborrow.connection.signer
    );
    setIsInfiniteBondApproved(true);
  }, [contracts.nectToken, contracts.chickenBondManager, beraborrow.connection.signer]);

  const [approveAmm, approveAmmStatus] = useTransaction(
    async (tokensNeedingApproval: BNectAmmTokenIndex[]) => {
      for (const token of tokensNeedingApproval) {
        if (token === BNectAmmTokenIndex.BNECT) {
          await (isMainnet
            ? api.approveTokenWithBNectAmmMainnet(contracts.bNectToken, beraborrow.connection.signer)
            : api.approveTokenWithBNectAmm(
                contracts.bNectToken,
                BNECT_AMM_ADDRESS,
                beraborrow.connection.signer
              ));

          setIsBNectApprovedWithBnectAmm(true);
        } else {
          await (isMainnet
            ? api.approveTokenWithBNectAmmMainnet(contracts.nectToken, beraborrow.connection.signer)
            : api.approveTokenWithBNectAmm(
                contracts.nectToken,
                BNECT_AMM_ADDRESS,
                beraborrow.connection.signer
              ));

          setIsNectApprovedWithBnectAmm(true);
        }
      }
    },
    [
      contracts.bNectToken,
      contracts.nectToken,
      isMainnet,
      BNECT_AMM_ADDRESS,
      beraborrow.connection.signer
    ]
  );

  const [approveTokens, approveTokensStatus] = useTransaction(
    async ({ tokensNeedingApproval }: ApprovePressedPayload) => {
      if (contracts.bNectAmm === undefined) return;
      for (const [token, spender] of Array.from(tokensNeedingApproval)) {
        if (token === BNectAmmTokenIndex.BNECT) {
          await api.approveToken(contracts.bNectToken, spender, beraborrow.connection.signer);
          if (spender === BNECT_AMM_ADDRESS) {
            setIsBNectApprovedWithBnectAmm(true);
          } else if (spender === BNECT_LP_ZAP_ADDRESS) {
            setIsBNectApprovedWithAmmZapper(true);
          }
        } else if (token === BNectAmmTokenIndex.NECT) {
          await api.approveToken(
            contracts.nectToken,
            BNECT_LP_ZAP_ADDRESS,
            beraborrow.connection.signer
          );
          setIsNectApprovedWithAmmZapper(true);
        } else if (token === BNectAmmTokenIndex.BNECT_NECT_LP && spender === undefined) {
          const lpToken = await api.getLpToken(contracts.bNectAmm);
          await api.approveToken(lpToken, BNECT_LP_ZAP_ADDRESS, beraborrow.connection.signer);
          setIsBNectLpApprovedWithAmmZapper(true);
        } else if (token === BNectAmmTokenIndex.BNECT_NECT_LP) {
          const lpToken = await api.getLpToken(contracts.bNectAmm);
          await api.approveToken(lpToken, spender, beraborrow.connection.signer);
          if (spender === BNECT_LP_ZAP_ADDRESS) {
            setIsBNectLpApprovedWithAmmZapper(true);
          } else if (spender === BNECT_AMM_STAKING_ADDRESS) {
            setIsBNectLpApprovedWithGauge(true);
          }
        }
      }
    },
    [
      contracts.bNectAmm,
      contracts.bNectToken,
      contracts.nectToken,
      BNECT_LP_ZAP_ADDRESS,
      BNECT_AMM_STAKING_ADDRESS,
      BNECT_AMM_ADDRESS,
      beraborrow.connection.signer
    ]
  );

  const [createBond, createStatus] = useTransaction(
    async (nectAmount: Decimal) => {
      await api.createBond(
        nectAmount,
        account,
        contracts.chickenBondManager,
        beraborrow.connection.signer
      );
      const optimisticBond: OptimisticBond = {
        id: "OPTIMISTIC_BOND",
        deposit: nectAmount,
        startTime: Date.now(),
        status: "PENDING"
      };
      setOptimisticBond(optimisticBond);
      setShouldSynchronize(true);
    },
    [contracts.chickenBondManager, beraborrow.connection.signer, account]
  );

  const [cancelBond, cancelStatus] = useTransaction(
    async (bondId: string, minimumNect: Decimal) => {
      await api.cancelBond(
        bondId,
        minimumNect,
        account,
        contracts.chickenBondManager,
        beraborrow.connection.signer
      );
      removeBondFromList(bondId);
      setShouldSynchronize(true);
    },
    [contracts.chickenBondManager, removeBondFromList, beraborrow.connection.signer, account]
  );

  const [claimBond, claimStatus] = useTransaction(
    async (bondId: string) => {
      await api.claimBond(bondId, account, contracts.chickenBondManager, beraborrow.connection.signer);
      changeBondStatusToClaimed(bondId);
      setShouldSynchronize(true);
    },
    [contracts.chickenBondManager, changeBondStatusToClaimed, beraborrow.connection.signer, account]
  );

  const getExpectedSwapOutput = useCallback(
    async (inputToken: BNectAmmTokenIndex, inputAmount: Decimal) =>
      contracts.bNectAmm
        ? (isMainnet ? api.getExpectedSwapOutputMainnet : api.getExpectedSwapOutput)(
            inputToken,
            inputAmount,
            contracts.bNectAmm
          )
        : Decimal.ZERO,
    [contracts.bNectAmm, isMainnet]
  );

  const [swapTokens, swapStatus] = useTransaction(
    async (inputToken: BNectAmmTokenIndex, inputAmount: Decimal, minOutputAmount: Decimal) => {
      await (isMainnet ? api.swapTokensMainnet : api.swapTokens)(
        inputToken,
        inputAmount,
        minOutputAmount,
        contracts.bNectAmm,
        beraborrow.connection.signer,
        account
      );
      setShouldSynchronize(true);
    },
    [contracts.bNectAmm, isMainnet, beraborrow.connection.signer, account]
  );

  const getExpectedLpTokens = useCallback(
    async (bNectAmount: Decimal, nectAmount: Decimal) => {
      return contracts.bNectAmmZapper
        ? api.getExpectedLpTokens(bNectAmount, nectAmount, contracts.bNectAmmZapper)
        : Decimal.ZERO;
    },
    [contracts.bNectAmmZapper]
  );

  const [manageLiquidity, manageLiquidityStatus] = useTransaction(
    async (params: ManageLiquidityPayload) => {
      if (params.action === "addLiquidity") {
        await api.addLiquidity(
          params.bNectAmount,
          params.nectAmount,
          params.minLpTokens,
          params.shouldStakeInGauge,
          contracts.bNectAmmZapper,
          beraborrow.connection.signer,
          account
        );
      } else if (params.action === "removeLiquidity") {
        await api.removeLiquidity(
          params.burnLpTokens,
          params.minBNectAmount,
          params.minNectAmount,
          contracts.bNectAmmZapper,
          beraborrow.connection.signer
        );
      } else if (params.action === "removeLiquidityOneCoin") {
        await api.removeLiquidityOneCoin(
          params.burnLpTokens,
          params.output,
          params.minAmount,
          contracts.bNectAmmZapper,
          contracts.bNectAmm,
          beraborrow.connection.signer,
          account
        );
      } else if (params.action === "stakeLiquidity") {
        await api.stakeLiquidity(
          params.stakeAmount,
          contracts.bNectGauge,
          beraborrow.connection.signer
        );
      } else if (params.action === "unstakeLiquidity") {
        await api.unstakeLiquidity(
          params.unstakeAmount,
          contracts.bNectGauge,
          beraborrow.connection.signer
        );
      } else if (params.action === "claimLpRewards") {
        await api.claimLpRewards(contracts.bNectGauge, beraborrow.connection.signer);
      }
      setShouldSynchronize(true);
    },
    [
      contracts.bNectAmmZapper,
      contracts.bNectGauge,
      contracts.bNectAmm,
      beraborrow.connection.signer,
      account
    ]
  );

  const getExpectedWithdrawal = useCallback(
    async (
      burnLp: Decimal,
      output: BNectAmmTokenIndex | "both"
    ): Promise<Map<BNectAmmTokenIndex, Decimal>> => {
      if (contracts.bNectAmm === undefined)
        return new Map([
          [BNectAmmTokenIndex.NECT, Decimal.ZERO],
          [BNectAmmTokenIndex.BNECT, Decimal.ZERO]
        ]);

      return contracts.bNectAmmZapper
        ? api.getExpectedWithdrawal(burnLp, output, contracts.bNectAmmZapper, contracts.bNectAmm)
        : new Map();
    },
    [contracts.bNectAmmZapper, contracts.bNectAmm]
  );

  const selectedBond = useMemo(() => bonds?.find(bond => bond.id === selectedBondId), [
    bonds,
    selectedBondId
  ]);

  const dispatchEvent = useCallback(
    async (event: BondEvent, payload?: Payload) => {
      if (!isValidEvent(viewRef.current, event)) {
        console.error("invalid event", event, payload, "in view", viewRef.current);
        return;
      }

      const nextView = transition(viewRef.current, event);
      setView(nextView);

      if (payload && "bondId" in payload && payload.bondId !== selectedBondId) {
        setSelectedBondId(payload.bondId);
      }

      if (payload && "inputToken" in payload && payload.inputToken !== inputToken) {
        setInputToken(payload.inputToken);
      }

      const isCurrentViewEvent = (_view: BondView, _event: BondEvent) =>
        viewRef.current === _view && event === _event;

      try {
        if (isCurrentViewEvent("CREATING", "APPROVE_PRESSED")) {
          await approveInfiniteBond();
        } else if (isCurrentViewEvent("CREATING", "CONFIRM_PRESSED")) {
          await createBond((payload as CreateBondPayload).deposit);
          await dispatchEvent("CREATE_BOND_CONFIRMED");
        } else if (isCurrentViewEvent("CANCELLING", "CONFIRM_PRESSED")) {
          if (selectedBond === undefined) {
            console.error(
              "dispatchEvent() handler: attempted to cancel a bond without selecting a bond"
            );
            return;
          }
          await cancelBond(selectedBond.id, selectedBond.deposit);
          await dispatchEvent("CANCEL_BOND_CONFIRMED");
        } else if (isCurrentViewEvent("CLAIMING", "CONFIRM_PRESSED")) {
          if (selectedBond === undefined) {
            console.error(
              "dispatchEvent() handler: attempted to claim a bond without selecting a bond"
            );
            return;
          }
          await claimBond(selectedBond.id);
          await dispatchEvent("CLAIM_BOND_CONFIRMED");
        } else if (isCurrentViewEvent("SWAPPING", "APPROVE_PRESSED")) {
          await approveAmm([inputToken]);
        } else if (isCurrentViewEvent("SWAPPING", "CONFIRM_PRESSED")) {
          const { inputAmount, minOutputAmount } = payload as SwapPayload;
          await swapTokens(inputToken, inputAmount, minOutputAmount);
          await dispatchEvent("SWAP_CONFIRMED");
        } else if (isCurrentViewEvent("MANAGING_LIQUIDITY", "APPROVE_PRESSED")) {
          await approveTokens(payload as ApprovePressedPayload);
        } else if (isCurrentViewEvent("MANAGING_LIQUIDITY", "CONFIRM_PRESSED")) {
          await manageLiquidity(payload as ManageLiquidityPayload);
          await dispatchEvent("MANAGE_LIQUIDITY_CONFIRMED");
        }
      } catch (error: unknown) {
        console.error("dispatchEvent(), event handler failed\n\n", error);
      }
    },
    [
      selectedBondId,
      approveInfiniteBond,
      cancelBond,
      createBond,
      claimBond,
      selectedBond,
      approveAmm,
      approveTokens,
      swapTokens,
      inputToken,
      manageLiquidity
    ]
  );

  useEffect(() => {
    setStatuses(statuses => ({
      ...statuses,
      APPROVE: approveStatus,
      CREATE: createStatus,
      CANCEL: cancelStatus,
      CLAIM: claimStatus,
      APPROVE_AMM: approveAmmStatus,
      APPROVE_SPENDER: approveTokensStatus,
      SWAP: swapStatus,
      MANAGE_LIQUIDITY: manageLiquidityStatus
    }));
  }, [
    approveStatus,
    createStatus,
    cancelStatus,
    claimStatus,
    approveAmmStatus,
    approveTokensStatus,
    swapStatus,
    manageLiquidityStatus
  ]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    (async () => {
      if (
        bonds === undefined ||
        protocolInfo === undefined ||
        contracts.chickenBondManager === undefined
      )
        return;

      if (protocolInfo.bNectSupply.gt(0)) {
        setIsBootstrapPeriodActive(false);
        return;
      }

      const bootstrapPeriodMs =
        (await contracts.chickenBondManager.BOOTSTRAP_PERIOD_CHICKEN_IN()).toNumber() * 1000;

      const anyBondOlderThanBootstrapPeriod =
        bonds.find(bond => Date.now() - bond.startTime > bootstrapPeriodMs) !== undefined;

      setIsBootstrapPeriodActive(!anyBondOlderThanBootstrapPeriod);
    })();
  }, [bonds, protocolInfo, contracts.chickenBondManager]);

  const provider: BondViewContextType = {
    view,
    dispatchEvent,
    selectedBondId,
    optimisticBond,
    protocolInfo,
    stats,
    bonds,
    statuses,
    selectedBond,
    bNectBalance,
    nectBalance,
    lpTokenBalance,
    stakedLpTokenBalance,
    lpTokenSupply,
    bNectAmmBNectBalance,
    bNectAmmNectBalance,
    isInfiniteBondApproved,
    isSynchronizing,
    getNectFromFaucet,
    setSimulatedMarketPrice,
    resetSimulatedMarketPrice,
    simulatedProtocolInfo,
    hasFoundContracts: contracts.hasFoundContracts,
    isBNectApprovedWithBnectAmm,
    isNectApprovedWithBnectAmm,
    isNectApprovedWithAmmZapper,
    isBNectApprovedWithAmmZapper,
    isBNectLpApprovedWithAmmZapper,
    isBNectLpApprovedWithGauge,
    inputToken,
    isInputTokenApprovedWithBNectAmm:
      inputToken === BNectAmmTokenIndex.BNECT
        ? isBNectApprovedWithBnectAmm
        : isNectApprovedWithBnectAmm,
    getExpectedSwapOutput,
    getExpectedLpTokens,
    getExpectedWithdrawal,
    isBootstrapPeriodActive,
    hasLoaded: protocolInfo !== undefined && bonds !== undefined,
    addresses: contracts.addresses,
    lpRewards
  };

  // window.__BERABORROW_BONDS__ = provider.current;

  return <BondViewContext.Provider value={provider}>{children}</BondViewContext.Provider>;
};
