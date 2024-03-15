import type { BaseContract, BigNumber, BigNumberish, BytesLike, CallOverrides, ContractTransaction, Overrides, PopulatedTransaction, Signer, utils } from "ethers";
import type { FunctionFragment, Result, EventFragment } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent } from "./common";
export declare namespace ChickenBondManager {
    type ExternalAdressesStruct = {
        bondNFTAddress: string;
        nectTokenAddress: string;
        curvePoolAddress: string;
        curveBasePoolAddress: string;
        bammSPVaultAddress: string;
        yearnCurveVaultAddress: string;
        yearnRegistryAddress: string;
        yearnGovernanceAddress: string;
        bNECTTokenAddress: string;
        curveLiquidityGaugeAddress: string;
    };
    type ExternalAdressesStructOutput = [
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string,
        string
    ] & {
        bondNFTAddress: string;
        nectTokenAddress: string;
        curvePoolAddress: string;
        curveBasePoolAddress: string;
        bammSPVaultAddress: string;
        yearnCurveVaultAddress: string;
        yearnRegistryAddress: string;
        yearnGovernanceAddress: string;
        bNECTTokenAddress: string;
        curveLiquidityGaugeAddress: string;
    };
    type ParamsStruct = {
        targetAverageAgeSeconds: BigNumberish;
        initialAccrualParameter: BigNumberish;
        minimumAccrualParameter: BigNumberish;
        accrualAdjustmentRate: BigNumberish;
        accrualAdjustmentPeriodSeconds: BigNumberish;
        chickenInAMMFee: BigNumberish;
        curveDepositDydxThreshold: BigNumberish;
        curveWithdrawalDxdyThreshold: BigNumberish;
        bootstrapPeriodChickenIn: BigNumberish;
        bootstrapPeriodRedeem: BigNumberish;
        bootstrapPeriodShift: BigNumberish;
        shifterDelay: BigNumberish;
        shifterWindow: BigNumberish;
        minBNECTSupply: BigNumberish;
        minBondAmount: BigNumberish;
        nftRandomnessDivisor: BigNumberish;
        redemptionFeeBeta: BigNumberish;
        redemptionFeeMinuteDecayFactor: BigNumberish;
    };
    type ParamsStructOutput = [
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber
    ] & {
        targetAverageAgeSeconds: BigNumber;
        initialAccrualParameter: BigNumber;
        minimumAccrualParameter: BigNumber;
        accrualAdjustmentRate: BigNumber;
        accrualAdjustmentPeriodSeconds: BigNumber;
        chickenInAMMFee: BigNumber;
        curveDepositDydxThreshold: BigNumber;
        curveWithdrawalDxdyThreshold: BigNumber;
        bootstrapPeriodChickenIn: BigNumber;
        bootstrapPeriodRedeem: BigNumber;
        bootstrapPeriodShift: BigNumber;
        shifterDelay: BigNumber;
        shifterWindow: BigNumber;
        minBNECTSupply: BigNumber;
        minBondAmount: BigNumber;
        nftRandomnessDivisor: BigNumber;
        redemptionFeeBeta: BigNumber;
        redemptionFeeMinuteDecayFactor: BigNumber;
    };
}
export interface ChickenBondManagerInterface extends utils.Interface {
    functions: {
        "BETA()": FunctionFragment;
        "BOOTSTRAP_PERIOD_CHICKEN_IN()": FunctionFragment;
        "BOOTSTRAP_PERIOD_REDEEM()": FunctionFragment;
        "BOOTSTRAP_PERIOD_SHIFT()": FunctionFragment;
        "CHICKEN_IN_AMM_FEE()": FunctionFragment;
        "DECIMAL_PRECISION()": FunctionFragment;
        "INDEX_OF_NECT_TOKEN_IN_CURVE_POOL()": FunctionFragment;
        "MINUTE_DECAY_FACTOR()": FunctionFragment;
        "MIN_BNECT_SUPPLY()": FunctionFragment;
        "MIN_BOND_AMOUNT()": FunctionFragment;
        "NFT_RANDOMNESS_DIVISOR()": FunctionFragment;
        "SECONDS_IN_ONE_MINUTE()": FunctionFragment;
        "SHIFTER_DELAY()": FunctionFragment;
        "SHIFTER_WINDOW()": FunctionFragment;
        "_calcSystemBackingRatioFromBAMMValue(uint256)": FunctionFragment;
        "accrualAdjustmentMultiplier()": FunctionFragment;
        "accrualAdjustmentPeriodCount()": FunctionFragment;
        "accrualAdjustmentPeriodSeconds()": FunctionFragment;
        "accrualParameter()": FunctionFragment;
        "activateMigration()": FunctionFragment;
        "bNECTToken()": FunctionFragment;
        "bammSPVault()": FunctionFragment;
        "baseRedemptionRate()": FunctionFragment;
        "bondNFT()": FunctionFragment;
        "calcAccruedBNECT(uint256)": FunctionFragment;
        "calcBondBNECTCap(uint256)": FunctionFragment;
        "calcRedemptionFeePercentage(uint256)": FunctionFragment;
        "calcSystemBackingRatio()": FunctionFragment;
        "calcTotalNECTValue()": FunctionFragment;
        "calcTotalYearnCurveVaultShareValue()": FunctionFragment;
        "calcUpdatedAccrualParameter()": FunctionFragment;
        "chickenIn(uint256)": FunctionFragment;
        "chickenOut(uint256,uint256)": FunctionFragment;
        "countChickenIn()": FunctionFragment;
        "countChickenOut()": FunctionFragment;
        "createBond(uint256)": FunctionFragment;
        "createBondWithPermit(address,uint256,uint256,uint8,bytes32,bytes32)": FunctionFragment;
        "curveBasePool()": FunctionFragment;
        "curveDepositNECT3CRVExchangeRateThreshold()": FunctionFragment;
        "curveLiquidityGauge()": FunctionFragment;
        "curvePool()": FunctionFragment;
        "curveWithdrawal3CRVNECTExchangeRateThreshold()": FunctionFragment;
        "deploymentTimestamp()": FunctionFragment;
        "firstChickenInTime()": FunctionFragment;
        "getAcquiredNECTInCurve()": FunctionFragment;
        "getAcquiredNECTInSP()": FunctionFragment;
        "getBAMMNECTDebt()": FunctionFragment;
        "getBondData(uint256)": FunctionFragment;
        "getNECTInBAMMSPVault()": FunctionFragment;
        "getNECTToAcquire(uint256)": FunctionFragment;
        "getOpenBondCount()": FunctionFragment;
        "getOwnedNECTInCurve()": FunctionFragment;
        "getOwnedNECTInSP()": FunctionFragment;
        "getPendingNECT()": FunctionFragment;
        "getPermanentNECT()": FunctionFragment;
        "getTotalAcquiredNECT()": FunctionFragment;
        "getTotalNECTInCurve()": FunctionFragment;
        "getTreasury()": FunctionFragment;
        "lastRedemptionTime()": FunctionFragment;
        "lastShifterCountdownStartTime()": FunctionFragment;
        "nectToken()": FunctionFragment;
        "migration()": FunctionFragment;
        "minimumAccrualParameter()": FunctionFragment;
        "redeem(uint256,uint256)": FunctionFragment;
        "sendFeeShare(uint256)": FunctionFragment;
        "shiftNECTFromCurveToSP(uint256)": FunctionFragment;
        "shiftNECTFromSPToCurve(uint256)": FunctionFragment;
        "startShifterCountdown()": FunctionFragment;
        "targetAverageAgeSeconds()": FunctionFragment;
        "totalWeightedStartTimes()": FunctionFragment;
        "yTokensHeldByCBM()": FunctionFragment;
        "yearnCurveVault()": FunctionFragment;
        "yearnGovernanceAddress()": FunctionFragment;
        "yearnRegistry()": FunctionFragment;
    };
    getFunction(nameOrSignatureOrTopic: "BETA" | "BOOTSTRAP_PERIOD_CHICKEN_IN" | "BOOTSTRAP_PERIOD_REDEEM" | "BOOTSTRAP_PERIOD_SHIFT" | "CHICKEN_IN_AMM_FEE" | "DECIMAL_PRECISION" | "INDEX_OF_NECT_TOKEN_IN_CURVE_POOL" | "MINUTE_DECAY_FACTOR" | "MIN_BNECT_SUPPLY" | "MIN_BOND_AMOUNT" | "NFT_RANDOMNESS_DIVISOR" | "SECONDS_IN_ONE_MINUTE" | "SHIFTER_DELAY" | "SHIFTER_WINDOW" | "_calcSystemBackingRatioFromBAMMValue" | "accrualAdjustmentMultiplier" | "accrualAdjustmentPeriodCount" | "accrualAdjustmentPeriodSeconds" | "accrualParameter" | "activateMigration" | "bNECTToken" | "bammSPVault" | "baseRedemptionRate" | "bondNFT" | "calcAccruedBNECT" | "calcBondBNECTCap" | "calcRedemptionFeePercentage" | "calcSystemBackingRatio" | "calcTotalNECTValue" | "calcTotalYearnCurveVaultShareValue" | "calcUpdatedAccrualParameter" | "chickenIn" | "chickenOut" | "countChickenIn" | "countChickenOut" | "createBond" | "createBondWithPermit" | "curveBasePool" | "curveDepositNECT3CRVExchangeRateThreshold" | "curveLiquidityGauge" | "curvePool" | "curveWithdrawal3CRVNECTExchangeRateThreshold" | "deploymentTimestamp" | "firstChickenInTime" | "getAcquiredNECTInCurve" | "getAcquiredNECTInSP" | "getBAMMNECTDebt" | "getBondData" | "getNECTInBAMMSPVault" | "getNECTToAcquire" | "getOpenBondCount" | "getOwnedNECTInCurve" | "getOwnedNECTInSP" | "getPendingNECT" | "getPermanentNECT" | "getTotalAcquiredNECT" | "getTotalNECTInCurve" | "getTreasury" | "lastRedemptionTime" | "lastShifterCountdownStartTime" | "nectToken" | "migration" | "minimumAccrualParameter" | "redeem" | "sendFeeShare" | "shiftNECTFromCurveToSP" | "shiftNECTFromSPToCurve" | "startShifterCountdown" | "targetAverageAgeSeconds" | "totalWeightedStartTimes" | "yTokensHeldByCBM" | "yearnCurveVault" | "yearnGovernanceAddress" | "yearnRegistry"): FunctionFragment;
    encodeFunctionData(functionFragment: "BETA", values?: undefined): string;
    encodeFunctionData(functionFragment: "BOOTSTRAP_PERIOD_CHICKEN_IN", values?: undefined): string;
    encodeFunctionData(functionFragment: "BOOTSTRAP_PERIOD_REDEEM", values?: undefined): string;
    encodeFunctionData(functionFragment: "BOOTSTRAP_PERIOD_SHIFT", values?: undefined): string;
    encodeFunctionData(functionFragment: "CHICKEN_IN_AMM_FEE", values?: undefined): string;
    encodeFunctionData(functionFragment: "DECIMAL_PRECISION", values?: undefined): string;
    encodeFunctionData(functionFragment: "INDEX_OF_NECT_TOKEN_IN_CURVE_POOL", values?: undefined): string;
    encodeFunctionData(functionFragment: "MINUTE_DECAY_FACTOR", values?: undefined): string;
    encodeFunctionData(functionFragment: "MIN_BNECT_SUPPLY", values?: undefined): string;
    encodeFunctionData(functionFragment: "MIN_BOND_AMOUNT", values?: undefined): string;
    encodeFunctionData(functionFragment: "NFT_RANDOMNESS_DIVISOR", values?: undefined): string;
    encodeFunctionData(functionFragment: "SECONDS_IN_ONE_MINUTE", values?: undefined): string;
    encodeFunctionData(functionFragment: "SHIFTER_DELAY", values?: undefined): string;
    encodeFunctionData(functionFragment: "SHIFTER_WINDOW", values?: undefined): string;
    encodeFunctionData(functionFragment: "_calcSystemBackingRatioFromBAMMValue", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "accrualAdjustmentMultiplier", values?: undefined): string;
    encodeFunctionData(functionFragment: "accrualAdjustmentPeriodCount", values?: undefined): string;
    encodeFunctionData(functionFragment: "accrualAdjustmentPeriodSeconds", values?: undefined): string;
    encodeFunctionData(functionFragment: "accrualParameter", values?: undefined): string;
    encodeFunctionData(functionFragment: "activateMigration", values?: undefined): string;
    encodeFunctionData(functionFragment: "bNECTToken", values?: undefined): string;
    encodeFunctionData(functionFragment: "bammSPVault", values?: undefined): string;
    encodeFunctionData(functionFragment: "baseRedemptionRate", values?: undefined): string;
    encodeFunctionData(functionFragment: "bondNFT", values?: undefined): string;
    encodeFunctionData(functionFragment: "calcAccruedBNECT", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "calcBondBNECTCap", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "calcRedemptionFeePercentage", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "calcSystemBackingRatio", values?: undefined): string;
    encodeFunctionData(functionFragment: "calcTotalNECTValue", values?: undefined): string;
    encodeFunctionData(functionFragment: "calcTotalYearnCurveVaultShareValue", values?: undefined): string;
    encodeFunctionData(functionFragment: "calcUpdatedAccrualParameter", values?: undefined): string;
    encodeFunctionData(functionFragment: "chickenIn", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "chickenOut", values: [BigNumberish, BigNumberish]): string;
    encodeFunctionData(functionFragment: "countChickenIn", values?: undefined): string;
    encodeFunctionData(functionFragment: "countChickenOut", values?: undefined): string;
    encodeFunctionData(functionFragment: "createBond", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "createBondWithPermit", values: [
        string,
        BigNumberish,
        BigNumberish,
        BigNumberish,
        BytesLike,
        BytesLike
    ]): string;
    encodeFunctionData(functionFragment: "curveBasePool", values?: undefined): string;
    encodeFunctionData(functionFragment: "curveDepositNECT3CRVExchangeRateThreshold", values?: undefined): string;
    encodeFunctionData(functionFragment: "curveLiquidityGauge", values?: undefined): string;
    encodeFunctionData(functionFragment: "curvePool", values?: undefined): string;
    encodeFunctionData(functionFragment: "curveWithdrawal3CRVNECTExchangeRateThreshold", values?: undefined): string;
    encodeFunctionData(functionFragment: "deploymentTimestamp", values?: undefined): string;
    encodeFunctionData(functionFragment: "firstChickenInTime", values?: undefined): string;
    encodeFunctionData(functionFragment: "getAcquiredNECTInCurve", values?: undefined): string;
    encodeFunctionData(functionFragment: "getAcquiredNECTInSP", values?: undefined): string;
    encodeFunctionData(functionFragment: "getBAMMNECTDebt", values?: undefined): string;
    encodeFunctionData(functionFragment: "getBondData", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "getNECTInBAMMSPVault", values?: undefined): string;
    encodeFunctionData(functionFragment: "getNECTToAcquire", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "getOpenBondCount", values?: undefined): string;
    encodeFunctionData(functionFragment: "getOwnedNECTInCurve", values?: undefined): string;
    encodeFunctionData(functionFragment: "getOwnedNECTInSP", values?: undefined): string;
    encodeFunctionData(functionFragment: "getPendingNECT", values?: undefined): string;
    encodeFunctionData(functionFragment: "getPermanentNECT", values?: undefined): string;
    encodeFunctionData(functionFragment: "getTotalAcquiredNECT", values?: undefined): string;
    encodeFunctionData(functionFragment: "getTotalNECTInCurve", values?: undefined): string;
    encodeFunctionData(functionFragment: "getTreasury", values?: undefined): string;
    encodeFunctionData(functionFragment: "lastRedemptionTime", values?: undefined): string;
    encodeFunctionData(functionFragment: "lastShifterCountdownStartTime", values?: undefined): string;
    encodeFunctionData(functionFragment: "nectToken", values?: undefined): string;
    encodeFunctionData(functionFragment: "migration", values?: undefined): string;
    encodeFunctionData(functionFragment: "minimumAccrualParameter", values?: undefined): string;
    encodeFunctionData(functionFragment: "redeem", values: [BigNumberish, BigNumberish]): string;
    encodeFunctionData(functionFragment: "sendFeeShare", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "shiftNECTFromCurveToSP", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "shiftNECTFromSPToCurve", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "startShifterCountdown", values?: undefined): string;
    encodeFunctionData(functionFragment: "targetAverageAgeSeconds", values?: undefined): string;
    encodeFunctionData(functionFragment: "totalWeightedStartTimes", values?: undefined): string;
    encodeFunctionData(functionFragment: "yTokensHeldByCBM", values?: undefined): string;
    encodeFunctionData(functionFragment: "yearnCurveVault", values?: undefined): string;
    encodeFunctionData(functionFragment: "yearnGovernanceAddress", values?: undefined): string;
    encodeFunctionData(functionFragment: "yearnRegistry", values?: undefined): string;
    decodeFunctionResult(functionFragment: "BETA", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "BOOTSTRAP_PERIOD_CHICKEN_IN", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "BOOTSTRAP_PERIOD_REDEEM", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "BOOTSTRAP_PERIOD_SHIFT", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "CHICKEN_IN_AMM_FEE", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "DECIMAL_PRECISION", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "INDEX_OF_NECT_TOKEN_IN_CURVE_POOL", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "MINUTE_DECAY_FACTOR", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "MIN_BNECT_SUPPLY", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "MIN_BOND_AMOUNT", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "NFT_RANDOMNESS_DIVISOR", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "SECONDS_IN_ONE_MINUTE", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "SHIFTER_DELAY", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "SHIFTER_WINDOW", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "_calcSystemBackingRatioFromBAMMValue", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "accrualAdjustmentMultiplier", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "accrualAdjustmentPeriodCount", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "accrualAdjustmentPeriodSeconds", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "accrualParameter", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "activateMigration", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "bNECTToken", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "bammSPVault", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "baseRedemptionRate", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "bondNFT", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "calcAccruedBNECT", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "calcBondBNECTCap", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "calcRedemptionFeePercentage", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "calcSystemBackingRatio", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "calcTotalNECTValue", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "calcTotalYearnCurveVaultShareValue", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "calcUpdatedAccrualParameter", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "chickenIn", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "chickenOut", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "countChickenIn", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "countChickenOut", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "createBond", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "createBondWithPermit", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "curveBasePool", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "curveDepositNECT3CRVExchangeRateThreshold", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "curveLiquidityGauge", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "curvePool", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "curveWithdrawal3CRVNECTExchangeRateThreshold", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "deploymentTimestamp", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "firstChickenInTime", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getAcquiredNECTInCurve", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getAcquiredNECTInSP", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getBAMMNECTDebt", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getBondData", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getNECTInBAMMSPVault", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getNECTToAcquire", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getOpenBondCount", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getOwnedNECTInCurve", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getOwnedNECTInSP", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getPendingNECT", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getPermanentNECT", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getTotalAcquiredNECT", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getTotalNECTInCurve", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getTreasury", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "lastRedemptionTime", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "lastShifterCountdownStartTime", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "nectToken", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "migration", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "minimumAccrualParameter", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "redeem", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "sendFeeShare", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "shiftNECTFromCurveToSP", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "shiftNECTFromSPToCurve", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "startShifterCountdown", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "targetAverageAgeSeconds", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "totalWeightedStartTimes", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "yTokensHeldByCBM", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "yearnCurveVault", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "yearnGovernanceAddress", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "yearnRegistry", data: BytesLike): Result;
    events: {
        "AccrualParameterUpdated(uint256)": EventFragment;
        "BNECTRedeemed(address,uint256,uint256,uint256,uint256,uint256)": EventFragment;
        "BaseRedemptionRateUpdated(uint256)": EventFragment;
        "BondCancelled(address,uint256,uint256,uint256,uint256,uint80)": EventFragment;
        "BondClaimed(address,uint256,uint256,uint256,uint256,uint256,bool,uint80)": EventFragment;
        "BondCreated(address,uint256,uint256,uint80)": EventFragment;
        "LastRedemptionTimeUpdated(uint256)": EventFragment;
        "MigrationTriggered(uint256)": EventFragment;
    };
    getEvent(nameOrSignatureOrTopic: "AccrualParameterUpdated"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "BNECTRedeemed"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "BaseRedemptionRateUpdated"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "BondCancelled"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "BondClaimed"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "BondCreated"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "LastRedemptionTimeUpdated"): EventFragment;
    getEvent(nameOrSignatureOrTopic: "MigrationTriggered"): EventFragment;
}
export interface AccrualParameterUpdatedEventObject {
    accrualParameter: BigNumber;
}
export declare type AccrualParameterUpdatedEvent = TypedEvent<[
    BigNumber
], AccrualParameterUpdatedEventObject>;
export declare type AccrualParameterUpdatedEventFilter = TypedEventFilter<AccrualParameterUpdatedEvent>;
export interface BNECTRedeemedEventObject {
    redeemer: string;
    bNectAmount: BigNumber;
    minNectAmount: BigNumber;
    nectAmount: BigNumber;
    yTokens: BigNumber;
    redemptionFee: BigNumber;
}
export declare type BNECTRedeemedEvent = TypedEvent<[
    string,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber
], BNECTRedeemedEventObject>;
export declare type BNECTRedeemedEventFilter = TypedEventFilter<BNECTRedeemedEvent>;
export interface BaseRedemptionRateUpdatedEventObject {
    _baseRedemptionRate: BigNumber;
}
export declare type BaseRedemptionRateUpdatedEvent = TypedEvent<[
    BigNumber
], BaseRedemptionRateUpdatedEventObject>;
export declare type BaseRedemptionRateUpdatedEventFilter = TypedEventFilter<BaseRedemptionRateUpdatedEvent>;
export interface BondCancelledEventObject {
    bonder: string;
    bondId: BigNumber;
    principalNectAmount: BigNumber;
    minNectAmount: BigNumber;
    withdrawnNectAmount: BigNumber;
    bondFinalHalfDna: BigNumber;
}
export declare type BondCancelledEvent = TypedEvent<[
    string,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber
], BondCancelledEventObject>;
export declare type BondCancelledEventFilter = TypedEventFilter<BondCancelledEvent>;
export interface BondClaimedEventObject {
    bonder: string;
    bondId: BigNumber;
    nectAmount: BigNumber;
    bNectAmount: BigNumber;
    nectSurplus: BigNumber;
    chickenInFeeAmount: BigNumber;
    migration: boolean;
    bondFinalHalfDna: BigNumber;
}
export declare type BondClaimedEvent = TypedEvent<[
    string,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber,
    BigNumber,
    boolean,
    BigNumber
], BondClaimedEventObject>;
export declare type BondClaimedEventFilter = TypedEventFilter<BondClaimedEvent>;
export interface BondCreatedEventObject {
    bonder: string;
    bondId: BigNumber;
    amount: BigNumber;
    bondInitialHalfDna: BigNumber;
}
export declare type BondCreatedEvent = TypedEvent<[
    string,
    BigNumber,
    BigNumber,
    BigNumber
], BondCreatedEventObject>;
export declare type BondCreatedEventFilter = TypedEventFilter<BondCreatedEvent>;
export interface LastRedemptionTimeUpdatedEventObject {
    _lastRedemptionFeeOpTime: BigNumber;
}
export declare type LastRedemptionTimeUpdatedEvent = TypedEvent<[
    BigNumber
], LastRedemptionTimeUpdatedEventObject>;
export declare type LastRedemptionTimeUpdatedEventFilter = TypedEventFilter<LastRedemptionTimeUpdatedEvent>;
export interface MigrationTriggeredEventObject {
    previousPermanentNECT: BigNumber;
}
export declare type MigrationTriggeredEvent = TypedEvent<[
    BigNumber
], MigrationTriggeredEventObject>;
export declare type MigrationTriggeredEventFilter = TypedEventFilter<MigrationTriggeredEvent>;
export interface ChickenBondManager extends BaseContract {
    connect(signerOrProvider: Signer | Provider | string): this;
    attach(addressOrName: string): this;
    deployed(): Promise<this>;
    interface: ChickenBondManagerInterface;
    queryFilter<TEvent extends TypedEvent>(event: TypedEventFilter<TEvent>, fromBlockOrBlockhash?: string | number | undefined, toBlock?: string | number | undefined): Promise<Array<TEvent>>;
    listeners<TEvent extends TypedEvent>(eventFilter?: TypedEventFilter<TEvent>): Array<TypedListener<TEvent>>;
    listeners(eventName?: string): Array<Listener>;
    removeAllListeners<TEvent extends TypedEvent>(eventFilter: TypedEventFilter<TEvent>): this;
    removeAllListeners(eventName?: string): this;
    off: OnEvent<this>;
    on: OnEvent<this>;
    once: OnEvent<this>;
    removeListener: OnEvent<this>;
    functions: {
        BETA(overrides?: CallOverrides): Promise<[BigNumber]>;
        BOOTSTRAP_PERIOD_CHICKEN_IN(overrides?: CallOverrides): Promise<[BigNumber]>;
        BOOTSTRAP_PERIOD_REDEEM(overrides?: CallOverrides): Promise<[BigNumber]>;
        BOOTSTRAP_PERIOD_SHIFT(overrides?: CallOverrides): Promise<[BigNumber]>;
        CHICKEN_IN_AMM_FEE(overrides?: CallOverrides): Promise<[BigNumber]>;
        DECIMAL_PRECISION(overrides?: CallOverrides): Promise<[BigNumber]>;
        INDEX_OF_NECT_TOKEN_IN_CURVE_POOL(overrides?: CallOverrides): Promise<[BigNumber]>;
        MINUTE_DECAY_FACTOR(overrides?: CallOverrides): Promise<[BigNumber]>;
        MIN_BNECT_SUPPLY(overrides?: CallOverrides): Promise<[BigNumber]>;
        MIN_BOND_AMOUNT(overrides?: CallOverrides): Promise<[BigNumber]>;
        NFT_RANDOMNESS_DIVISOR(overrides?: CallOverrides): Promise<[BigNumber]>;
        SECONDS_IN_ONE_MINUTE(overrides?: CallOverrides): Promise<[BigNumber]>;
        SHIFTER_DELAY(overrides?: CallOverrides): Promise<[BigNumber]>;
        SHIFTER_WINDOW(overrides?: CallOverrides): Promise<[BigNumber]>;
        _calcSystemBackingRatioFromBAMMValue(_bammNECTValue: BigNumberish, overrides?: CallOverrides): Promise<[BigNumber]>;
        accrualAdjustmentMultiplier(overrides?: CallOverrides): Promise<[BigNumber]>;
        accrualAdjustmentPeriodCount(overrides?: CallOverrides): Promise<[BigNumber]>;
        accrualAdjustmentPeriodSeconds(overrides?: CallOverrides): Promise<[BigNumber]>;
        accrualParameter(overrides?: CallOverrides): Promise<[BigNumber]>;
        activateMigration(overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        bNECTToken(overrides?: CallOverrides): Promise<[string]>;
        bammSPVault(overrides?: CallOverrides): Promise<[string]>;
        baseRedemptionRate(overrides?: CallOverrides): Promise<[BigNumber]>;
        bondNFT(overrides?: CallOverrides): Promise<[string]>;
        calcAccruedBNECT(_bondID: BigNumberish, overrides?: CallOverrides): Promise<[BigNumber]>;
        calcBondBNECTCap(_bondID: BigNumberish, overrides?: CallOverrides): Promise<[BigNumber]>;
        calcRedemptionFeePercentage(_fractionOfBNECTToRedeem: BigNumberish, overrides?: CallOverrides): Promise<[BigNumber]>;
        calcSystemBackingRatio(overrides?: CallOverrides): Promise<[BigNumber]>;
        calcTotalNECTValue(overrides?: CallOverrides): Promise<[BigNumber]>;
        calcTotalYearnCurveVaultShareValue(overrides?: CallOverrides): Promise<[BigNumber]>;
        calcUpdatedAccrualParameter(overrides?: CallOverrides): Promise<[BigNumber]>;
        chickenIn(_bondID: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        chickenOut(_bondID: BigNumberish, _minNECT: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        countChickenIn(overrides?: CallOverrides): Promise<[BigNumber]>;
        countChickenOut(overrides?: CallOverrides): Promise<[BigNumber]>;
        createBond(_nectAmount: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        createBondWithPermit(owner: string, amount: BigNumberish, deadline: BigNumberish, v: BigNumberish, r: BytesLike, s: BytesLike, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        curveBasePool(overrides?: CallOverrides): Promise<[string]>;
        curveDepositNECT3CRVExchangeRateThreshold(overrides?: CallOverrides): Promise<[BigNumber]>;
        curveLiquidityGauge(overrides?: CallOverrides): Promise<[string]>;
        curvePool(overrides?: CallOverrides): Promise<[string]>;
        curveWithdrawal3CRVNECTExchangeRateThreshold(overrides?: CallOverrides): Promise<[BigNumber]>;
        deploymentTimestamp(overrides?: CallOverrides): Promise<[BigNumber]>;
        firstChickenInTime(overrides?: CallOverrides): Promise<[BigNumber]>;
        getAcquiredNECTInCurve(overrides?: CallOverrides): Promise<[BigNumber]>;
        getAcquiredNECTInSP(overrides?: CallOverrides): Promise<[BigNumber]>;
        getBAMMNECTDebt(overrides?: CallOverrides): Promise<[BigNumber]>;
        getBondData(_bondID: BigNumberish, overrides?: CallOverrides): Promise<[
            BigNumber,
            BigNumber,
            BigNumber,
            BigNumber,
            number
        ] & {
            nectAmount: BigNumber;
            claimedBNECT: BigNumber;
            startTime: BigNumber;
            endTime: BigNumber;
            status: number;
        }>;
        getNECTInBAMMSPVault(overrides?: CallOverrides): Promise<[BigNumber]>;
        getNECTToAcquire(_bondID: BigNumberish, overrides?: CallOverrides): Promise<[BigNumber]>;
        getOpenBondCount(overrides?: CallOverrides): Promise<[BigNumber] & {
            openBondCount: BigNumber;
        }>;
        getOwnedNECTInCurve(overrides?: CallOverrides): Promise<[BigNumber]>;
        getOwnedNECTInSP(overrides?: CallOverrides): Promise<[BigNumber]>;
        getPendingNECT(overrides?: CallOverrides): Promise<[BigNumber]>;
        getPermanentNECT(overrides?: CallOverrides): Promise<[BigNumber]>;
        getTotalAcquiredNECT(overrides?: CallOverrides): Promise<[BigNumber]>;
        getTotalNECTInCurve(overrides?: CallOverrides): Promise<[BigNumber]>;
        getTreasury(overrides?: CallOverrides): Promise<[
            BigNumber,
            BigNumber,
            BigNumber
        ] & {
            _pendingNECT: BigNumber;
            _totalAcquiredNECT: BigNumber;
            _permanentNECT: BigNumber;
        }>;
        lastRedemptionTime(overrides?: CallOverrides): Promise<[BigNumber]>;
        lastShifterCountdownStartTime(overrides?: CallOverrides): Promise<[BigNumber]>;
        nectToken(overrides?: CallOverrides): Promise<[string]>;
        migration(overrides?: CallOverrides): Promise<[boolean]>;
        minimumAccrualParameter(overrides?: CallOverrides): Promise<[BigNumber]>;
        redeem(_bNECTToRedeem: BigNumberish, _minNECTFromBAMMSPVault: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        sendFeeShare(_nectAmount: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        shiftNECTFromCurveToSP(_maxNECTToShift: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        shiftNECTFromSPToCurve(_maxNECTToShift: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        startShifterCountdown(overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        targetAverageAgeSeconds(overrides?: CallOverrides): Promise<[BigNumber]>;
        totalWeightedStartTimes(overrides?: CallOverrides): Promise<[BigNumber]>;
        yTokensHeldByCBM(overrides?: CallOverrides): Promise<[BigNumber]>;
        yearnCurveVault(overrides?: CallOverrides): Promise<[string]>;
        yearnGovernanceAddress(overrides?: CallOverrides): Promise<[string]>;
        yearnRegistry(overrides?: CallOverrides): Promise<[string]>;
    };
    BETA(overrides?: CallOverrides): Promise<BigNumber>;
    BOOTSTRAP_PERIOD_CHICKEN_IN(overrides?: CallOverrides): Promise<BigNumber>;
    BOOTSTRAP_PERIOD_REDEEM(overrides?: CallOverrides): Promise<BigNumber>;
    BOOTSTRAP_PERIOD_SHIFT(overrides?: CallOverrides): Promise<BigNumber>;
    CHICKEN_IN_AMM_FEE(overrides?: CallOverrides): Promise<BigNumber>;
    DECIMAL_PRECISION(overrides?: CallOverrides): Promise<BigNumber>;
    INDEX_OF_NECT_TOKEN_IN_CURVE_POOL(overrides?: CallOverrides): Promise<BigNumber>;
    MINUTE_DECAY_FACTOR(overrides?: CallOverrides): Promise<BigNumber>;
    MIN_BNECT_SUPPLY(overrides?: CallOverrides): Promise<BigNumber>;
    MIN_BOND_AMOUNT(overrides?: CallOverrides): Promise<BigNumber>;
    NFT_RANDOMNESS_DIVISOR(overrides?: CallOverrides): Promise<BigNumber>;
    SECONDS_IN_ONE_MINUTE(overrides?: CallOverrides): Promise<BigNumber>;
    SHIFTER_DELAY(overrides?: CallOverrides): Promise<BigNumber>;
    SHIFTER_WINDOW(overrides?: CallOverrides): Promise<BigNumber>;
    _calcSystemBackingRatioFromBAMMValue(_bammNECTValue: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
    accrualAdjustmentMultiplier(overrides?: CallOverrides): Promise<BigNumber>;
    accrualAdjustmentPeriodCount(overrides?: CallOverrides): Promise<BigNumber>;
    accrualAdjustmentPeriodSeconds(overrides?: CallOverrides): Promise<BigNumber>;
    accrualParameter(overrides?: CallOverrides): Promise<BigNumber>;
    activateMigration(overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    bNECTToken(overrides?: CallOverrides): Promise<string>;
    bammSPVault(overrides?: CallOverrides): Promise<string>;
    baseRedemptionRate(overrides?: CallOverrides): Promise<BigNumber>;
    bondNFT(overrides?: CallOverrides): Promise<string>;
    calcAccruedBNECT(_bondID: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
    calcBondBNECTCap(_bondID: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
    calcRedemptionFeePercentage(_fractionOfBNECTToRedeem: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
    calcSystemBackingRatio(overrides?: CallOverrides): Promise<BigNumber>;
    calcTotalNECTValue(overrides?: CallOverrides): Promise<BigNumber>;
    calcTotalYearnCurveVaultShareValue(overrides?: CallOverrides): Promise<BigNumber>;
    calcUpdatedAccrualParameter(overrides?: CallOverrides): Promise<BigNumber>;
    chickenIn(_bondID: BigNumberish, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    chickenOut(_bondID: BigNumberish, _minNECT: BigNumberish, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    countChickenIn(overrides?: CallOverrides): Promise<BigNumber>;
    countChickenOut(overrides?: CallOverrides): Promise<BigNumber>;
    createBond(_nectAmount: BigNumberish, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    createBondWithPermit(owner: string, amount: BigNumberish, deadline: BigNumberish, v: BigNumberish, r: BytesLike, s: BytesLike, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    curveBasePool(overrides?: CallOverrides): Promise<string>;
    curveDepositNECT3CRVExchangeRateThreshold(overrides?: CallOverrides): Promise<BigNumber>;
    curveLiquidityGauge(overrides?: CallOverrides): Promise<string>;
    curvePool(overrides?: CallOverrides): Promise<string>;
    curveWithdrawal3CRVNECTExchangeRateThreshold(overrides?: CallOverrides): Promise<BigNumber>;
    deploymentTimestamp(overrides?: CallOverrides): Promise<BigNumber>;
    firstChickenInTime(overrides?: CallOverrides): Promise<BigNumber>;
    getAcquiredNECTInCurve(overrides?: CallOverrides): Promise<BigNumber>;
    getAcquiredNECTInSP(overrides?: CallOverrides): Promise<BigNumber>;
    getBAMMNECTDebt(overrides?: CallOverrides): Promise<BigNumber>;
    getBondData(_bondID: BigNumberish, overrides?: CallOverrides): Promise<[
        BigNumber,
        BigNumber,
        BigNumber,
        BigNumber,
        number
    ] & {
        nectAmount: BigNumber;
        claimedBNECT: BigNumber;
        startTime: BigNumber;
        endTime: BigNumber;
        status: number;
    }>;
    getNECTInBAMMSPVault(overrides?: CallOverrides): Promise<BigNumber>;
    getNECTToAcquire(_bondID: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
    getOpenBondCount(overrides?: CallOverrides): Promise<BigNumber>;
    getOwnedNECTInCurve(overrides?: CallOverrides): Promise<BigNumber>;
    getOwnedNECTInSP(overrides?: CallOverrides): Promise<BigNumber>;
    getPendingNECT(overrides?: CallOverrides): Promise<BigNumber>;
    getPermanentNECT(overrides?: CallOverrides): Promise<BigNumber>;
    getTotalAcquiredNECT(overrides?: CallOverrides): Promise<BigNumber>;
    getTotalNECTInCurve(overrides?: CallOverrides): Promise<BigNumber>;
    getTreasury(overrides?: CallOverrides): Promise<[
        BigNumber,
        BigNumber,
        BigNumber
    ] & {
        _pendingNECT: BigNumber;
        _totalAcquiredNECT: BigNumber;
        _permanentNECT: BigNumber;
    }>;
    lastRedemptionTime(overrides?: CallOverrides): Promise<BigNumber>;
    lastShifterCountdownStartTime(overrides?: CallOverrides): Promise<BigNumber>;
    nectToken(overrides?: CallOverrides): Promise<string>;
    migration(overrides?: CallOverrides): Promise<boolean>;
    minimumAccrualParameter(overrides?: CallOverrides): Promise<BigNumber>;
    redeem(_bNECTToRedeem: BigNumberish, _minNECTFromBAMMSPVault: BigNumberish, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    sendFeeShare(_nectAmount: BigNumberish, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    shiftNECTFromCurveToSP(_maxNECTToShift: BigNumberish, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    shiftNECTFromSPToCurve(_maxNECTToShift: BigNumberish, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    startShifterCountdown(overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    targetAverageAgeSeconds(overrides?: CallOverrides): Promise<BigNumber>;
    totalWeightedStartTimes(overrides?: CallOverrides): Promise<BigNumber>;
    yTokensHeldByCBM(overrides?: CallOverrides): Promise<BigNumber>;
    yearnCurveVault(overrides?: CallOverrides): Promise<string>;
    yearnGovernanceAddress(overrides?: CallOverrides): Promise<string>;
    yearnRegistry(overrides?: CallOverrides): Promise<string>;
    callStatic: {
        BETA(overrides?: CallOverrides): Promise<BigNumber>;
        BOOTSTRAP_PERIOD_CHICKEN_IN(overrides?: CallOverrides): Promise<BigNumber>;
        BOOTSTRAP_PERIOD_REDEEM(overrides?: CallOverrides): Promise<BigNumber>;
        BOOTSTRAP_PERIOD_SHIFT(overrides?: CallOverrides): Promise<BigNumber>;
        CHICKEN_IN_AMM_FEE(overrides?: CallOverrides): Promise<BigNumber>;
        DECIMAL_PRECISION(overrides?: CallOverrides): Promise<BigNumber>;
        INDEX_OF_NECT_TOKEN_IN_CURVE_POOL(overrides?: CallOverrides): Promise<BigNumber>;
        MINUTE_DECAY_FACTOR(overrides?: CallOverrides): Promise<BigNumber>;
        MIN_BNECT_SUPPLY(overrides?: CallOverrides): Promise<BigNumber>;
        MIN_BOND_AMOUNT(overrides?: CallOverrides): Promise<BigNumber>;
        NFT_RANDOMNESS_DIVISOR(overrides?: CallOverrides): Promise<BigNumber>;
        SECONDS_IN_ONE_MINUTE(overrides?: CallOverrides): Promise<BigNumber>;
        SHIFTER_DELAY(overrides?: CallOverrides): Promise<BigNumber>;
        SHIFTER_WINDOW(overrides?: CallOverrides): Promise<BigNumber>;
        _calcSystemBackingRatioFromBAMMValue(_bammNECTValue: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        accrualAdjustmentMultiplier(overrides?: CallOverrides): Promise<BigNumber>;
        accrualAdjustmentPeriodCount(overrides?: CallOverrides): Promise<BigNumber>;
        accrualAdjustmentPeriodSeconds(overrides?: CallOverrides): Promise<BigNumber>;
        accrualParameter(overrides?: CallOverrides): Promise<BigNumber>;
        activateMigration(overrides?: CallOverrides): Promise<void>;
        bNECTToken(overrides?: CallOverrides): Promise<string>;
        bammSPVault(overrides?: CallOverrides): Promise<string>;
        baseRedemptionRate(overrides?: CallOverrides): Promise<BigNumber>;
        bondNFT(overrides?: CallOverrides): Promise<string>;
        calcAccruedBNECT(_bondID: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        calcBondBNECTCap(_bondID: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        calcRedemptionFeePercentage(_fractionOfBNECTToRedeem: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        calcSystemBackingRatio(overrides?: CallOverrides): Promise<BigNumber>;
        calcTotalNECTValue(overrides?: CallOverrides): Promise<BigNumber>;
        calcTotalYearnCurveVaultShareValue(overrides?: CallOverrides): Promise<BigNumber>;
        calcUpdatedAccrualParameter(overrides?: CallOverrides): Promise<BigNumber>;
        chickenIn(_bondID: BigNumberish, overrides?: CallOverrides): Promise<void>;
        chickenOut(_bondID: BigNumberish, _minNECT: BigNumberish, overrides?: CallOverrides): Promise<void>;
        countChickenIn(overrides?: CallOverrides): Promise<BigNumber>;
        countChickenOut(overrides?: CallOverrides): Promise<BigNumber>;
        createBond(_nectAmount: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        createBondWithPermit(owner: string, amount: BigNumberish, deadline: BigNumberish, v: BigNumberish, r: BytesLike, s: BytesLike, overrides?: CallOverrides): Promise<BigNumber>;
        curveBasePool(overrides?: CallOverrides): Promise<string>;
        curveDepositNECT3CRVExchangeRateThreshold(overrides?: CallOverrides): Promise<BigNumber>;
        curveLiquidityGauge(overrides?: CallOverrides): Promise<string>;
        curvePool(overrides?: CallOverrides): Promise<string>;
        curveWithdrawal3CRVNECTExchangeRateThreshold(overrides?: CallOverrides): Promise<BigNumber>;
        deploymentTimestamp(overrides?: CallOverrides): Promise<BigNumber>;
        firstChickenInTime(overrides?: CallOverrides): Promise<BigNumber>;
        getAcquiredNECTInCurve(overrides?: CallOverrides): Promise<BigNumber>;
        getAcquiredNECTInSP(overrides?: CallOverrides): Promise<BigNumber>;
        getBAMMNECTDebt(overrides?: CallOverrides): Promise<BigNumber>;
        getBondData(_bondID: BigNumberish, overrides?: CallOverrides): Promise<[
            BigNumber,
            BigNumber,
            BigNumber,
            BigNumber,
            number
        ] & {
            nectAmount: BigNumber;
            claimedBNECT: BigNumber;
            startTime: BigNumber;
            endTime: BigNumber;
            status: number;
        }>;
        getNECTInBAMMSPVault(overrides?: CallOverrides): Promise<BigNumber>;
        getNECTToAcquire(_bondID: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        getOpenBondCount(overrides?: CallOverrides): Promise<BigNumber>;
        getOwnedNECTInCurve(overrides?: CallOverrides): Promise<BigNumber>;
        getOwnedNECTInSP(overrides?: CallOverrides): Promise<BigNumber>;
        getPendingNECT(overrides?: CallOverrides): Promise<BigNumber>;
        getPermanentNECT(overrides?: CallOverrides): Promise<BigNumber>;
        getTotalAcquiredNECT(overrides?: CallOverrides): Promise<BigNumber>;
        getTotalNECTInCurve(overrides?: CallOverrides): Promise<BigNumber>;
        getTreasury(overrides?: CallOverrides): Promise<[
            BigNumber,
            BigNumber,
            BigNumber
        ] & {
            _pendingNECT: BigNumber;
            _totalAcquiredNECT: BigNumber;
            _permanentNECT: BigNumber;
        }>;
        lastRedemptionTime(overrides?: CallOverrides): Promise<BigNumber>;
        lastShifterCountdownStartTime(overrides?: CallOverrides): Promise<BigNumber>;
        nectToken(overrides?: CallOverrides): Promise<string>;
        migration(overrides?: CallOverrides): Promise<boolean>;
        minimumAccrualParameter(overrides?: CallOverrides): Promise<BigNumber>;
        redeem(_bNECTToRedeem: BigNumberish, _minNECTFromBAMMSPVault: BigNumberish, overrides?: CallOverrides): Promise<[BigNumber, BigNumber]>;
        sendFeeShare(_nectAmount: BigNumberish, overrides?: CallOverrides): Promise<void>;
        shiftNECTFromCurveToSP(_maxNECTToShift: BigNumberish, overrides?: CallOverrides): Promise<void>;
        shiftNECTFromSPToCurve(_maxNECTToShift: BigNumberish, overrides?: CallOverrides): Promise<void>;
        startShifterCountdown(overrides?: CallOverrides): Promise<void>;
        targetAverageAgeSeconds(overrides?: CallOverrides): Promise<BigNumber>;
        totalWeightedStartTimes(overrides?: CallOverrides): Promise<BigNumber>;
        yTokensHeldByCBM(overrides?: CallOverrides): Promise<BigNumber>;
        yearnCurveVault(overrides?: CallOverrides): Promise<string>;
        yearnGovernanceAddress(overrides?: CallOverrides): Promise<string>;
        yearnRegistry(overrides?: CallOverrides): Promise<string>;
    };
    filters: {
        "AccrualParameterUpdated(uint256)"(accrualParameter?: null): AccrualParameterUpdatedEventFilter;
        AccrualParameterUpdated(accrualParameter?: null): AccrualParameterUpdatedEventFilter;
        "BNECTRedeemed(address,uint256,uint256,uint256,uint256,uint256)"(redeemer?: string | null, bNectAmount?: null, minNectAmount?: null, nectAmount?: null, yTokens?: null, redemptionFee?: null): BNECTRedeemedEventFilter;
        BNECTRedeemed(redeemer?: string | null, bNectAmount?: null, minNectAmount?: null, nectAmount?: null, yTokens?: null, redemptionFee?: null): BNECTRedeemedEventFilter;
        "BaseRedemptionRateUpdated(uint256)"(_baseRedemptionRate?: null): BaseRedemptionRateUpdatedEventFilter;
        BaseRedemptionRateUpdated(_baseRedemptionRate?: null): BaseRedemptionRateUpdatedEventFilter;
        "BondCancelled(address,uint256,uint256,uint256,uint256,uint80)"(bonder?: string | null, bondId?: null, principalNectAmount?: null, minNectAmount?: null, withdrawnNectAmount?: null, bondFinalHalfDna?: null): BondCancelledEventFilter;
        BondCancelled(bonder?: string | null, bondId?: null, principalNectAmount?: null, minNectAmount?: null, withdrawnNectAmount?: null, bondFinalHalfDna?: null): BondCancelledEventFilter;
        "BondClaimed(address,uint256,uint256,uint256,uint256,uint256,bool,uint80)"(bonder?: string | null, bondId?: null, nectAmount?: null, bNectAmount?: null, nectSurplus?: null, chickenInFeeAmount?: null, migration?: null, bondFinalHalfDna?: null): BondClaimedEventFilter;
        BondClaimed(bonder?: string | null, bondId?: null, nectAmount?: null, bNectAmount?: null, nectSurplus?: null, chickenInFeeAmount?: null, migration?: null, bondFinalHalfDna?: null): BondClaimedEventFilter;
        "BondCreated(address,uint256,uint256,uint80)"(bonder?: string | null, bondId?: null, amount?: null, bondInitialHalfDna?: null): BondCreatedEventFilter;
        BondCreated(bonder?: string | null, bondId?: null, amount?: null, bondInitialHalfDna?: null): BondCreatedEventFilter;
        "LastRedemptionTimeUpdated(uint256)"(_lastRedemptionFeeOpTime?: null): LastRedemptionTimeUpdatedEventFilter;
        LastRedemptionTimeUpdated(_lastRedemptionFeeOpTime?: null): LastRedemptionTimeUpdatedEventFilter;
        "MigrationTriggered(uint256)"(previousPermanentNECT?: null): MigrationTriggeredEventFilter;
        MigrationTriggered(previousPermanentNECT?: null): MigrationTriggeredEventFilter;
    };
    estimateGas: {
        BETA(overrides?: CallOverrides): Promise<BigNumber>;
        BOOTSTRAP_PERIOD_CHICKEN_IN(overrides?: CallOverrides): Promise<BigNumber>;
        BOOTSTRAP_PERIOD_REDEEM(overrides?: CallOverrides): Promise<BigNumber>;
        BOOTSTRAP_PERIOD_SHIFT(overrides?: CallOverrides): Promise<BigNumber>;
        CHICKEN_IN_AMM_FEE(overrides?: CallOverrides): Promise<BigNumber>;
        DECIMAL_PRECISION(overrides?: CallOverrides): Promise<BigNumber>;
        INDEX_OF_NECT_TOKEN_IN_CURVE_POOL(overrides?: CallOverrides): Promise<BigNumber>;
        MINUTE_DECAY_FACTOR(overrides?: CallOverrides): Promise<BigNumber>;
        MIN_BNECT_SUPPLY(overrides?: CallOverrides): Promise<BigNumber>;
        MIN_BOND_AMOUNT(overrides?: CallOverrides): Promise<BigNumber>;
        NFT_RANDOMNESS_DIVISOR(overrides?: CallOverrides): Promise<BigNumber>;
        SECONDS_IN_ONE_MINUTE(overrides?: CallOverrides): Promise<BigNumber>;
        SHIFTER_DELAY(overrides?: CallOverrides): Promise<BigNumber>;
        SHIFTER_WINDOW(overrides?: CallOverrides): Promise<BigNumber>;
        _calcSystemBackingRatioFromBAMMValue(_bammNECTValue: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        accrualAdjustmentMultiplier(overrides?: CallOverrides): Promise<BigNumber>;
        accrualAdjustmentPeriodCount(overrides?: CallOverrides): Promise<BigNumber>;
        accrualAdjustmentPeriodSeconds(overrides?: CallOverrides): Promise<BigNumber>;
        accrualParameter(overrides?: CallOverrides): Promise<BigNumber>;
        activateMigration(overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        bNECTToken(overrides?: CallOverrides): Promise<BigNumber>;
        bammSPVault(overrides?: CallOverrides): Promise<BigNumber>;
        baseRedemptionRate(overrides?: CallOverrides): Promise<BigNumber>;
        bondNFT(overrides?: CallOverrides): Promise<BigNumber>;
        calcAccruedBNECT(_bondID: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        calcBondBNECTCap(_bondID: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        calcRedemptionFeePercentage(_fractionOfBNECTToRedeem: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        calcSystemBackingRatio(overrides?: CallOverrides): Promise<BigNumber>;
        calcTotalNECTValue(overrides?: CallOverrides): Promise<BigNumber>;
        calcTotalYearnCurveVaultShareValue(overrides?: CallOverrides): Promise<BigNumber>;
        calcUpdatedAccrualParameter(overrides?: CallOverrides): Promise<BigNumber>;
        chickenIn(_bondID: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        chickenOut(_bondID: BigNumberish, _minNECT: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        countChickenIn(overrides?: CallOverrides): Promise<BigNumber>;
        countChickenOut(overrides?: CallOverrides): Promise<BigNumber>;
        createBond(_nectAmount: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        createBondWithPermit(owner: string, amount: BigNumberish, deadline: BigNumberish, v: BigNumberish, r: BytesLike, s: BytesLike, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        curveBasePool(overrides?: CallOverrides): Promise<BigNumber>;
        curveDepositNECT3CRVExchangeRateThreshold(overrides?: CallOverrides): Promise<BigNumber>;
        curveLiquidityGauge(overrides?: CallOverrides): Promise<BigNumber>;
        curvePool(overrides?: CallOverrides): Promise<BigNumber>;
        curveWithdrawal3CRVNECTExchangeRateThreshold(overrides?: CallOverrides): Promise<BigNumber>;
        deploymentTimestamp(overrides?: CallOverrides): Promise<BigNumber>;
        firstChickenInTime(overrides?: CallOverrides): Promise<BigNumber>;
        getAcquiredNECTInCurve(overrides?: CallOverrides): Promise<BigNumber>;
        getAcquiredNECTInSP(overrides?: CallOverrides): Promise<BigNumber>;
        getBAMMNECTDebt(overrides?: CallOverrides): Promise<BigNumber>;
        getBondData(_bondID: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        getNECTInBAMMSPVault(overrides?: CallOverrides): Promise<BigNumber>;
        getNECTToAcquire(_bondID: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        getOpenBondCount(overrides?: CallOverrides): Promise<BigNumber>;
        getOwnedNECTInCurve(overrides?: CallOverrides): Promise<BigNumber>;
        getOwnedNECTInSP(overrides?: CallOverrides): Promise<BigNumber>;
        getPendingNECT(overrides?: CallOverrides): Promise<BigNumber>;
        getPermanentNECT(overrides?: CallOverrides): Promise<BigNumber>;
        getTotalAcquiredNECT(overrides?: CallOverrides): Promise<BigNumber>;
        getTotalNECTInCurve(overrides?: CallOverrides): Promise<BigNumber>;
        getTreasury(overrides?: CallOverrides): Promise<BigNumber>;
        lastRedemptionTime(overrides?: CallOverrides): Promise<BigNumber>;
        lastShifterCountdownStartTime(overrides?: CallOverrides): Promise<BigNumber>;
        nectToken(overrides?: CallOverrides): Promise<BigNumber>;
        migration(overrides?: CallOverrides): Promise<BigNumber>;
        minimumAccrualParameter(overrides?: CallOverrides): Promise<BigNumber>;
        redeem(_bNECTToRedeem: BigNumberish, _minNECTFromBAMMSPVault: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        sendFeeShare(_nectAmount: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        shiftNECTFromCurveToSP(_maxNECTToShift: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        shiftNECTFromSPToCurve(_maxNECTToShift: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        startShifterCountdown(overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        targetAverageAgeSeconds(overrides?: CallOverrides): Promise<BigNumber>;
        totalWeightedStartTimes(overrides?: CallOverrides): Promise<BigNumber>;
        yTokensHeldByCBM(overrides?: CallOverrides): Promise<BigNumber>;
        yearnCurveVault(overrides?: CallOverrides): Promise<BigNumber>;
        yearnGovernanceAddress(overrides?: CallOverrides): Promise<BigNumber>;
        yearnRegistry(overrides?: CallOverrides): Promise<BigNumber>;
    };
    populateTransaction: {
        BETA(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        BOOTSTRAP_PERIOD_CHICKEN_IN(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        BOOTSTRAP_PERIOD_REDEEM(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        BOOTSTRAP_PERIOD_SHIFT(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        CHICKEN_IN_AMM_FEE(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        DECIMAL_PRECISION(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        INDEX_OF_NECT_TOKEN_IN_CURVE_POOL(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        MINUTE_DECAY_FACTOR(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        MIN_BNECT_SUPPLY(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        MIN_BOND_AMOUNT(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        NFT_RANDOMNESS_DIVISOR(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        SECONDS_IN_ONE_MINUTE(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        SHIFTER_DELAY(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        SHIFTER_WINDOW(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        _calcSystemBackingRatioFromBAMMValue(_bammNECTValue: BigNumberish, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        accrualAdjustmentMultiplier(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        accrualAdjustmentPeriodCount(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        accrualAdjustmentPeriodSeconds(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        accrualParameter(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        activateMigration(overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        bNECTToken(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        bammSPVault(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        baseRedemptionRate(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        bondNFT(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        calcAccruedBNECT(_bondID: BigNumberish, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        calcBondBNECTCap(_bondID: BigNumberish, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        calcRedemptionFeePercentage(_fractionOfBNECTToRedeem: BigNumberish, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        calcSystemBackingRatio(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        calcTotalNECTValue(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        calcTotalYearnCurveVaultShareValue(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        calcUpdatedAccrualParameter(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        chickenIn(_bondID: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        chickenOut(_bondID: BigNumberish, _minNECT: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        countChickenIn(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        countChickenOut(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        createBond(_nectAmount: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        createBondWithPermit(owner: string, amount: BigNumberish, deadline: BigNumberish, v: BigNumberish, r: BytesLike, s: BytesLike, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        curveBasePool(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        curveDepositNECT3CRVExchangeRateThreshold(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        curveLiquidityGauge(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        curvePool(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        curveWithdrawal3CRVNECTExchangeRateThreshold(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        deploymentTimestamp(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        firstChickenInTime(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getAcquiredNECTInCurve(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getAcquiredNECTInSP(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getBAMMNECTDebt(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getBondData(_bondID: BigNumberish, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getNECTInBAMMSPVault(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getNECTToAcquire(_bondID: BigNumberish, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getOpenBondCount(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getOwnedNECTInCurve(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getOwnedNECTInSP(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getPendingNECT(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getPermanentNECT(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getTotalAcquiredNECT(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getTotalNECTInCurve(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getTreasury(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        lastRedemptionTime(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        lastShifterCountdownStartTime(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        nectToken(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        migration(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        minimumAccrualParameter(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        redeem(_bNECTToRedeem: BigNumberish, _minNECTFromBAMMSPVault: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        sendFeeShare(_nectAmount: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        shiftNECTFromCurveToSP(_maxNECTToShift: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        shiftNECTFromSPToCurve(_maxNECTToShift: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        startShifterCountdown(overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        targetAverageAgeSeconds(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        totalWeightedStartTimes(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        yTokensHeldByCBM(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        yearnCurveVault(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        yearnGovernanceAddress(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        yearnRegistry(overrides?: CallOverrides): Promise<PopulatedTransaction>;
    };
}
