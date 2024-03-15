import { Decimal, Decimalish } from "./Decimal";

/**
 * Represents the change between two states of an POLLEN Stake.
 *
 * @public
 */
export type POLLENStakeChange<T> =
  | { stakePOLLEN: T; unstakePOLLEN?: undefined }
  | { stakePOLLEN?: undefined; unstakePOLLEN: T; unstakeAllPOLLEN: boolean };

/** 
 * Represents a user's POLLEN stake and accrued gains.
 * 
 * @remarks
 * Returned by the {@link ReadableBeraBorrow.getPOLLENStake | getPOLLENStake()} function.

 * @public
 */
export class POLLENStake {
  /** The amount of POLLEN that's staked. */
  readonly stakedPOLLEN: Decimal;

  /** Collateral gain available to withdraw. */
  readonly collateralGain: Decimal;

  /** NECT gain available to withdraw. */
  readonly nectGain: Decimal;

  /** @internal */
  constructor(stakedPOLLEN = Decimal.ZERO, collateralGain = Decimal.ZERO, nectGain = Decimal.ZERO) {
    this.stakedPOLLEN = stakedPOLLEN;
    this.collateralGain = collateralGain;
    this.nectGain = nectGain;
  }

  get isEmpty(): boolean {
    return this.stakedPOLLEN.isZero && this.collateralGain.isZero && this.nectGain.isZero;
  }

  /** @internal */
  toString(): string {
    return (
      `{ stakedPOLLEN: ${this.stakedPOLLEN}` +
      `, collateralGain: ${this.collateralGain}` +
      `, nectGain: ${this.nectGain} }`
    );
  }

  /**
   * Compare to another instance of `POLLENStake`.
   */
  equals(that: POLLENStake): boolean {
    return (
      this.stakedPOLLEN.eq(that.stakedPOLLEN) &&
      this.collateralGain.eq(that.collateralGain) &&
      this.nectGain.eq(that.nectGain)
    );
  }

  /**
   * Calculate the difference between this `POLLENStake` and `thatStakedPOLLEN`.
   *
   * @returns An object representing the change, or `undefined` if the staked amounts are equal.
   */
  whatChanged(thatStakedPOLLEN: Decimalish): POLLENStakeChange<Decimal> | undefined {
    thatStakedPOLLEN = Decimal.from(thatStakedPOLLEN);

    if (thatStakedPOLLEN.lt(this.stakedPOLLEN)) {
      return {
        unstakePOLLEN: this.stakedPOLLEN.sub(thatStakedPOLLEN),
        unstakeAllPOLLEN: thatStakedPOLLEN.isZero
      };
    }

    if (thatStakedPOLLEN.gt(this.stakedPOLLEN)) {
      return { stakePOLLEN: thatStakedPOLLEN.sub(this.stakedPOLLEN) };
    }
  }

  /**
   * Apply a {@link POLLENStakeChange} to this `POLLENStake`.
   *
   * @returns The new staked POLLEN amount.
   */
  apply(change: POLLENStakeChange<Decimalish> | undefined): Decimal {
    if (!change) {
      return this.stakedPOLLEN;
    }

    if (change.unstakePOLLEN !== undefined) {
      return change.unstakeAllPOLLEN || this.stakedPOLLEN.lte(change.unstakePOLLEN)
        ? Decimal.ZERO
        : this.stakedPOLLEN.sub(change.unstakePOLLEN);
    } else {
      return this.stakedPOLLEN.add(change.stakePOLLEN);
    }
  }
}
