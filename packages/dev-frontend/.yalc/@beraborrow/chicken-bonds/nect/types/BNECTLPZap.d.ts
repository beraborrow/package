import type { BaseContract, BigNumber, BigNumberish, BytesLike, CallOverrides, ContractTransaction, Overrides, PopulatedTransaction, Signer, utils } from "ethers";
import type { FunctionFragment, Result } from "@ethersproject/abi";
import type { Listener, Provider } from "@ethersproject/providers";
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent } from "./common";
export interface BNECTLPZapInterface extends utils.Interface {
    functions: {
        "addLiquidity(uint256,uint256,uint256)": FunctionFragment;
        "addLiquidityAndStake(uint256,uint256,uint256)": FunctionFragment;
        "bNECTGauge()": FunctionFragment;
        "bNECTNECT3CRVLPToken()": FunctionFragment;
        "bNECTNECT3CRVPool()": FunctionFragment;
        "bNECTToken()": FunctionFragment;
        "getMinLPTokens(uint256,uint256)": FunctionFragment;
        "getMinWithdrawBalanced(uint256)": FunctionFragment;
        "getMinWithdrawNECT(uint256)": FunctionFragment;
        "nect3CRVPool()": FunctionFragment;
        "nectToken()": FunctionFragment;
        "removeLiquidityBalanced(uint256,uint256,uint256)": FunctionFragment;
        "removeLiquidityNECT(uint256,uint256)": FunctionFragment;
    };
    getFunction(nameOrSignatureOrTopic: "addLiquidity" | "addLiquidityAndStake" | "bNECTGauge" | "bNECTNECT3CRVLPToken" | "bNECTNECT3CRVPool" | "bNECTToken" | "getMinLPTokens" | "getMinWithdrawBalanced" | "getMinWithdrawNECT" | "nect3CRVPool" | "nectToken" | "removeLiquidityBalanced" | "removeLiquidityNECT"): FunctionFragment;
    encodeFunctionData(functionFragment: "addLiquidity", values: [BigNumberish, BigNumberish, BigNumberish]): string;
    encodeFunctionData(functionFragment: "addLiquidityAndStake", values: [BigNumberish, BigNumberish, BigNumberish]): string;
    encodeFunctionData(functionFragment: "bNECTGauge", values?: undefined): string;
    encodeFunctionData(functionFragment: "bNECTNECT3CRVLPToken", values?: undefined): string;
    encodeFunctionData(functionFragment: "bNECTNECT3CRVPool", values?: undefined): string;
    encodeFunctionData(functionFragment: "bNECTToken", values?: undefined): string;
    encodeFunctionData(functionFragment: "getMinLPTokens", values: [BigNumberish, BigNumberish]): string;
    encodeFunctionData(functionFragment: "getMinWithdrawBalanced", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "getMinWithdrawNECT", values: [BigNumberish]): string;
    encodeFunctionData(functionFragment: "nect3CRVPool", values?: undefined): string;
    encodeFunctionData(functionFragment: "nectToken", values?: undefined): string;
    encodeFunctionData(functionFragment: "removeLiquidityBalanced", values: [BigNumberish, BigNumberish, BigNumberish]): string;
    encodeFunctionData(functionFragment: "removeLiquidityNECT", values: [BigNumberish, BigNumberish]): string;
    decodeFunctionResult(functionFragment: "addLiquidity", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "addLiquidityAndStake", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "bNECTGauge", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "bNECTNECT3CRVLPToken", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "bNECTNECT3CRVPool", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "bNECTToken", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getMinLPTokens", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getMinWithdrawBalanced", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "getMinWithdrawNECT", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "nect3CRVPool", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "nectToken", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "removeLiquidityBalanced", data: BytesLike): Result;
    decodeFunctionResult(functionFragment: "removeLiquidityNECT", data: BytesLike): Result;
    events: {};
}
export interface BNECTLPZap extends BaseContract {
    connect(signerOrProvider: Signer | Provider | string): this;
    attach(addressOrName: string): this;
    deployed(): Promise<this>;
    interface: BNECTLPZapInterface;
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
        addLiquidity(_bNECTAmount: BigNumberish, _nectAmount: BigNumberish, _minLPTokens: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        addLiquidityAndStake(_bNECTAmount: BigNumberish, _nectAmount: BigNumberish, _minLPTokens: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        bNECTGauge(overrides?: CallOverrides): Promise<[string]>;
        bNECTNECT3CRVLPToken(overrides?: CallOverrides): Promise<[string]>;
        bNECTNECT3CRVPool(overrides?: CallOverrides): Promise<[string]>;
        bNECTToken(overrides?: CallOverrides): Promise<[string]>;
        getMinLPTokens(_bNECTAmount: BigNumberish, _nectAmount: BigNumberish, overrides?: CallOverrides): Promise<[BigNumber] & {
            bNECTNECT3CRVTokens: BigNumber;
        }>;
        getMinWithdrawBalanced(_lpAmount: BigNumberish, overrides?: CallOverrides): Promise<[
            BigNumber,
            BigNumber
        ] & {
            bNECTAmount: BigNumber;
            nectAmount: BigNumber;
        }>;
        getMinWithdrawNECT(_lpAmount: BigNumberish, overrides?: CallOverrides): Promise<[BigNumber] & {
            nectAmount: BigNumber;
        }>;
        nect3CRVPool(overrides?: CallOverrides): Promise<[string]>;
        nectToken(overrides?: CallOverrides): Promise<[string]>;
        removeLiquidityBalanced(_lpAmount: BigNumberish, _minBNECT: BigNumberish, _minNECT: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
        removeLiquidityNECT(_lpAmount: BigNumberish, _minNECT: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<ContractTransaction>;
    };
    addLiquidity(_bNECTAmount: BigNumberish, _nectAmount: BigNumberish, _minLPTokens: BigNumberish, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    addLiquidityAndStake(_bNECTAmount: BigNumberish, _nectAmount: BigNumberish, _minLPTokens: BigNumberish, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    bNECTGauge(overrides?: CallOverrides): Promise<string>;
    bNECTNECT3CRVLPToken(overrides?: CallOverrides): Promise<string>;
    bNECTNECT3CRVPool(overrides?: CallOverrides): Promise<string>;
    bNECTToken(overrides?: CallOverrides): Promise<string>;
    getMinLPTokens(_bNECTAmount: BigNumberish, _nectAmount: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
    getMinWithdrawBalanced(_lpAmount: BigNumberish, overrides?: CallOverrides): Promise<[
        BigNumber,
        BigNumber
    ] & {
        bNECTAmount: BigNumber;
        nectAmount: BigNumber;
    }>;
    getMinWithdrawNECT(_lpAmount: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
    nect3CRVPool(overrides?: CallOverrides): Promise<string>;
    nectToken(overrides?: CallOverrides): Promise<string>;
    removeLiquidityBalanced(_lpAmount: BigNumberish, _minBNECT: BigNumberish, _minNECT: BigNumberish, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    removeLiquidityNECT(_lpAmount: BigNumberish, _minNECT: BigNumberish, overrides?: Overrides & {
        from?: string | Promise<string>;
    }): Promise<ContractTransaction>;
    callStatic: {
        addLiquidity(_bNECTAmount: BigNumberish, _nectAmount: BigNumberish, _minLPTokens: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        addLiquidityAndStake(_bNECTAmount: BigNumberish, _nectAmount: BigNumberish, _minLPTokens: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        bNECTGauge(overrides?: CallOverrides): Promise<string>;
        bNECTNECT3CRVLPToken(overrides?: CallOverrides): Promise<string>;
        bNECTNECT3CRVPool(overrides?: CallOverrides): Promise<string>;
        bNECTToken(overrides?: CallOverrides): Promise<string>;
        getMinLPTokens(_bNECTAmount: BigNumberish, _nectAmount: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        getMinWithdrawBalanced(_lpAmount: BigNumberish, overrides?: CallOverrides): Promise<[
            BigNumber,
            BigNumber
        ] & {
            bNECTAmount: BigNumber;
            nectAmount: BigNumber;
        }>;
        getMinWithdrawNECT(_lpAmount: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        nect3CRVPool(overrides?: CallOverrides): Promise<string>;
        nectToken(overrides?: CallOverrides): Promise<string>;
        removeLiquidityBalanced(_lpAmount: BigNumberish, _minBNECT: BigNumberish, _minNECT: BigNumberish, overrides?: CallOverrides): Promise<void>;
        removeLiquidityNECT(_lpAmount: BigNumberish, _minNECT: BigNumberish, overrides?: CallOverrides): Promise<void>;
    };
    filters: {};
    estimateGas: {
        addLiquidity(_bNECTAmount: BigNumberish, _nectAmount: BigNumberish, _minLPTokens: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        addLiquidityAndStake(_bNECTAmount: BigNumberish, _nectAmount: BigNumberish, _minLPTokens: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        bNECTGauge(overrides?: CallOverrides): Promise<BigNumber>;
        bNECTNECT3CRVLPToken(overrides?: CallOverrides): Promise<BigNumber>;
        bNECTNECT3CRVPool(overrides?: CallOverrides): Promise<BigNumber>;
        bNECTToken(overrides?: CallOverrides): Promise<BigNumber>;
        getMinLPTokens(_bNECTAmount: BigNumberish, _nectAmount: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        getMinWithdrawBalanced(_lpAmount: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        getMinWithdrawNECT(_lpAmount: BigNumberish, overrides?: CallOverrides): Promise<BigNumber>;
        nect3CRVPool(overrides?: CallOverrides): Promise<BigNumber>;
        nectToken(overrides?: CallOverrides): Promise<BigNumber>;
        removeLiquidityBalanced(_lpAmount: BigNumberish, _minBNECT: BigNumberish, _minNECT: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
        removeLiquidityNECT(_lpAmount: BigNumberish, _minNECT: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<BigNumber>;
    };
    populateTransaction: {
        addLiquidity(_bNECTAmount: BigNumberish, _nectAmount: BigNumberish, _minLPTokens: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        addLiquidityAndStake(_bNECTAmount: BigNumberish, _nectAmount: BigNumberish, _minLPTokens: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        bNECTGauge(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        bNECTNECT3CRVLPToken(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        bNECTNECT3CRVPool(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        bNECTToken(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getMinLPTokens(_bNECTAmount: BigNumberish, _nectAmount: BigNumberish, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getMinWithdrawBalanced(_lpAmount: BigNumberish, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        getMinWithdrawNECT(_lpAmount: BigNumberish, overrides?: CallOverrides): Promise<PopulatedTransaction>;
        nect3CRVPool(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        nectToken(overrides?: CallOverrides): Promise<PopulatedTransaction>;
        removeLiquidityBalanced(_lpAmount: BigNumberish, _minBNECT: BigNumberish, _minNECT: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
        removeLiquidityNECT(_lpAmount: BigNumberish, _minNECT: BigNumberish, overrides?: Overrides & {
            from?: string | Promise<string>;
        }): Promise<PopulatedTransaction>;
    };
}
