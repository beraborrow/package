import { Decimal } from "./Decimal";
import { Fees } from "./Fees";
import { POLLENStake } from "./POLLENStake";
import { StabilityDeposit } from "./StabilityDeposit";
import { Trove, TroveWithPendingRedistribution, UserTrove } from "./Trove";
import { FrontendStatus, ReadableBeraBorrow, TroveListingParams } from "./ReadableBeraBorrow";

/** @internal */
export type _ReadableBeraBorrowWithExtraParamsBase<T extends unknown[]> = {
  [P in keyof ReadableBeraBorrow]: ReadableBeraBorrow[P] extends (...params: infer A) => infer R
    ? (...params: [...originalParams: A, ...extraParams: T]) => R
    : never;
};

/** @internal */
export type _BeraBorrowReadCacheBase<T extends unknown[]> = {
  [P in keyof ReadableBeraBorrow]: ReadableBeraBorrow[P] extends (...args: infer A) => Promise<infer R>
    ? (...params: [...originalParams: A, ...extraParams: T]) => R | undefined
    : never;
};

// Overloads get lost in the mapping, so we need to define them again...

/** @internal */
export interface _ReadableBeraBorrowWithExtraParams<T extends unknown[]>
  extends _ReadableBeraBorrowWithExtraParamsBase<T> {
  getTroves(
    params: TroveListingParams & { beforeRedistribution: true },
    ...extraParams: T
  ): Promise<TroveWithPendingRedistribution[]>;

  getTroves(params: TroveListingParams, ...extraParams: T): Promise<UserTrove[]>;
}

/** @internal */
export interface _BeraBorrowReadCache<T extends unknown[]> extends _BeraBorrowReadCacheBase<T> {
  getTroves(
    params: TroveListingParams & { beforeRedistribution: true },
    ...extraParams: T
  ): TroveWithPendingRedistribution[] | undefined;

  getTroves(params: TroveListingParams, ...extraParams: T): UserTrove[] | undefined;
}

/** @internal */
export class _CachedReadableBeraBorrow<T extends unknown[]>
  implements _ReadableBeraBorrowWithExtraParams<T> {
  private _readable: _ReadableBeraBorrowWithExtraParams<T>;
  private _cache: _BeraBorrowReadCache<T>;

  constructor(readable: _ReadableBeraBorrowWithExtraParams<T>, cache: _BeraBorrowReadCache<T>) {
    this._readable = readable;
    this._cache = cache;
  }

  async getTotalRedistributed(...extraParams: T): Promise<Trove> {
    return (
      this._cache.getTotalRedistributed(...extraParams) ??
      this._readable.getTotalRedistributed(...extraParams)
    );
  }

  async getTroveBeforeRedistribution(
    address?: string,
    ...extraParams: T
  ): Promise<TroveWithPendingRedistribution> {
    return (
      this._cache.getTroveBeforeRedistribution(address, ...extraParams) ??
      this._readable.getTroveBeforeRedistribution(address, ...extraParams)
    );
  }

  async getTrove(address?: string, ...extraParams: T): Promise<UserTrove> {
    const [troveBeforeRedistribution, totalRedistributed] = await Promise.all([
      this.getTroveBeforeRedistribution(address, ...extraParams),
      this.getTotalRedistributed(...extraParams)
    ]);

    return troveBeforeRedistribution.applyRedistribution(totalRedistributed);
  }

  async getNumberOfTroves(...extraParams: T): Promise<number> {
    return (
      this._cache.getNumberOfTroves(...extraParams) ??
      this._readable.getNumberOfTroves(...extraParams)
    );
  }

  async getPrice(...extraParams: T): Promise<Decimal> {
    return this._cache.getPrice(...extraParams) ?? this._readable.getPrice(...extraParams);
  }

  async getTotal(...extraParams: T): Promise<Trove> {
    return this._cache.getTotal(...extraParams) ?? this._readable.getTotal(...extraParams);
  }

  async getStabilityDeposit(address?: string, ...extraParams: T): Promise<StabilityDeposit> {
    return (
      this._cache.getStabilityDeposit(address, ...extraParams) ??
      this._readable.getStabilityDeposit(address, ...extraParams)
    );
  }

  async getRemainingStabilityPoolPOLLENReward(...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getRemainingStabilityPoolPOLLENReward(...extraParams) ??
      this._readable.getRemainingStabilityPoolPOLLENReward(...extraParams)
    );
  }

  async getNECTInStabilityPool(...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getNECTInStabilityPool(...extraParams) ??
      this._readable.getNECTInStabilityPool(...extraParams)
    );
  }

  async getNECTBalance(address?: string, ...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getNECTBalance(address, ...extraParams) ??
      this._readable.getNECTBalance(address, ...extraParams)
    );
  }

  async getPOLLENBalance(address?: string, ...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getPOLLENBalance(address, ...extraParams) ??
      this._readable.getPOLLENBalance(address, ...extraParams)
    );
  }

  async getUniTokenBalance(address?: string, ...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getUniTokenBalance(address, ...extraParams) ??
      this._readable.getUniTokenBalance(address, ...extraParams)
    );
  }

  async getUniTokenAllowance(address?: string, ...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getUniTokenAllowance(address, ...extraParams) ??
      this._readable.getUniTokenAllowance(address, ...extraParams)
    );
  }

  async getRemainingLiquidityMiningPOLLENReward(...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getRemainingLiquidityMiningPOLLENReward(...extraParams) ??
      this._readable.getRemainingLiquidityMiningPOLLENReward(...extraParams)
    );
  }

  async getLiquidityMiningStake(address?: string, ...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getLiquidityMiningStake(address, ...extraParams) ??
      this._readable.getLiquidityMiningStake(address, ...extraParams)
    );
  }

  async getTotalStakedUniTokens(...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getTotalStakedUniTokens(...extraParams) ??
      this._readable.getTotalStakedUniTokens(...extraParams)
    );
  }

  async getLiquidityMiningPOLLENReward(address?: string, ...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getLiquidityMiningPOLLENReward(address, ...extraParams) ??
      this._readable.getLiquidityMiningPOLLENReward(address, ...extraParams)
    );
  }

  async getCollateralSurplusBalance(address?: string, ...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getCollateralSurplusBalance(address, ...extraParams) ??
      this._readable.getCollateralSurplusBalance(address, ...extraParams)
    );
  }

  getTroves(
    params: TroveListingParams & { beforeRedistribution: true },
    ...extraParams: T
  ): Promise<TroveWithPendingRedistribution[]>;

  getTroves(params: TroveListingParams, ...extraParams: T): Promise<UserTrove[]>;

  async getTroves(params: TroveListingParams, ...extraParams: T): Promise<UserTrove[]> {
    const { beforeRedistribution, ...restOfParams } = params;

    const [totalRedistributed, troves] = await Promise.all([
      beforeRedistribution ? undefined : this.getTotalRedistributed(...extraParams),
      this._cache.getTroves({ beforeRedistribution: true, ...restOfParams }, ...extraParams) ??
        this._readable.getTroves({ beforeRedistribution: true, ...restOfParams }, ...extraParams)
    ]);

    if (totalRedistributed) {
      return troves.map(trove => trove.applyRedistribution(totalRedistributed));
    } else {
      return troves;
    }
  }

  async getFees(...extraParams: T): Promise<Fees> {
    return this._cache.getFees(...extraParams) ?? this._readable.getFees(...extraParams);
  }

  async getPOLLENStake(address?: string, ...extraParams: T): Promise<POLLENStake> {
    return (
      this._cache.getPOLLENStake(address, ...extraParams) ??
      this._readable.getPOLLENStake(address, ...extraParams)
    );
  }

  async getTotalStakedPOLLEN(...extraParams: T): Promise<Decimal> {
    return (
      this._cache.getTotalStakedPOLLEN(...extraParams) ??
      this._readable.getTotalStakedPOLLEN(...extraParams)
    );
  }

  async getFrontendStatus(address?: string, ...extraParams: T): Promise<FrontendStatus> {
    return (
      this._cache.getFrontendStatus(address, ...extraParams) ??
      this._readable.getFrontendStatus(address, ...extraParams)
    );
  }
}
