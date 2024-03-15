import { Decimalish } from "./Decimal";
import { TroveAdjustmentParams, TroveCreationParams } from "./Trove";

import {
  CollateralGainTransferDetails,
  LiquidationDetails,
  RedemptionDetails,
  StabilityDepositChangeDetails,
  StabilityPoolGainsWithdrawalDetails,
  TransactableBeraBorrow,
  TroveAdjustmentDetails,
  TroveClosureDetails,
  TroveCreationDetails
} from "./TransactableBeraBorrow";

/**
 * A transaction that has already been sent.
 *
 * @remarks
 * Implemented by {@link @beraborrow/lib-ethers#SentEthersBeraBorrowTransaction}.
 *
 * @public
 */
export interface SentBeraBorrowTransaction<S = unknown, T extends BeraBorrowReceipt = BeraBorrowReceipt> {
  /** Implementation-specific sent transaction object. */
  readonly rawSentTransaction: S;

  /**
   * Check whether the transaction has been mined, and whether it was successful.
   *
   * @remarks
   * Unlike {@link @beraborrow/lib-base#SentBeraBorrowTransaction.waitForReceipt | waitForReceipt()},
   * this function doesn't wait for the transaction to be mined.
   */
  getReceipt(): Promise<T>;

  /**
   * Wait for the transaction to be mined, and check whether it was successful.
   *
   * @returns Either a {@link @beraborrow/lib-base#FailedReceipt} or a
   *          {@link @beraborrow/lib-base#SuccessfulReceipt}.
   */
  waitForReceipt(): Promise<Extract<T, MinedReceipt>>;
}

/**
 * Indicates that the transaction hasn't been mined yet.
 *
 * @remarks
 * Returned by {@link SentBeraBorrowTransaction.getReceipt}.
 *
 * @public
 */
export type PendingReceipt = { status: "pending" };

/** @internal */
export const _pendingReceipt: PendingReceipt = { status: "pending" };

/**
 * Indicates that the transaction has been mined, but it failed.
 *
 * @remarks
 * The `rawReceipt` property is an implementation-specific transaction receipt object.
 *
 * Returned by {@link SentBeraBorrowTransaction.getReceipt} and
 * {@link SentBeraBorrowTransaction.waitForReceipt}.
 *
 * @public
 */
export type FailedReceipt<R = unknown> = { status: "failed"; rawReceipt: R };

/** @internal */
export const _failedReceipt = <R>(rawReceipt: R): FailedReceipt<R> => ({
  status: "failed",
  rawReceipt
});

/**
 * Indicates that the transaction has succeeded.
 *
 * @remarks
 * The `rawReceipt` property is an implementation-specific transaction receipt object.
 *
 * The `details` property may contain more information about the transaction.
 * See the return types of {@link TransactableBeraBorrow} functions for the exact contents of `details`
 * for each type of BeraBorrow transaction.
 *
 * Returned by {@link SentBeraBorrowTransaction.getReceipt} and
 * {@link SentBeraBorrowTransaction.waitForReceipt}.
 *
 * @public
 */
export type SuccessfulReceipt<R = unknown, D = unknown> = {
  status: "succeeded";
  rawReceipt: R;
  details: D;
};

/** @internal */
export const _successfulReceipt = <R, D>(
  rawReceipt: R,
  details: D,
  toString?: () => string
): SuccessfulReceipt<R, D> => ({
  status: "succeeded",
  rawReceipt,
  details,
  ...(toString ? { toString } : {})
});

/**
 * Either a {@link FailedReceipt} or a {@link SuccessfulReceipt}.
 *
 * @public
 */
export type MinedReceipt<R = unknown, D = unknown> = FailedReceipt<R> | SuccessfulReceipt<R, D>;

/**
 * One of either a {@link PendingReceipt}, a {@link FailedReceipt} or a {@link SuccessfulReceipt}.
 *
 * @public
 */
export type BeraBorrowReceipt<R = unknown, D = unknown> = PendingReceipt | MinedReceipt<R, D>;

/** @internal */
export type _SendableFrom<T, R, S> = {
  [M in keyof T]: T[M] extends (...args: infer A) => Promise<infer D>
    ? (...args: A) => Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, D>>>
    : never;
};

/**
 * Send BeraBorrow transactions.
 *
 * @remarks
 * The functions return an object implementing {@link SentBeraBorrowTransaction}, which can be used
 * to monitor the transaction and get its details when it succeeds.
 *
 * Implemented by {@link @beraborrow/lib-ethers#SendableEthersBeraBorrow}.
 *
 * @public
 */
export interface SendableBeraBorrow<R = unknown, S = unknown>
  extends _SendableFrom<TransactableBeraBorrow, R, S> {
  // Methods re-declared for documentation purposes

  /** {@inheritDoc TransactableBeraBorrow.openTrove} */
  openTrove(
    params: TroveCreationParams<Decimalish>,
    maxBorrowingRate?: Decimalish
  ): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, TroveCreationDetails>>>;

  /** {@inheritDoc TransactableBeraBorrow.closeTrove} */
  closeTrove(): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, TroveClosureDetails>>>;

  /** {@inheritDoc TransactableBeraBorrow.adjustTrove} */
  adjustTrove(
    params: TroveAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish
  ): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, TroveAdjustmentDetails>>>;

  /** {@inheritDoc TransactableBeraBorrow.depositCollateral} */
  depositCollateral(
    amount: Decimalish
  ): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, TroveAdjustmentDetails>>>;

  /** {@inheritDoc TransactableBeraBorrow.withdrawCollateral} */
  withdrawCollateral(
    amount: Decimalish
  ): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, TroveAdjustmentDetails>>>;

  /** {@inheritDoc TransactableBeraBorrow.borrowNECT} */
  borrowNECT(
    amount: Decimalish,
    maxBorrowingRate?: Decimalish
  ): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, TroveAdjustmentDetails>>>;

  /** {@inheritDoc TransactableBeraBorrow.repayNECT} */
  repayNECT(
    amount: Decimalish
  ): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, TroveAdjustmentDetails>>>;

  /** @internal */
  setPrice(price: Decimalish): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>;

  /** {@inheritDoc TransactableBeraBorrow.liquidate} */
  liquidate(
    address: string | string[]
  ): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, LiquidationDetails>>>;

  /** {@inheritDoc TransactableBeraBorrow.liquidateUpTo} */
  liquidateUpTo(
    maximumNumberOfTrovesToLiquidate: number
  ): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, LiquidationDetails>>>;

  /** {@inheritDoc TransactableBeraBorrow.depositNECTInStabilityPool} */
  depositNECTInStabilityPool(
    amount: Decimalish,
    frontendTag?: string
  ): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, StabilityDepositChangeDetails>>>;

  /** {@inheritDoc TransactableBeraBorrow.withdrawNECTFromStabilityPool} */
  withdrawNECTFromStabilityPool(
    amount: Decimalish
  ): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, StabilityDepositChangeDetails>>>;

  /** {@inheritDoc TransactableBeraBorrow.withdrawGainsFromStabilityPool} */
  withdrawGainsFromStabilityPool(): Promise<
    SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, StabilityPoolGainsWithdrawalDetails>>
  >;

  /** {@inheritDoc TransactableBeraBorrow.transferCollateralGainToTrove} */
  transferCollateralGainToTrove(): Promise<
    SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, CollateralGainTransferDetails>>
  >;

  /** {@inheritDoc TransactableBeraBorrow.sendNECT} */
  sendNECT(
    toAddress: string,
    amount: Decimalish
  ): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>;

  /** {@inheritDoc TransactableBeraBorrow.sendPOLLEN} */
  sendPOLLEN(
    toAddress: string,
    amount: Decimalish
  ): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>;

  /** {@inheritDoc TransactableBeraBorrow.redeemNECT} */
  redeemNECT(
    amount: Decimalish,
    maxRedemptionRate?: Decimalish
  ): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, RedemptionDetails>>>;

  /** {@inheritDoc TransactableBeraBorrow.claimCollateralSurplus} */
  claimCollateralSurplus(): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>;

  /** {@inheritDoc TransactableBeraBorrow.stakePOLLEN} */
  stakePOLLEN(amount: Decimalish): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>;

  /** {@inheritDoc TransactableBeraBorrow.unstakePOLLEN} */
  unstakePOLLEN(amount: Decimalish): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>;

  /** {@inheritDoc TransactableBeraBorrow.withdrawGainsFromStaking} */
  withdrawGainsFromStaking(): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>;

  /** {@inheritDoc TransactableBeraBorrow.approveUniTokens} */
  approveUniTokens(
    allowance?: Decimalish
  ): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>;

  /** {@inheritDoc TransactableBeraBorrow.stakeUniTokens} */
  stakeUniTokens(amount: Decimalish): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>;

  /** {@inheritDoc TransactableBeraBorrow.unstakeUniTokens} */
  unstakeUniTokens(amount: Decimalish): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>;

  /** {@inheritDoc TransactableBeraBorrow.withdrawPOLLENRewardFromLiquidityMining} */
  withdrawPOLLENRewardFromLiquidityMining(): Promise<
    SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>
  >;

  /** {@inheritDoc TransactableBeraBorrow.exitLiquidityMining} */
  exitLiquidityMining(): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>;

  /** {@inheritDoc TransactableBeraBorrow.registerFrontend} */
  registerFrontend(
    kickbackRate: Decimalish
  ): Promise<SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>;
}
