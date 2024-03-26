import { BlockTag } from "@ethersproject/abstract-provider";

import {
  CollateralGainTransferDetails,
  Decimal,
  Decimalish,
  FailedReceipt,
  Fees,
  FrontendStatus,
  LiquidationDetails,
  BeraBorrowStore,
  POLLENStake,
  RedemptionDetails,
  StabilityDeposit,
  StabilityDepositChangeDetails,
  StabilityPoolGainsWithdrawalDetails,
  TransactableBeraBorrow,
  TransactionFailedError,
  Trove,
  TroveAdjustmentDetails,
  TroveAdjustmentParams,
  TroveClosureDetails,
  TroveCreationDetails,
  TroveCreationParams,
  TroveListingParams,
  TroveWithPendingRedistribution,
  UserTrove
} from "@beraborrow/lib-base";

import {
  EthersBeraBorrowConnection,
  EthersBeraBorrowConnectionOptionalParams,
  EthersBeraBorrowStoreOption,
  _connect,
  _usingStore
} from "./EthersBeraBorrowConnection";

import {
  EthersCallOverrides,
  EthersProvider,
  EthersSigner,
  EthersTransactionOverrides,
  EthersTransactionReceipt
} from "./types";

import {
  BorrowingOperationOptionalParams,
  PopulatableEthersBeraBorrow,
  SentEthersBeraBorrowTransaction
} from "./PopulatableEthersBeraBorrow";
import { ReadableEthersBeraBorrow, ReadableEthersBeraBorrowWithStore } from "./ReadableEthersBeraBorrow";
import { SendableEthersBeraBorrow } from "./SendableEthersBeraBorrow";
import { BlockPolledBeraBorrowStore } from "./BlockPolledBeraBorrowStore";

/**
 * Thrown by {@link EthersBeraBorrow} in case of transaction failure.
 *
 * @public
 */
export class EthersTransactionFailedError extends TransactionFailedError<
  FailedReceipt<EthersTransactionReceipt>
> {
  constructor(message: string, failedReceipt: FailedReceipt<EthersTransactionReceipt>) {
    super("EthersTransactionFailedError", message, failedReceipt);
  }
}

const waitForSuccess = async <T>(tx: SentEthersBeraBorrowTransaction<T>) => {
  const receipt = await tx.waitForReceipt();

  if (receipt.status !== "succeeded") {
    throw new EthersTransactionFailedError("Transaction failed", receipt);
  }

  return receipt.details;
};

/**
 * Convenience class that combines multiple interfaces of the library in one object.
 *
 * @public
 */
export class EthersBeraBorrow implements ReadableEthersBeraBorrow, TransactableBeraBorrow {
  /** Information about the connection to the BeraBorrow protocol. */
  readonly connection: EthersBeraBorrowConnection;

  /** Can be used to create populated (unsigned) transactions. */
  readonly populate: PopulatableEthersBeraBorrow;

  /** Can be used to send transactions without waiting for them to be mined. */
  readonly send: SendableEthersBeraBorrow;

  private _readable: ReadableEthersBeraBorrow;

  /** @internal */
  constructor(readable: ReadableEthersBeraBorrow) {
    this._readable = readable;
    this.connection = readable.connection;
    this.populate = new PopulatableEthersBeraBorrow(readable);
    this.send = new SendableEthersBeraBorrow(this.populate);
  }

  /** @internal */
  static _from(
    connection: EthersBeraBorrowConnection & { useStore: "blockPolled" }
  ): EthersBeraBorrowWithStore<BlockPolledBeraBorrowStore>;

  /** @internal */
  static _from(connection: EthersBeraBorrowConnection): EthersBeraBorrow;

  /** @internal */
  static _from(connection: EthersBeraBorrowConnection): EthersBeraBorrow {
    if (_usingStore(connection)) {
      return new _EthersBeraBorrowWithStore(ReadableEthersBeraBorrow._from(connection));
    } else {
      return new EthersBeraBorrow(ReadableEthersBeraBorrow._from(connection));
    }
  }

  /** @internal */
  static connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams: EthersBeraBorrowConnectionOptionalParams & { useStore: "blockPolled" }
  ): Promise<EthersBeraBorrowWithStore<BlockPolledBeraBorrowStore>>;

  /**
   * Connect to the BeraBorrow protocol and create an `EthersBeraBorrow` object.
   *
   * @param signerOrProvider - Ethers `Signer` or `Provider` to use for connecting to the Ethereum
   *                           network.
   * @param optionalParams - Optional parameters that can be used to customize the connection.
   */
  static connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams?: EthersBeraBorrowConnectionOptionalParams
  ): Promise<EthersBeraBorrow>;

  static async connect(
    signerOrProvider: EthersSigner | EthersProvider,
    optionalParams?: EthersBeraBorrowConnectionOptionalParams
  ): Promise<EthersBeraBorrow> {
    return EthersBeraBorrow._from(await _connect(signerOrProvider, optionalParams));
  }

  /**
   * Check whether this `EthersBeraBorrow` is an {@link EthersBeraBorrowWithStore}.
   */
  // @ts-ignore
  hasStore(): this is EthersBeraBorrowWithStore;

  /**
   * Check whether this `EthersBeraBorrow` is an
   * {@link EthersBeraBorrowWithStore}\<{@link BlockPolledBeraBorrowStore}\>.
   */
  // @ts-ignore
  hasStore(store: "blockPolled"): this is EthersBeraBorrowWithStore<BlockPolledBeraBorrowStore>;

  // @ts-ignore
  hasStore(): boolean {
    return false;
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getTotalRedistributed} */
  getTotalRedistributed(overrides?: EthersCallOverrides): Promise<Trove> {
    return this._readable.getTotalRedistributed(overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getTroveBeforeRedistribution} */
  getTroveBeforeRedistribution(
    address?: string,
    overrides?: EthersCallOverrides
  ): Promise<TroveWithPendingRedistribution> {
    return this._readable.getTroveBeforeRedistribution(address, overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getTrove} */
  getTrove(address?: string, overrides?: EthersCallOverrides): Promise<UserTrove> {
    return this._readable.getTrove(address, overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getNumberOfTroves} */
  getNumberOfTroves(overrides?: EthersCallOverrides): Promise<number> {
    return this._readable.getNumberOfTroves(overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getPrice} */
  getPrice(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getPrice(overrides);
  }

  /** @internal */
  _getActivePool(overrides?: EthersCallOverrides): Promise<Trove> {
    return this._readable._getActivePool(overrides);
  }

  /** @internal */
  _getDefaultPool(overrides?: EthersCallOverrides): Promise<Trove> {
    return this._readable._getDefaultPool(overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getTotal} */
  getTotal(overrides?: EthersCallOverrides): Promise<Trove> {
    return this._readable.getTotal(overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getStabilityDeposit} */
  getStabilityDeposit(address?: string, overrides?: EthersCallOverrides): Promise<StabilityDeposit> {
    return this._readable.getStabilityDeposit(address, overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getRemainingStabilityPoolPOLLENReward} */
  getRemainingStabilityPoolPOLLENReward(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getRemainingStabilityPoolPOLLENReward(overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getNECTInStabilityPool} */
  getNECTInStabilityPool(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getNECTInStabilityPool(overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getNECTBalance} */
  getNECTBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getNECTBalance(address, overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getPOLLENBalance} */
  getPOLLENBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getPOLLENBalance(address, overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getUniTokenBalance} */
  getUniTokenBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getUniTokenBalance(address, overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getUniTokenAllowance} */
  getUniTokenAllowance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getUniTokenAllowance(address, overrides);
  }

  /** @internal */
  _getRemainingLiquidityMiningPOLLENRewardCalculator(
    overrides?: EthersCallOverrides
  ): Promise<(blockTimestamp: number) => Decimal> {
    return this._readable._getRemainingLiquidityMiningPOLLENRewardCalculator(overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getRemainingLiquidityMiningPOLLENReward} */
  getRemainingLiquidityMiningPOLLENReward(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getRemainingLiquidityMiningPOLLENReward(overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getLiquidityMiningStake} */
  getLiquidityMiningStake(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getLiquidityMiningStake(address, overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getTotalStakedUniTokens} */
  getTotalStakedUniTokens(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getTotalStakedUniTokens(overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getLiquidityMiningPOLLENReward} */
  getLiquidityMiningPOLLENReward(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getLiquidityMiningPOLLENReward(address, overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getCollateralSurplusBalance} */
  getCollateralSurplusBalance(address?: string, overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getCollateralSurplusBalance(address, overrides);
  }

  /** @internal */
  getTroves(
    params: TroveListingParams & { beforeRedistribution: true },
    overrides?: EthersCallOverrides
  ): Promise<TroveWithPendingRedistribution[]>;

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.(getTroves:2)} */
  getTroves(params: TroveListingParams, overrides?: EthersCallOverrides): Promise<UserTrove[]>;

  getTroves(params: TroveListingParams, overrides?: EthersCallOverrides): Promise<UserTrove[]> {
    return this._readable.getTroves(params, overrides);
  }

  /** @internal */
  _getBlockTimestamp(blockTag?: BlockTag): Promise<number> {
    return this._readable._getBlockTimestamp(blockTag);
  }

  /** @internal */
  _getFeesFactory(
    overrides?: EthersCallOverrides
  ): Promise<(blockTimestamp: number, recoveryMode: boolean) => Fees> {
    return this._readable._getFeesFactory(overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getFees} */
  getFees(overrides?: EthersCallOverrides): Promise<Fees> {
    return this._readable.getFees(overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getPOLLENStake} */
  getPOLLENStake(address?: string, overrides?: EthersCallOverrides): Promise<POLLENStake> {
    return this._readable.getPOLLENStake(address, overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getTotalStakedPOLLEN} */
  getTotalStakedPOLLEN(overrides?: EthersCallOverrides): Promise<Decimal> {
    return this._readable.getTotalStakedPOLLEN(overrides);
  }

  /** {@inheritDoc @beraborrow/lib-base#ReadableBeraBorrow.getFrontendStatus} */
  getFrontendStatus(address?: string, overrides?: EthersCallOverrides): Promise<FrontendStatus> {
    return this._readable.getFrontendStatus(address, overrides);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.openTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  openTrove(
    params: TroveCreationParams<Decimalish>,
    maxBorrowingRateOrOptionalParams?: Decimalish | BorrowingOperationOptionalParams,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveCreationDetails> {
    return this.send
      .openTrove(params, maxBorrowingRateOrOptionalParams, overrides)
      .then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.closeTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  closeTrove(overrides?: EthersTransactionOverrides): Promise<TroveClosureDetails> {
    return this.send.closeTrove(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.adjustTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  adjustTrove(
    params: TroveAdjustmentParams<Decimalish>,
    maxBorrowingRateOrOptionalParams?: Decimalish | BorrowingOperationOptionalParams,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveAdjustmentDetails> {
    return this.send
      .adjustTrove(params, maxBorrowingRateOrOptionalParams, overrides)
      .then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.depositCollateral}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  depositCollateral(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveAdjustmentDetails> {
    return this.send.depositCollateral(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.withdrawCollateral}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  withdrawCollateral(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveAdjustmentDetails> {
    return this.send.withdrawCollateral(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.borrowNECT}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  borrowNECT(
    amount: Decimalish,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveAdjustmentDetails> {
    return this.send.borrowNECT(amount, maxBorrowingRate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.repayNECT}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  repayNECT(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<TroveAdjustmentDetails> {
    return this.send.repayNECT(amount, overrides).then(waitForSuccess);
  }

  /** @internal */
  setPrice(price: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.setPrice(price, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.liquidate}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  liquidate(
    address: string | string[],
    overrides?: EthersTransactionOverrides
  ): Promise<LiquidationDetails> {
    return this.send.liquidate(address, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.liquidateUpTo}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  liquidateUpTo(
    maximumNumberOfTrovesToLiquidate: number,
    overrides?: EthersTransactionOverrides
  ): Promise<LiquidationDetails> {
    return this.send.liquidateUpTo(maximumNumberOfTrovesToLiquidate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.depositNECTInStabilityPool}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  depositNECTInStabilityPool(
    amount: Decimalish,
    frontendTag?: string,
    overrides?: EthersTransactionOverrides
  ): Promise<StabilityDepositChangeDetails> {
    return this.send.depositNECTInStabilityPool(amount, frontendTag, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.withdrawNECTFromStabilityPool}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  withdrawNECTFromStabilityPool(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<StabilityDepositChangeDetails> {
    return this.send.withdrawNECTFromStabilityPool(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.withdrawGainsFromStabilityPool}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  withdrawGainsFromStabilityPool(
    overrides?: EthersTransactionOverrides
  ): Promise<StabilityPoolGainsWithdrawalDetails> {
    return this.send.withdrawGainsFromStabilityPool(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.transferCollateralGainToTrove}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  transferCollateralGainToTrove(
    overrides?: EthersTransactionOverrides
  ): Promise<CollateralGainTransferDetails> {
    return this.send.transferCollateralGainToTrove(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.sendNECT}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  sendNECT(
    toAddress: string,
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<void> {
    return this.send.sendNECT(toAddress, amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.sendPOLLEN}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  sendPOLLEN(
    toAddress: string,
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<void> {
    return this.send.sendPOLLEN(toAddress, amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.redeemNECT}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  redeemNECT(
    amount: Decimalish,
    maxRedemptionRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<RedemptionDetails> {
    return this.send.redeemNECT(amount, maxRedemptionRate, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.claimCollateralSurplus}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  claimCollateralSurplus(overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.claimCollateralSurplus(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.stakePOLLEN}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  stakePOLLEN(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.stakePOLLEN(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.unstakePOLLEN}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  unstakePOLLEN(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.unstakePOLLEN(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.withdrawGainsFromStaking}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  withdrawGainsFromStaking(overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.withdrawGainsFromStaking(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.registerFrontend}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  registerFrontend(kickbackRate: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.registerFrontend(kickbackRate, overrides).then(waitForSuccess);
  }

  /** @internal */
  _mintUniToken(
    amount: Decimalish,
    address?: string,
    overrides?: EthersTransactionOverrides
  ): Promise<void> {
    return this.send._mintUniToken(amount, address, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.approveUniTokens}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  approveUniTokens(allowance?: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.approveUniTokens(allowance, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.stakeUniTokens}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  stakeUniTokens(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.stakeUniTokens(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.unstakeUniTokens}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  unstakeUniTokens(amount: Decimalish, overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.unstakeUniTokens(amount, overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.withdrawPOLLENRewardFromLiquidityMining}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  withdrawPOLLENRewardFromLiquidityMining(overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.withdrawPOLLENRewardFromLiquidityMining(overrides).then(waitForSuccess);
  }

  /**
   * {@inheritDoc @beraborrow/lib-base#TransactableBeraBorrow.exitLiquidityMining}
   *
   * @throws
   * Throws {@link EthersTransactionFailedError} in case of transaction failure.
   * Throws {@link EthersTransactionCancelledError} if the transaction is cancelled or replaced.
   */
  exitLiquidityMining(overrides?: EthersTransactionOverrides): Promise<void> {
    return this.send.exitLiquidityMining(overrides).then(waitForSuccess);
  }
}

/**
 * Variant of {@link EthersBeraBorrow} that exposes a {@link @beraborrow/lib-base#BeraBorrowStore}.
 *
 * @public
 */
export interface EthersBeraBorrowWithStore<T extends BeraBorrowStore = BeraBorrowStore>
  extends EthersBeraBorrow {
  /** An object that implements BeraBorrowStore. */
  readonly store: T;
}

class _EthersBeraBorrowWithStore<T extends BeraBorrowStore = BeraBorrowStore>
  extends EthersBeraBorrow
  implements EthersBeraBorrowWithStore<T> {
  readonly store: T;

  constructor(readable: ReadableEthersBeraBorrowWithStore<T>) {
    super(readable);

    this.store = readable.store;
  }

  hasStore(store?: EthersBeraBorrowStoreOption): boolean {
    return store === undefined || store === this.connection.useStore;
  }
}
