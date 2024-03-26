import { Block, BlockTag } from "@ethersproject/abstract-provider";
import { Signer } from "@ethersproject/abstract-signer";

import { Decimal } from "@beraborrow/lib-base";

import devOrNull from "../deployments/dev.json";
import mainnet from "../deployments/mainnet.json";
import sepolia from "../deployments/sepolia.json";
import berachain from "../deployments/berachain.json";

import { numberify, panic } from "./_utils";
import { EthersProvider, EthersSigner } from "./types";

import {
  _connectToContracts,
  _BeraBorrowContractAddresses,
  _BeraBorrowContracts,
  _BeraBorrowDeploymentJSON
} from "./contracts";

import { _connectToMulticall, _Multicall } from "./_Multicall";

const dev = devOrNull as _BeraBorrowDeploymentJSON | null;

// @ts-ignore
const deployments: {
  [chainId: number]: _BeraBorrowDeploymentJSON | undefined;
} = {
  [mainnet.chainId]: mainnet,
  [berachain.chainId]: berachain,

  ...(dev !== null ? { [dev.chainId]: dev } : {})
};

declare const brand: unique symbol;

const branded = <T>(t: Omit<T, typeof brand>): T => t as T;

/**
 * Information about a connection to the BeraBorrow protocol.
 *
 * @remarks
 * Provided for debugging / informational purposes.
 *
 * Exposed through {@link ReadableEthersBeraBorrow.connection} and {@link EthersBeraBorrow.connection}.
 *
 * @public
 */
export interface EthersBeraBorrowConnection extends EthersBeraBorrowConnectionOptionalParams {
  /** Ethers `Provider` used for connecting to the network. */
  readonly provider: EthersProvider;

  /** Ethers `Signer` used for sending transactions. */
  readonly signer?: EthersSigner;

  /** Chain ID of the connected network. */
  readonly chainId: number;

  /** Version of the BeraBorrow contracts (Git commit hash). */
  readonly version: string;

  /** Date when the BeraBorrow contracts were deployed. */
  readonly deploymentDate: Date;

  /** Number of block in which the first BeraBorrow contract was deployed. */
  readonly startBlock: number;

  /** Time period (in seconds) after `deploymentDate` during which redemptions are disabled. */
  readonly bootstrapPeriod: number;

  /** Total amount of POLLEN allocated for rewarding stability depositors. */
  readonly totalStabilityPoolPOLLENReward: Decimal;

  /** Amount of POLLEN collectively rewarded to stakers of the liquidity mining pool per second. */
  readonly liquidityMiningPOLLENRewardRate: Decimal;

  /** A mapping of BeraBorrow contracts' names to their addresses. */
  readonly addresses: Record<string, string>;

  /** @internal */
  readonly _priceFeedIsTestnet: boolean;

  /** @internal */
  readonly _isDev: boolean;

  /** @internal */
  readonly [brand]: unique symbol;
}

/** @internal */
export interface _InternalEthersBeraBorrowConnection extends EthersBeraBorrowConnection {
  readonly addresses: _BeraBorrowContractAddresses;
  readonly _contracts: _BeraBorrowContracts;
  readonly _multicall?: _Multicall;
}

const connectionFrom = (
  provider: EthersProvider,
  signer: EthersSigner | undefined,
  _contracts: _BeraBorrowContracts,
  _multicall: _Multicall | undefined,
  {
    deploymentDate,
    totalStabilityPoolPOLLENReward,
    liquidityMiningPOLLENRewardRate,
    ...deployment
  }: _BeraBorrowDeploymentJSON,
  optionalParams?: EthersBeraBorrowConnectionOptionalParams
): _InternalEthersBeraBorrowConnection => {
  if (
    optionalParams &&
    optionalParams.useStore !== undefined &&
    !validStoreOptions.includes(optionalParams.useStore)
  ) {
  throw new Error(`Invalid useStore value ${optionalParams.useStore}`);
  }

  return branded({
    provider,
    signer,
    _contracts,
    _multicall,
    deploymentDate: new Date(deploymentDate),
    totalStabilityPoolPOLLENReward: Decimal.from(totalStabilityPoolPOLLENReward),
    liquidityMiningPOLLENRewardRate: Decimal.from(liquidityMiningPOLLENRewardRate),
    ...deployment,
    ...optionalParams
  });
};

/** @internal */
export const _getContracts = (connection: EthersBeraBorrowConnection): _BeraBorrowContracts =>
  (connection as _InternalEthersBeraBorrowConnection)._contracts;

const getMulticall = (connection: EthersBeraBorrowConnection): _Multicall | undefined =>
  (connection as _InternalEthersBeraBorrowConnection)._multicall;

const getTimestampFromBlock = ({ timestamp }: Block) => timestamp;

/** @internal */
export const _getBlockTimestamp = (
  connection: EthersBeraBorrowConnection,
  blockTag: BlockTag = "latest"
): Promise<number> =>
  // Get the timestamp via a contract call whenever possible, to make it batchable with other calls
  getMulticall(connection)?.getCurrentBlockTimestamp({ blockTag }).then(numberify) ??
  _getProvider(connection).getBlock(blockTag).then(getTimestampFromBlock);

/** @internal */
export const _requireSigner = (connection: EthersBeraBorrowConnection): EthersSigner =>
  connection.signer ?? panic(new Error("Must be connected through a Signer"));

/** @internal */
export const _getProvider = (connection: EthersBeraBorrowConnection): EthersProvider =>
  connection.provider;

// TODO parameterize error message?
/** @internal */
export const _requireAddress = (
  connection: EthersBeraBorrowConnection,
  overrides?: { from?: string }
): string =>
  overrides?.from ?? connection.userAddress ?? panic(new Error("A user address is required"));

/** @internal */
export const _requireFrontendAddress = (connection: EthersBeraBorrowConnection): string =>
  connection.frontendTag ?? panic(new Error("A frontend address is required"));

/** @internal */
export const _usingStore = (
  connection: EthersBeraBorrowConnection
): connection is EthersBeraBorrowConnection & { useStore: EthersBeraBorrowStoreOption } =>
  connection.useStore !== undefined;

/**
 * Thrown when trying to connect to a network where BeraBorrow is not deployed.
 *
 * @remarks
 * Thrown by {@link ReadableEthersBeraBorrow.(connect:2)} and {@link EthersBeraBorrow.(connect:2)}.
 *
 * @public
 */
export class UnsupportedNetworkError extends Error {
  /** Chain ID of the unsupported network. */
  readonly chainId: number;

  /** @internal */
  constructor(chainId: number) {
    super(`Unsupported network (chainId = ${chainId})`);
    this.name = "UnsupportedNetworkError";
    this.chainId = chainId;
  }
}

const getProviderAndSigner = (
  signerOrProvider: EthersSigner | EthersProvider
): [provider: EthersProvider, signer: EthersSigner | undefined] => {
  const provider: EthersProvider = Signer.isSigner(signerOrProvider)
    ? signerOrProvider.provider ?? panic(new Error("Signer must have a Provider"))
    : signerOrProvider;

  const signer = Signer.isSigner(signerOrProvider) ? signerOrProvider : undefined;

  return [provider, signer];
};

/** @internal */
export const _connectToDeployment = (
  deployment: _BeraBorrowDeploymentJSON,
  signerOrProvider: EthersSigner | EthersProvider,
  optionalParams?: EthersBeraBorrowConnectionOptionalParams
): EthersBeraBorrowConnection =>
  connectionFrom(
    ...getProviderAndSigner(signerOrProvider),
    _connectToContracts(signerOrProvider, deployment),
    undefined,
    deployment,
    optionalParams
  );

/**
 * Possible values for the optional
 * {@link EthersBeraBorrowConnectionOptionalParams.useStore | useStore}
 * connection parameter.
 *
 * @remarks
 * Currently, the only supported value is `"blockPolled"`, in which case a
 * {@link BlockPolledBeraBorrowStore} will be created.
 *
 * @public
 */
export type EthersBeraBorrowStoreOption = "blockPolled";

const validStoreOptions = ["blockPolled"];

/**
 * Optional parameters of {@link ReadableEthersBeraBorrow.(connect:2)} and
 * {@link EthersBeraBorrow.(connect:2)}.
 *
 * @public
 */
export interface EthersBeraBorrowConnectionOptionalParams {
  /**
   * Address whose Trove, Stability Deposit, POLLEN Stake and balances will be read by default.
   *
   * @remarks
   * For example {@link EthersBeraBorrow.getTrove | getTrove(address?)} will return the Trove owned by
   * `userAddress` when the `address` parameter is omitted.
   *
   * Should be omitted when connecting through a {@link EthersSigner | Signer}. Instead `userAddress`
   * will be automatically determined from the `Signer`.
   */
  readonly userAddress?: string;

  /**
   * Address that will receive POLLEN rewards from newly created Stability Deposits by default.
   *
   * @remarks
   * For example
   * {@link EthersBeraBorrow.depositNECTInStabilityPool | depositNECTInStabilityPool(amount, frontendTag?)}
   * will tag newly made Stability Deposits with this address when its `frontendTag` parameter is
   * omitted.
   */
  readonly frontendTag?: string;

  /**
   * Create a {@link @beraborrow/lib-base#BeraBorrowStore} and expose it as the `store` property.
   *
   * @remarks
   * When set to one of the available {@link EthersBeraBorrowStoreOption | options},
   * {@link ReadableEthersBeraBorrow.(connect:2) | ReadableEthersBeraBorrow.connect()} will return a
   * {@link ReadableEthersBeraBorrowWithStore}, while
   * {@link EthersBeraBorrow.(connect:2) | EthersBeraBorrow.connect()} will return an
   * {@link EthersBeraBorrowWithStore}.
   *
   * Note that the store won't start monitoring the blockchain until its
   * {@link @beraborrow/lib-base#BeraBorrowStore.start | start()} function is called.
   */
  readonly useStore?: EthersBeraBorrowStoreOption;
}

/** @internal */
export function _connectByChainId<T>(
  provider: EthersProvider,
  signer: EthersSigner | undefined,
  chainId: number,
  optionalParams: EthersBeraBorrowConnectionOptionalParams & { useStore: T }
): EthersBeraBorrowConnection & { useStore: T };

/** @internal */
export function _connectByChainId(
  provider: EthersProvider,
  signer: EthersSigner | undefined,
  chainId: number,
  optionalParams?: EthersBeraBorrowConnectionOptionalParams
): EthersBeraBorrowConnection;

/** @internal */
export function _connectByChainId(
  provider: EthersProvider,
  signer: EthersSigner | undefined,
  chainId: number,
  optionalParams?: EthersBeraBorrowConnectionOptionalParams
): EthersBeraBorrowConnection {
  const deployment: _BeraBorrowDeploymentJSON =
    deployments[chainId] ?? panic(new UnsupportedNetworkError(chainId));
  
  return connectionFrom(
    provider,
    signer,
    _connectToContracts(provider, deployment),
    _connectToMulticall(provider, chainId),
    deployment,
    optionalParams
  );
}

/** @internal */
export const _connect = async (
  signerOrProvider: EthersSigner | EthersProvider,
  optionalParams?: EthersBeraBorrowConnectionOptionalParams
): Promise<EthersBeraBorrowConnection> => {
  const [provider, signer] = getProviderAndSigner(signerOrProvider);

  if (signer) {
    if (optionalParams?.userAddress !== undefined) {
      throw new Error("Can't override userAddress when connecting through Signer");
    }

    optionalParams = {
      ...optionalParams,
      userAddress: await signer.getAddress()
    };
  }

  return _connectByChainId(provider, signer, (await provider.getNetwork()).chainId, optionalParams);
};
