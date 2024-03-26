import {
  CollateralGainTransferDetails,
  Decimalish,
  LiquidationDetails,
  RedemptionDetails,
  SendableBeraBorrow,
  StabilityDepositChangeDetails,
  StabilityPoolGainsWithdrawalDetails,
  TroveAdjustmentDetails,
  TroveAdjustmentParams,
  TroveClosureDetails,
  TroveCreationDetails,
  TroveCreationParams
} from "@beraborrow/lib-base";

import {
  EthersTransactionOverrides,
  EthersTransactionReceipt,
  EthersTransactionResponse
} from "./types";

import {
  BorrowingOperationOptionalParams,
  PopulatableEthersBeraBorrow,
  PopulatedEthersBeraBorrowTransaction,
  SentEthersBeraBorrowTransaction
} from "./PopulatableEthersBeraBorrow";

const sendTransaction = <T>(tx: PopulatedEthersBeraBorrowTransaction<T>) => tx.send();

/**
 * Ethers-based implementation of {@link @beraborrow/lib-base#SendableBeraBorrow}.
 *
 * @public
 */
export class SendableEthersBeraBorrow
  implements SendableBeraBorrow<EthersTransactionReceipt, EthersTransactionResponse> {
  private _populate: PopulatableEthersBeraBorrow;

  constructor(populatable: PopulatableEthersBeraBorrow) {
    this._populate = populatable;
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.openTrove} */
  async openTrove(
    params: TroveCreationParams<Decimalish>,
    maxBorrowingRateOrOptionalParams?: Decimalish | BorrowingOperationOptionalParams,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<TroveCreationDetails>> {
    return this._populate
      .openTrove(params, maxBorrowingRateOrOptionalParams, overrides)
      .then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.closeTrove} */
  closeTrove(
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<TroveClosureDetails>> {
    return this._populate.closeTrove(overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.adjustTrove} */
  adjustTrove(
    params: TroveAdjustmentParams<Decimalish>,
    maxBorrowingRateOrOptionalParams?: Decimalish | BorrowingOperationOptionalParams,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<TroveAdjustmentDetails>> {
    return this._populate
      .adjustTrove(params, maxBorrowingRateOrOptionalParams, overrides)
      .then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.depositCollateral} */
  depositCollateral(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<TroveAdjustmentDetails>> {
    return this._populate.depositCollateral(amount, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.withdrawCollateral} */
  withdrawCollateral(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<TroveAdjustmentDetails>> {
    return this._populate.withdrawCollateral(amount, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.borrowNECT} */
  borrowNECT(
    amount: Decimalish,
    maxBorrowingRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<TroveAdjustmentDetails>> {
    return this._populate.borrowNECT(amount, maxBorrowingRate, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.repayNECT} */
  repayNECT(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<TroveAdjustmentDetails>> {
    return this._populate.repayNECT(amount, overrides).then(sendTransaction);
  }

  /** @internal */
  setPrice(
    price: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<void>> {
    return this._populate.setPrice(price, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.liquidate} */
  liquidate(
    address: string | string[],
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<LiquidationDetails>> {
    return this._populate.liquidate(address, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.liquidateUpTo} */
  liquidateUpTo(
    maximumNumberOfTrovesToLiquidate: number,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<LiquidationDetails>> {
    return this._populate
      .liquidateUpTo(maximumNumberOfTrovesToLiquidate, overrides)
      .then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.depositNECTInStabilityPool} */
  depositNECTInStabilityPool(
    amount: Decimalish,
    frontendTag?: string,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<StabilityDepositChangeDetails>> {
    return this._populate
      .depositNECTInStabilityPool(amount, frontendTag, overrides)
      .then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.withdrawNECTFromStabilityPool} */
  withdrawNECTFromStabilityPool(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<StabilityDepositChangeDetails>> {
    return this._populate.withdrawNECTFromStabilityPool(amount, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.withdrawGainsFromStabilityPool} */
  withdrawGainsFromStabilityPool(
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<StabilityPoolGainsWithdrawalDetails>> {
    return this._populate.withdrawGainsFromStabilityPool(overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.transferCollateralGainToTrove} */
  transferCollateralGainToTrove(
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<CollateralGainTransferDetails>> {
    return this._populate.transferCollateralGainToTrove(overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.sendNECT} */
  sendNECT(
    toAddress: string,
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<void>> {
    return this._populate.sendNECT(toAddress, amount, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.sendPOLLEN} */
  sendPOLLEN(
    toAddress: string,
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<void>> {
    return this._populate.sendPOLLEN(toAddress, amount, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.redeemNECT} */
  redeemNECT(
    amount: Decimalish,
    maxRedemptionRate?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<RedemptionDetails>> {
    return this._populate.redeemNECT(amount, maxRedemptionRate, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.claimCollateralSurplus} */
  claimCollateralSurplus(
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<void>> {
    return this._populate.claimCollateralSurplus(overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.stakePOLLEN} */
  stakePOLLEN(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<void>> {
    return this._populate.stakePOLLEN(amount, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.unstakePOLLEN} */
  unstakePOLLEN(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<void>> {
    return this._populate.unstakePOLLEN(amount, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.withdrawGainsFromStaking} */
  withdrawGainsFromStaking(
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<void>> {
    return this._populate.withdrawGainsFromStaking(overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.registerFrontend} */
  registerFrontend(
    kickbackRate: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<void>> {
    return this._populate.registerFrontend(kickbackRate, overrides).then(sendTransaction);
  }

  /** @internal */
  _mintUniToken(
    amount: Decimalish,
    address?: string,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<void>> {
    return this._populate._mintUniToken(amount, address, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.approveUniTokens} */
  approveUniTokens(
    allowance?: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<void>> {
    return this._populate.approveUniTokens(allowance, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.stakeUniTokens} */
  stakeUniTokens(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<void>> {
    return this._populate.stakeUniTokens(amount, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.unstakeUniTokens} */
  unstakeUniTokens(
    amount: Decimalish,
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<void>> {
    return this._populate.unstakeUniTokens(amount, overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.withdrawPOLLENRewardFromLiquidityMining} */
  withdrawPOLLENRewardFromLiquidityMining(
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<void>> {
    return this._populate.withdrawPOLLENRewardFromLiquidityMining(overrides).then(sendTransaction);
  }

  /** {@inheritDoc @beraborrow/lib-base#SendableBeraBorrow.exitLiquidityMining} */
  exitLiquidityMining(
    overrides?: EthersTransactionOverrides
  ): Promise<SentEthersBeraBorrowTransaction<void>> {
    return this._populate.exitLiquidityMining(overrides).then(sendTransaction);
  }
}
