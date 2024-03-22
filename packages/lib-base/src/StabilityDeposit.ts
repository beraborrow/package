import { Decimal, Decimalish } from "./Decimal";

/**
 * Represents the change between two Stability Deposit states.
 *
 * @public
 */
export type StabilityDepositChange<T> =
  | { depositNECT: T; withdrawNECT?: undefined }
  | { depositNECT?: undefined; withdrawNECT: T; withdrawAllNECT: boolean };

/**
 * A Stability Deposit and its accrued gains.
 *
 * @public
 */
export class StabilityDeposit {
  /** Amount of NECT in the Stability Deposit at the time of the last direct modification. */
  readonly initialNECT: Decimal;

  /** Amount of NECT left in the Stability Deposit. */
  readonly currentNECT: Decimal;

  /** Amount of native currency (e.g. iBGT) received in exchange for the used-up NECT. */
  readonly collateralGain: Decimal;

  /** Amount of POLLEN rewarded since the last modification of the Stability Deposit. */
  readonly pollenReward: Decimal;

  /**
   * Address of frontend through which this Stability Deposit was made.
   *
   * @remarks
   * If the Stability Deposit was made through a frontend that doesn't tag deposits, this will be
   * the zero-address.
   */
  readonly frontendTag: string;

  /** @internal */
  constructor(
    initialNECT: Decimal,
    currentNECT: Decimal,
    collateralGain: Decimal,
    pollenReward: Decimal,
    frontendTag: string
  ) {
    this.initialNECT = initialNECT;
    this.currentNECT = currentNECT;
    this.collateralGain = collateralGain;
    this.pollenReward = pollenReward;
    this.frontendTag = frontendTag;

    if (this.currentNECT.gt(this.initialNECT)) {
      throw new Error("currentNECT can't be greater than initialNECT");
    }
  }

  get isEmpty(): boolean {
    return (
      this.initialNECT.isZero &&
      this.currentNECT.isZero &&
      this.collateralGain.isZero &&
      this.pollenReward.isZero
    );
  }

  /** @internal */
  toString(): string {
    return (
      `{ initialNECT: ${this.initialNECT}` +
      `, currentNECT: ${this.currentNECT}` +
      `, collateralGain: ${this.collateralGain}` +
      `, pollenReward: ${this.pollenReward}` +
      `, frontendTag: "${this.frontendTag}" }`
    );
  }

  /**
   * Compare to another instance of `StabilityDeposit`.
   */
  equals(that: StabilityDeposit): boolean {
    return (
      this.initialNECT.eq(that.initialNECT) &&
      this.currentNECT.eq(that.currentNECT) &&
      this.collateralGain.eq(that.collateralGain) &&
      this.pollenReward.eq(that.pollenReward) &&
      this.frontendTag === that.frontendTag
    );
  }

  /**
   * Calculate the difference between the `currentNECT` in this Stability Deposit and `thatNECT`.
   *
   * @returns An object representing the change, or `undefined` if the deposited amounts are equal.
   */
  whatChanged(thatNECT: Decimalish): StabilityDepositChange<Decimal> | undefined {
    thatNECT = Decimal.from(thatNECT);

    if (thatNECT.lt(this.currentNECT)) {
      return { withdrawNECT: this.currentNECT.sub(thatNECT), withdrawAllNECT: thatNECT.isZero };
    }

    if (thatNECT.gt(this.currentNECT)) {
      return { depositNECT: thatNECT.sub(this.currentNECT) };
    }
  }

  /**
   * Apply a {@link StabilityDepositChange} to this Stability Deposit.
   *
   * @returns The new deposited NECT amount.
   */
  apply(change: StabilityDepositChange<Decimalish> | undefined): Decimal {
    if (!change) {
      return this.currentNECT;
    }

    if (change.withdrawNECT !== undefined) {
      return change.withdrawAllNECT || this.currentNECT.lte(change.withdrawNECT)
        ? Decimal.ZERO
        : this.currentNECT.sub(change.withdrawNECT);
    } else {
      return this.currentNECT.add(change.depositNECT);
    }
  }
}
