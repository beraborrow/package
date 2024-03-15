import { createContext, useContext } from "react";
import type {
  BondView,
  BondEvent,
  Payload,
  Bond,
  Stats,
  BondTransactionStatuses,
  ProtocolInfo,
  OptimisticBond,
  BNectAmmTokenIndex,
  Addresses,
  BNectLpRewards
} from "./transitions";
import { PENDING_STATUS, CANCELLED_STATUS, CLAIMED_STATUS } from "../lexicon";
import { Decimal } from "@beraborrow/lib-base";

export type BondViewContextType = {
  view: BondView;
  dispatchEvent: (event: BondEvent, payload?: Payload) => void;
  selectedBondId?: string;
  protocolInfo?: ProtocolInfo;
  stats?: Stats;
  bonds?: Bond[];
  selectedBond?: Bond;
  optimisticBond?: OptimisticBond;
  bNectBalance?: Decimal;
  nectBalance?: Decimal;
  lpTokenBalance?: Decimal;
  stakedLpTokenBalance?: Decimal;
  lpTokenSupply?: Decimal;
  bNectAmmBNectBalance?: Decimal;
  bNectAmmNectBalance?: Decimal;
  statuses: BondTransactionStatuses;
  isInfiniteBondApproved: boolean;
  isSynchronizing: boolean;
  getNectFromFaucet: () => Promise<void>;
  simulatedProtocolInfo?: ProtocolInfo;
  setSimulatedMarketPrice: (marketPrice: Decimal) => void;
  resetSimulatedMarketPrice: () => void;
  hasFoundContracts: boolean;
  isBNectApprovedWithBnectAmm: boolean;
  isNectApprovedWithBnectAmm: boolean;
  isNectApprovedWithAmmZapper: boolean;
  isBNectApprovedWithAmmZapper: boolean;
  isBNectLpApprovedWithAmmZapper: boolean;
  isBNectLpApprovedWithGauge: boolean;
  inputToken: BNectAmmTokenIndex.BNECT | BNectAmmTokenIndex.NECT;
  isInputTokenApprovedWithBNectAmm: boolean;
  getExpectedSwapOutput: (inputToken: BNectAmmTokenIndex, inputAmount: Decimal) => Promise<Decimal>;
  getExpectedLpTokens: (bNectAmount: Decimal, nectAmount: Decimal) => Promise<Decimal>;
  getExpectedWithdrawal: (
    burnLp: Decimal,
    output: BNectAmmTokenIndex | "both"
  ) => Promise<Map<BNectAmmTokenIndex, Decimal>>;
  isBootstrapPeriodActive?: boolean;
  hasLoaded: boolean;
  addresses: Addresses;
  lpRewards: BNectLpRewards | undefined;
};

export const BondViewContext = createContext<BondViewContextType | null>(null);

export const useBondView = (): BondViewContextType => {
  const context: BondViewContextType | null = useContext(BondViewContext);

  if (context === null) {
    throw new Error("You must add a <BondViewProvider> into the React tree");
  }

  return context;
};

export const statuses = {
  PENDING: PENDING_STATUS.term,
  CANCELLED: CANCELLED_STATUS.term,
  CLAIMED: CLAIMED_STATUS.term,
  NON_EXISTENT: "NON_EXISTENT"
};
