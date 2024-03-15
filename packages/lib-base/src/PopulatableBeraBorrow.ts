import { Decimal, Decimalish } from "./Decimal";
import { TroveAdjustmentParams, TroveCreationParams } from "./Trove";
import { BeraBorrowReceipt, SendableBeraBorrow, SentBeraBorrowTransaction } from "./SendableBeraBorrow";

import {
  CollateralGainTransferDetails,
  LiquidationDetails,
  RedemptionDetails,
  StabilityDepositChangeDetails,
  StabilityPoolGainsWithdrawalDetails,
  TroveAdjustmentDetails,
  TroveClosureDetails,
  TroveCreationDetails
} from "./TransactableBeraBorrow";

/**
 * A transaction that has been prepared for sending.
 *
 * @remarks
 * Implemented by {@link @beraborrow/lib-ethers#PopulatedEthersBeraBorrowTransaction}.
 *
 * @public
 */
export interface PopulatedBeraBorrowTransaction<
  P = unknown,
  T extends SentBeraBorrowTransaction = SentBeraBorrowTransaction
> {
  /** Implementation-specific populated transaction object. */
  readonly rawPopulatedTransaction: P;

  /**
   * Send the transaction.
   *
   * @returns An object that implements {@link @beraborrow/lib-base#SentBeraBorrowTransaction}.
   */
  send(): Promise<T>;
}

/**
 * A redemption transaction that has been prepared for sending.
 *
 * @remarks
 * The BeraBorrow protocol fulfills redemptions by repaying the debt of Troves in ascending order of
 * their collateralization ratio, and taking a portion of their collateral in exchange. Due to the
 * {@link @beraborrow/lib-base#NECT_MINIMUM_DEBT | minimum debt} requirement that Troves must fulfill,
 * some NECT amounts are not possible to redeem exactly.
 *
 * When {@link @beraborrow/lib-base#PopulatableBeraBorrow.redeemNECT | redeemNECT()} is called with an
 * amount that can't be fully redeemed, the amount will be truncated (see the `redeemableNECTAmount`
 * property). When this happens, the redeemer can either redeem the truncated amount by sending the
 * transaction unchanged, or prepare a new transaction by
 * {@link @beraborrow/lib-base#PopulatedRedemption.increaseAmountByMinimumNetDebt | increasing the amount}
 * to the next lowest possible value, which is the sum of the truncated amount and
 * {@link @beraborrow/lib-base#NECT_MINIMUM_NET_DEBT}.
 *
 * @public
 */
export interface PopulatedRedemption<P = unknown, S = unknown, R = unknown>
  extends PopulatedBeraBorrowTransaction<
    P,
    SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, RedemptionDetails>>
  > {
  /** Amount of NECT the redeemer is trying to redeem. */
  readonly attemptedNECTAmount: Decimal;

  /** Maximum amount of NECT that is currently redeemable from `attemptedNECTAmount`. */
  readonly redeemableNECTAmount: Decimal;

  /** Whether `redeemableNECTAmount` is less than `attemptedNECTAmount`. */
  readonly isTruncated: boolean;

  /**
   * Prepare a new transaction by increasing the attempted amount to the next lowest redeemable
   * value.
   *
   * @param maxRedemptionRate - Maximum acceptable
   *                            {@link @beraborrow/lib-base#Fees.redemptionRate | redemption rate} to
   *                            use in the new transaction.
   *
   * @remarks
   * If `maxRedemptionRate` is omitted, the original transaction's `maxRedemptionRate` is reused
   * unless that was also omitted, in which case the current redemption rate (based on the increased
   * amount) plus 0.1% is used as maximum acceptable rate.
   */
  increaseAmountByMinimumNetDebt(
    maxRedemptionRate?: Decimalish
  ): Promise<PopulatedRedemption<P, S, R>>;
}

/** @internal */
export type _PopulatableFrom<T, P> = {
  [M in keyof T]: T[M] extends (...args: infer A) => Promise<infer U>
    ? U extends SentBeraBorrowTransaction
      ? (...args: A) => Promise<PopulatedBeraBorrowTransaction<P, U>>
      : never
    : never;
};

/**
 * Prepare BeraBorrow transactions for sending.
 *
 * @remarks
 * The functions return an object implementing {@link PopulatedBeraBorrowTransaction}, which can be
 * used to send the transaction and get a {@link SentBeraBorrowTransaction}.
 *
 * Implemented by {@link @beraborrow/lib-ethers#PopulatableEthersBeraBorrow}.
 *
 * @public
 */
export interface PopulatableBeraBorrow<R = unknown, S = unknown, P = unknown>
  extends _PopulatableFrom<SendableBeraBorrow<R, S>, P> {
  // Methods re-declared for documentation purposes

  /** {@inheritDoc TransactableBeraBorrow.openTrove} */
  openTrove(
    params: TroveCreationParams<Decimalish>,
    maxBorrowingRate?: Decimalish
  ): Promise<
    PopulatedBeraBorrowTransaction<
      P,
      SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, TroveCreationDetails>>
    >
  >;

  /** {@inheritDoc TransactableBeraBorrow.closeTrove} */
  closeTrove(): Promise<
    PopulatedBeraBorrowTransaction<P, SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, TroveClosureDetails>>>
  >;

  /** {@inheritDoc TransactableBeraBorrow.adjustTrove} */
  adjustTrove(
    params: TroveAdjustmentParams<Decimalish>,
    maxBorrowingRate?: Decimalish
  ): Promise<
    PopulatedBeraBorrowTransaction<
      P,
      SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, TroveAdjustmentDetails>>
    >
  >;

  /** {@inheritDoc TransactableBeraBorrow.depositCollateral} */
  depositCollateral(
    amount: Decimalish
  ): Promise<
    PopulatedBeraBorrowTransaction<
      P,
      SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, TroveAdjustmentDetails>>
    >
  >;

  /** {@inheritDoc TransactableBeraBorrow.withdrawCollateral} */
  withdrawCollateral(
    amount: Decimalish
  ): Promise<
    PopulatedBeraBorrowTransaction<
      P,
      SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, TroveAdjustmentDetails>>
    >
  >;

  /** {@inheritDoc TransactableBeraBorrow.borrowNECT} */
  borrowNECT(
    amount: Decimalish,
    maxBorrowingRate?: Decimalish
  ): Promise<
    PopulatedBeraBorrowTransaction<
      P,
      SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, TroveAdjustmentDetails>>
    >
  >;

  /** {@inheritDoc TransactableBeraBorrow.repayNECT} */
  repayNECT(
    amount: Decimalish
  ): Promise<
    PopulatedBeraBorrowTransaction<
      P,
      SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, TroveAdjustmentDetails>>
    >
  >;

  /** @internal */
  setPrice(
    price: Decimalish
  ): Promise<PopulatedBeraBorrowTransaction<P, SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>>;

  /** {@inheritDoc TransactableBeraBorrow.liquidate} */
  liquidate(
    address: string | string[]
  ): Promise<
    PopulatedBeraBorrowTransaction<P, SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, LiquidationDetails>>>
  >;

  /** {@inheritDoc TransactableBeraBorrow.liquidateUpTo} */
  liquidateUpTo(
    maximumNumberOfTrovesToLiquidate: number
  ): Promise<
    PopulatedBeraBorrowTransaction<P, SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, LiquidationDetails>>>
  >;

  /** {@inheritDoc TransactableBeraBorrow.depositNECTInStabilityPool} */
  depositNECTInStabilityPool(
    amount: Decimalish,
    frontendTag?: string
  ): Promise<
    PopulatedBeraBorrowTransaction<
      P,
      SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, StabilityDepositChangeDetails>>
    >
  >;

  /** {@inheritDoc TransactableBeraBorrow.withdrawNECTFromStabilityPool} */
  withdrawNECTFromStabilityPool(
    amount: Decimalish
  ): Promise<
    PopulatedBeraBorrowTransaction<
      P,
      SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, StabilityDepositChangeDetails>>
    >
  >;

  /** {@inheritDoc TransactableBeraBorrow.withdrawGainsFromStabilityPool} */
  withdrawGainsFromStabilityPool(): Promise<
    PopulatedBeraBorrowTransaction<
      P,
      SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, StabilityPoolGainsWithdrawalDetails>>
    >
  >;

  /** {@inheritDoc TransactableBeraBorrow.transferCollateralGainToTrove} */
  transferCollateralGainToTrove(): Promise<
    PopulatedBeraBorrowTransaction<
      P,
      SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, CollateralGainTransferDetails>>
    >
  >;

  /** {@inheritDoc TransactableBeraBorrow.sendNECT} */
  sendNECT(
    toAddress: string,
    amount: Decimalish
  ): Promise<PopulatedBeraBorrowTransaction<P, SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>>;

  /** {@inheritDoc TransactableBeraBorrow.sendPOLLEN} */
  sendPOLLEN(
    toAddress: string,
    amount: Decimalish
  ): Promise<PopulatedBeraBorrowTransaction<P, SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>>;

  /** {@inheritDoc TransactableBeraBorrow.redeemNECT} */
  redeemNECT(
    amount: Decimalish,
    maxRedemptionRate?: Decimalish
  ): Promise<PopulatedRedemption<P, S, R>>;

  /** {@inheritDoc TransactableBeraBorrow.claimCollateralSurplus} */
  claimCollateralSurplus(): Promise<
    PopulatedBeraBorrowTransaction<P, SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>
  >;

  /** {@inheritDoc TransactableBeraBorrow.stakePOLLEN} */
  stakePOLLEN(
    amount: Decimalish
  ): Promise<PopulatedBeraBorrowTransaction<P, SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>>;

  /** {@inheritDoc TransactableBeraBorrow.unstakePOLLEN} */
  unstakePOLLEN(
    amount: Decimalish
  ): Promise<PopulatedBeraBorrowTransaction<P, SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>>;

  /** {@inheritDoc TransactableBeraBorrow.withdrawGainsFromStaking} */
  withdrawGainsFromStaking(): Promise<
    PopulatedBeraBorrowTransaction<P, SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>
  >;

  /** {@inheritDoc TransactableBeraBorrow.approveUniTokens} */
  approveUniTokens(
    allowance?: Decimalish
  ): Promise<PopulatedBeraBorrowTransaction<P, SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>>;

  /** {@inheritDoc TransactableBeraBorrow.stakeUniTokens} */
  stakeUniTokens(
    amount: Decimalish
  ): Promise<PopulatedBeraBorrowTransaction<P, SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>>;

  /** {@inheritDoc TransactableBeraBorrow.unstakeUniTokens} */
  unstakeUniTokens(
    amount: Decimalish
  ): Promise<PopulatedBeraBorrowTransaction<P, SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>>;

  /** {@inheritDoc TransactableBeraBorrow.withdrawPOLLENRewardFromLiquidityMining} */
  withdrawPOLLENRewardFromLiquidityMining(): Promise<
    PopulatedBeraBorrowTransaction<P, SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>
  >;

  /** {@inheritDoc TransactableBeraBorrow.exitLiquidityMining} */
  exitLiquidityMining(): Promise<
    PopulatedBeraBorrowTransaction<P, SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>
  >;

  /** {@inheritDoc TransactableBeraBorrow.registerFrontend} */
  registerFrontend(
    kickbackRate: Decimalish
  ): Promise<PopulatedBeraBorrowTransaction<P, SentBeraBorrowTransaction<S, BeraBorrowReceipt<R, void>>>>;
}
