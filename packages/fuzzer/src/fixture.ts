import { Signer } from "@ethersproject/abstract-signer";

import {
  Decimal,
  Decimalish,
  POLLENStake,
  NECT_MINIMUM_DEBT,
  StabilityDeposit,
  TransactableBeraBorrow,
  Trove,
  TroveAdjustmentParams
} from "@beraborrow/lib-base";

import { EthersLiquity as BeraBorrow } from "@beraborrow/lib-ethers";

import {
  createRandomTrove,
  shortenAddress,
  benford,
  getListOfTroveOwners,
  listDifference,
  getListOfTroves,
  randomCollateralChange,
  randomDebtChange,
  objToString
} from "./utils";

import { GasHistogram } from "./GasHistogram";

type _GasHistogramsFrom<T> = {
  [P in keyof T]: T[P] extends (...args: never[]) => Promise<infer R> ? GasHistogram<R> : never;
};

type GasHistograms = Pick<
  _GasHistogramsFrom<TransactableBeraBorrow>,
  | "openTrove"
  | "adjustTrove"
  | "closeTrove"
  | "redeemNECT"
  | "depositNECTInStabilityPool"
  | "withdrawNECTFromStabilityPool"
  | "stakePOLLEN"
  | "unstakePOLLEN"
>;

export class Fixture {
  private readonly deployerBeraBorrow: BeraBorrow;
  private readonly funder: Signer;
  private readonly funderBeraBorrow: BeraBorrow;
  private readonly funderAddress: string;
  private readonly frontendAddress: string;
  private readonly gasHistograms: GasHistograms;

  private price: Decimal;

  totalNumberOfLiquidations = 0;

  private constructor(
    deployerBeraBorrow: BeraBorrow,
    funder: Signer,
    funderBeraBorrow: BeraBorrow,
    funderAddress: string,
    frontendAddress: string,
    price: Decimal
  ) {
    this.deployerBeraBorrow = deployerBeraBorrow;
    this.funder = funder;
    this.funderBeraBorrow = funderBeraBorrow;
    this.funderAddress = funderAddress;
    this.frontendAddress = frontendAddress;
    this.price = price;

    this.gasHistograms = {
      openTrove: new GasHistogram(),
      adjustTrove: new GasHistogram(),
      closeTrove: new GasHistogram(),
      redeemNECT: new GasHistogram(),
      depositNECTInStabilityPool: new GasHistogram(),
      withdrawNECTFromStabilityPool: new GasHistogram(),
      stakePOLLEN: new GasHistogram(),
      unstakePOLLEN: new GasHistogram()
    };
  }

  static async setup(
    deployerBeraBorrow: BeraBorrow,
    funder: Signer,
    funderBeraBorrow: BeraBorrow,
    frontendAddress: string,
    frontendBeraBorrow: BeraBorrow
  ) {
    const funderAddress = await funder.getAddress();
    const price = await deployerBeraBorrow.getPrice();

    await frontendBeraBorrow.registerFrontend(Decimal.from(10).div(11));

    return new Fixture(
      deployerBeraBorrow,
      funder,
      funderBeraBorrow,
      funderAddress,
      frontendAddress,
      price
    );
  }

  private async sendNECTFromFunder(toAddress: string, amount: Decimalish) {
    amount = Decimal.from(amount);

    const nectBalance = await this.funderBeraBorrow.getNECTBalance();

    if (nectBalance.lt(amount)) {
      const trove = await this.funderBeraBorrow.getTrove();
      const total = await this.funderBeraBorrow.getTotal();
      const fees = await this.funderBeraBorrow.getFees();

      const targetCollateralRatio =
        trove.isEmpty || !total.collateralRatioIsBelowCritical(this.price)
          ? 1.51
          : Decimal.max(trove.collateralRatio(this.price).add(0.00001), 1.11);

      let newTrove = trove.isEmpty ? Trove.create({ depositCollateral: 1, borrowNECT: 0 }) : trove;
      newTrove = newTrove.adjust({ borrowNECT: amount.sub(nectBalance).mul(2) });

      if (newTrove.debt.lt(NECT_MINIMUM_DEBT)) {
        newTrove = newTrove.setDebt(NECT_MINIMUM_DEBT);
      }

      newTrove = newTrove.setCollateral(newTrove.debt.mulDiv(targetCollateralRatio, this.price));

      if (trove.isEmpty) {
        const params = Trove.recreate(newTrove, fees.borrowingRate());
        console.log(`[funder] openTrove(${objToString(params)})`);
        await this.funderBeraBorrow.openTrove(params);
      } else {
        let newTotal = total.add(newTrove).subtract(trove);

        if (
          !total.collateralRatioIsBelowCritical(this.price) &&
          newTotal.collateralRatioIsBelowCritical(this.price)
        ) {
          newTotal = newTotal.setCollateral(newTotal.debt.mulDiv(1.51, this.price));
          newTrove = trove.add(newTotal).subtract(total);
        }

        const params = trove.adjustTo(newTrove, fees.borrowingRate());
        console.log(`[funder] adjustTrove(${objToString(params)})`);
        await this.funderBeraBorrow.adjustTrove(params);
      }
    }

    await this.funderBeraBorrow.sendNECT(toAddress, amount);
  }

  async setRandomPrice() {
    this.price = this.price.add(200 * Math.random() + 100).div(2);
    console.log(`[deployer] setPrice(${this.price})`);
    await this.deployerBeraBorrow.setPrice(this.price);

    return this.price;
  }

  async liquidateRandomNumberOfTroves(price: Decimal) {
    const nectInStabilityPoolBefore = await this.deployerBeraBorrow.getNECTInStabilityPool();
    console.log(`// Stability Pool balance: ${nectInStabilityPoolBefore}`);

    const trovesBefore = await getListOfTroves(this.deployerBeraBorrow);

    if (trovesBefore.length === 0) {
      console.log("// No Troves to liquidate");
      return;
    }

    const troveOwnersBefore = trovesBefore.map(trove => trove.ownerAddress);
    const lastTrove = trovesBefore[trovesBefore.length - 1];

    if (!lastTrove.collateralRatioIsBelowMinimum(price)) {
      console.log("// No Troves to liquidate");
      return;
    }

    const maximumNumberOfTrovesToLiquidate = Math.floor(50 * Math.random()) + 1;
    console.log(`[deployer] liquidateUpTo(${maximumNumberOfTrovesToLiquidate})`);
    await this.deployerBeraBorrow.liquidateUpTo(maximumNumberOfTrovesToLiquidate);

    const troveOwnersAfter = await getListOfTroveOwners(this.deployerBeraBorrow);
    const liquidatedTroves = listDifference(troveOwnersBefore, troveOwnersAfter);

    if (liquidatedTroves.length > 0) {
      for (const liquidatedTrove of liquidatedTroves) {
        console.log(`// Liquidated ${shortenAddress(liquidatedTrove)}`);
      }
    }

    this.totalNumberOfLiquidations += liquidatedTroves.length;

    const nectInStabilityPoolAfter = await this.deployerBeraBorrow.getNECTInStabilityPool();
    console.log(`// Stability Pool balance: ${nectInStabilityPoolAfter}`);
  }

  async openRandomTrove(userAddress: string, liquity: BeraBorrow) {
    const total = await liquity.getTotal();
    const fees = await liquity.getFees();

    let newTrove: Trove;

    const cannotOpen = (newTrove: Trove) =>
      newTrove.debt.lt(NECT_MINIMUM_DEBT) ||
      (total.collateralRatioIsBelowCritical(this.price)
        ? !newTrove.isOpenableInRecoveryMode(this.price)
        : newTrove.collateralRatioIsBelowMinimum(this.price) ||
          total.add(newTrove).collateralRatioIsBelowCritical(this.price));

    // do {
    newTrove = createRandomTrove(this.price);
    // } while (cannotOpen(newTrove));

    await this.funder.sendTransaction({
      to: userAddress,
      value: newTrove.collateral.hex
    });

    const params = Trove.recreate(newTrove, fees.borrowingRate());

    if (cannotOpen(newTrove)) {
      console.log(
        `// [${shortenAddress(userAddress)}] openTrove(${objToString(params)}) expected to fail`
      );

      await this.gasHistograms.openTrove.expectFailure(() =>
        liquity.openTrove(params, undefined, { gasPrice: 0 })
      );
    } else {
      console.log(`[${shortenAddress(userAddress)}] openTrove(${objToString(params)})`);

      await this.gasHistograms.openTrove.expectSuccess(() =>
        liquity.send.openTrove(params, undefined, { gasPrice: 0 })
      );
    }
  }

  async randomlyAdjustTrove(userAddress: string, liquity: BeraBorrow, trove: Trove) {
    const total = await liquity.getTotal();
    const fees = await liquity.getFees();
    const x = Math.random();

    const params: TroveAdjustmentParams<Decimal> =
      x < 0.333
        ? randomCollateralChange(trove)
        : x < 0.666
        ? randomDebtChange(trove)
        : { ...randomCollateralChange(trove), ...randomDebtChange(trove) };

    const cannotAdjust = (trove: Trove, params: TroveAdjustmentParams<Decimal>) => {
      if (
        params.withdrawCollateral?.gte(trove.collateral) ||
        params.repayNECT?.gt(trove.debt.sub(NECT_MINIMUM_DEBT))
      ) {
        return true;
      }

      const adjusted = trove.adjust(params, fees.borrowingRate());

      return (
        (params.withdrawCollateral?.nonZero || params.borrowNECT?.nonZero) &&
        (adjusted.collateralRatioIsBelowMinimum(this.price) ||
          (total.collateralRatioIsBelowCritical(this.price)
            ? adjusted._nominalCollateralRatio.lt(trove._nominalCollateralRatio)
            : total.add(adjusted).subtract(trove).collateralRatioIsBelowCritical(this.price)))
      );
    };

    if (params.depositCollateral) {
      await this.funder.sendTransaction({
        to: userAddress,
        value: params.depositCollateral.hex
      });
    }

    if (params.repayNECT) {
      await this.sendNECTFromFunder(userAddress, params.repayNECT);
    }

    if (cannotAdjust(trove, params)) {
      console.log(
        `// [${shortenAddress(userAddress)}] adjustTrove(${objToString(params)}) expected to fail`
      );

      await this.gasHistograms.adjustTrove.expectFailure(() =>
        liquity.adjustTrove(params, undefined, { gasPrice: 0 })
      );
    } else {
      console.log(`[${shortenAddress(userAddress)}] adjustTrove(${objToString(params)})`);

      await this.gasHistograms.adjustTrove.expectSuccess(() =>
        liquity.send.adjustTrove(params, undefined, { gasPrice: 0 })
      );
    }
  }

  async closeTrove(userAddress: string, liquity: BeraBorrow, trove: Trove) {
    const total = await liquity.getTotal();

    if (total.collateralRatioIsBelowCritical(this.price)) {
      // Cannot close Trove during recovery mode
      console.log("// Skipping closeTrove() in recovery mode");
      return;
    }

    await this.sendNECTFromFunder(userAddress, trove.netDebt);

    console.log(`[${shortenAddress(userAddress)}] closeTrove()`);

    await this.gasHistograms.closeTrove.expectSuccess(() =>
      liquity.send.closeTrove({ gasPrice: 0 })
    );
  }

  async redeemRandomAmount(userAddress: string, liquity: BeraBorrow) {
    const total = await liquity.getTotal();

    if (total.collateralRatioIsBelowMinimum(this.price)) {
      console.log("// Skipping redeemNECT() when TCR < MCR");
      return;
    }

    const amount = benford(10000);
    await this.sendNECTFromFunder(userAddress, amount);

    console.log(`[${shortenAddress(userAddress)}] redeemNECT(${amount})`);

    try {
      await this.gasHistograms.redeemNECT.expectSuccess(() =>
        liquity.send.redeemNECT(amount, undefined, { gasPrice: 0 })
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes("amount too low to redeem")) {
        console.log("// amount too low to redeem");
      } else {
        throw error;
      }
    }
  }

  async depositRandomAmountInStabilityPool(userAddress: string, liquity: BeraBorrow) {
    const amount = benford(20000);

    await this.sendNECTFromFunder(userAddress, amount);

    console.log(`[${shortenAddress(userAddress)}] depositNECTInStabilityPool(${amount})`);

    await this.gasHistograms.depositNECTInStabilityPool.expectSuccess(() =>
      liquity.send.depositNECTInStabilityPool(amount, this.frontendAddress, {
        gasPrice: 0
      })
    );
  }

  async withdrawRandomAmountFromStabilityPool(
    userAddress: string,
    liquity: BeraBorrow,
    deposit: StabilityDeposit
  ) {
    const [lastTrove] = await liquity.getTroves({
      first: 1,
      sortedBy: "ascendingCollateralRatio"
    });

    const amount = deposit.currentNECT.mul(1.1 * Math.random()).add(10 * Math.random());

    const cannotWithdraw = (amount: Decimal) =>
      amount.nonZero && lastTrove.collateralRatioIsBelowMinimum(this.price);

    if (cannotWithdraw(amount)) {
      console.log(
        `// [${shortenAddress(userAddress)}] ` +
          `withdrawNECTFromStabilityPool(${amount}) expected to fail`
      );

      await this.gasHistograms.withdrawNECTFromStabilityPool.expectFailure(() =>
        liquity.withdrawNECTFromStabilityPool(amount, { gasPrice: 0 })
      );
    } else {
      console.log(`[${shortenAddress(userAddress)}] withdrawNECTFromStabilityPool(${amount})`);

      await this.gasHistograms.withdrawNECTFromStabilityPool.expectSuccess(() =>
        liquity.send.withdrawNECTFromStabilityPool(amount, { gasPrice: 0 })
      );
    }
  }

  async stakeRandomAmount(userAddress: string, liquity: BeraBorrow) {
    const pollenBalance = await this.funderBeraBorrow.getPOLLENBalance();
    const amount = pollenBalance.mul(Math.random() / 2);

    await this.funderBeraBorrow.sendPOLLEN(userAddress, amount);

    if (amount.eq(0)) {
      console.log(`// [${shortenAddress(userAddress)}] stakePOLLEN(${amount}) expected to fail`);

      await this.gasHistograms.stakePOLLEN.expectFailure(() =>
        liquity.stakePOLLEN(amount, { gasPrice: 0 })
      );
    } else {
      console.log(`[${shortenAddress(userAddress)}] stakePOLLEN(${amount})`);

      await this.gasHistograms.stakePOLLEN.expectSuccess(() =>
        liquity.send.stakePOLLEN(amount, { gasPrice: 0 })
      );
    }
  }

  async unstakeRandomAmount(userAddress: string, liquity: BeraBorrow, stake: POLLENStake) {
    const amount = stake.stakedPOLLEN.mul(1.1 * Math.random()).add(10 * Math.random());

    console.log(`[${shortenAddress(userAddress)}] unstakePOLLEN(${amount})`);

    await this.gasHistograms.unstakePOLLEN.expectSuccess(() =>
      liquity.send.unstakePOLLEN(amount, { gasPrice: 0 })
    );
  }

  async sweepNECT(liquity: BeraBorrow) {
    const nectBalance = await liquity.getNECTBalance();

    if (nectBalance.nonZero) {
      await liquity.sendNECT(this.funderAddress, nectBalance, { gasPrice: 0 });
    }
  }

  async sweepPOLLEN(liquity: BeraBorrow) {
    const pollenBalance = await liquity.getPOLLENBalance();

    if (pollenBalance.nonZero) {
      await liquity.sendPOLLEN(this.funderAddress, pollenBalance, { gasPrice: 0 });
    }
  }

  summarizeGasStats(): string {
    return Object.entries(this.gasHistograms)
      .map(([name, histo]) => {
        const results = histo.getResults();

        return (
          `${name},outOfGas,${histo.outOfGasFailures}\n` +
          `${name},failure,${histo.expectedFailures}\n` +
          results
            .map(([intervalMin, frequency]) => `${name},success,${frequency},${intervalMin}\n`)
            .join("")
        );
      })
      .join("");
  }
}
