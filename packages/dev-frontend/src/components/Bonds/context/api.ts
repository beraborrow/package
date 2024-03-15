import {
  BigNumber,
  BigNumberish,
  CallOverrides,
  constants,
  Contract,
  ContractTransaction,
  providers,
  Signer
} from "ethers";
// import { splitSignature } from "ethers/lib/utils";
import type {
  BNECTToken,
  BondNFT,
  ChickenBondManager,
  BNECTLPZap
} from "@beraborrow/chicken-bonds/nect/types";
import {
  CurveCryptoSwap2ETH,
  CurveRegistrySwaps__factory
} from "@beraborrow/chicken-bonds/nect/types/external";
import type {
  BondCreatedEventObject,
  BondCreatedEvent,
  BondCancelledEventObject,
  BondCancelledEvent,
  BondClaimedEventObject,
  BondClaimedEvent
} from "@beraborrow/chicken-bonds/nect/types/ChickenBondManager";
import { Decimal } from "@beraborrow/lib-base";
import type { NECTToken } from "@beraborrow/lib-ethers/dist/types";
import type { ProtocolInfo, Bond, BondStatus, Stats, Maybe, BNectLpRewards } from "./transitions";
import {
  numberify,
  decimalify,
  getBondAgeInDays,
  milliseconds,
  toFloat,
  getReturn,
  getTokenUri,
  getFutureBNectAccrualFactor,
  getRebondPeriodInDays,
  getBreakEvenPeriodInDays,
  getAverageBondAgeInSeconds,
  getRemainingRebondOrBreakEvenDays,
  getRebondOrBreakEvenTimeWithControllerAdjustment,
  getFloorPrice
} from "../utils";
import { UNKNOWN_DATE } from "../../HorizontalTimeline";
import { BNectAmmTokenIndex } from "./transitions";
import {
  TokenExchangeEvent,
  TokenExchangeEventObject
} from "@beraborrow/chicken-bonds/nect/types/external/CurveCryptoSwap2ETH";
import mainnet from "@beraborrow/chicken-bonds/nect/addresses/mainnet.json";
import type {
  CurveLiquidityGaugeV5,
  DepositEvent,
  DepositEventObject,
  WithdrawEvent,
  WithdrawEventObject
} from "@beraborrow/chicken-bonds/nect/types/external/CurveLiquidityGaugeV5";

const BOND_STATUS: BondStatus[] = ["NON_EXISTENT", "PENDING", "CANCELLED", "CLAIMED"];

const NECT_3CRV_POOL_ADDRESS = "0xEd279fDD11cA84bEef15AF5D39BB4d4bEE23F0cA";
const NECT_TOKEN_ADDRESS = "0x5f98805A4E8be255a32880FDeC7F6728C6568bA0";
const CURVE_REGISTRY_SWAPS_ADDRESS = "0x81C46fECa27B31F3ADC2b91eE4be9717d1cd3DD7";
const BNECT_NECT_3CRV_POOL_ADDRESS = "0x74ED5d42203806c8CDCf2F04Ca5F60DC777b901c";
const CRV_TOKEN_ADDRESS = "0xD533a949740bb3306d119CC777fa900bA034cd52";

const TOKEN_ADDRESS_NAME_MAP: Record<string, string> = {
  [NECT_TOKEN_ADDRESS]: "NECT",
  [CRV_TOKEN_ADDRESS]: "CRV"
};

const POLLEN_ISSUANCE_GAS_HEADROOM = BigNumber.from(50000);

// [
//   token_1,
//   pool_1,
//   token_2,
//   pool_2,
//   ...
//   pool_{n-1},
//   token_{n}
// ]
const bNectToNectRoute: [string, string, string, string, string] = [
  mainnet.BNECT_TOKEN_ADDRESS ?? "",
  mainnet.BNECT_AMM_ADDRESS ?? "",
  NECT_3CRV_POOL_ADDRESS, // LP token of NECT-3Crv-f has same address as pool
  NECT_3CRV_POOL_ADDRESS,
  NECT_TOKEN_ADDRESS
];

const nectToBNectRoute = [...bNectToNectRoute].reverse() as typeof bNectToNectRoute;

type RouteAddresses = [string, string, string, string, string, string, string, string, string];
type RouteSwapParams = [BigNumberish, BigNumberish, BigNumberish];
type RouteSwaps = [RouteSwapParams, RouteSwapParams, RouteSwapParams, RouteSwapParams];

const getRoute = (inputToken: BNectAmmTokenIndex): [RouteAddresses, RouteSwaps] => [
  [
    ...(inputToken === BNectAmmTokenIndex.BNECT ? bNectToNectRoute : nectToBNectRoute),
    constants.AddressZero,
    constants.AddressZero,
    constants.AddressZero,
    constants.AddressZero
  ],
  [
    // Params:
    // 1) input token index (unused by remove_liquidity_one_coin())
    // 2) output token index (unused by add_liquidity())
    // 3) function to call (see below)
    //
    // Functions:
    // 3 = exchange() in crypto pool
    // 6 = add_liquidity() single-sidedly to 2-pool
    // 9 = remove_liquidity_one_coin()
    //
    // Indices:
    // - bNECT pool: { 0: bNECT, 1: NECT-3Crv-f }
    // - NECT-3Crv-f pool: { 0: NECT, 1: 3Crv }

    //                                          bNECT        NECT
    inputToken === BNectAmmTokenIndex.BNECT ? [0, 1, 3] : [0, 0, 6], // step 1
    inputToken === BNectAmmTokenIndex.BNECT ? [0, 0, 9] : [1, 0, 3], // step 2
    [0, 0, 0], //                                NECT       bNECT
    [0, 0, 0]
  ]
];

type CachedYearnApys = {
  nect3Crv: Decimal | undefined;
  stabilityPool: Decimal | undefined;
  bNectNect3Crv: Decimal | undefined;
};

const cachedApys: CachedYearnApys = {
  nect3Crv: undefined,
  stabilityPool: undefined,
  bNectNect3Crv: undefined
};

type YearnVault = Partial<{
  token: {
    address: string;
  };
  apy: {
    net_apy: number;
  };
}>;

type CurvePoolData = Partial<{
  data: {
    poolData: Array<{ id: string; gaugeRewards: Array<{ apy: number }> }>;
  };
}>;

type CurvePoolDetails = Partial<{
  data: {
    poolDetails: Array<{ poolAddress: string; apy: number }>;
  };
}>;

const CURVE_POOL_ID = "factory-crypto-134";

const cacheCurveLpApy = async (): Promise<void> => {
  try {
    const curvePoolDataResponse = (await (
      await window.fetch("https://api.curve.fi/api/getPools/ethereum/factory-crypto")
    ).json()) as CurvePoolData;

    const curvePoolDetailsResponse = (await await (
      await window.fetch("https://api.curve.fi/api/getFactoryAPYs?version=crypto")
    ).json()) as CurvePoolDetails;

    const poolData = curvePoolDataResponse.data?.poolData.find(pool => pool.id === CURVE_POOL_ID);
    const rewardsApr = poolData?.gaugeRewards.reduce((total, current) => total + current.apy, 0);
    const baseApr = curvePoolDetailsResponse?.data?.poolDetails?.find(
      pool => pool.poolAddress === BNECT_NECT_3CRV_POOL_ADDRESS
    )?.apy;

    if (rewardsApr === undefined && baseApr === undefined) return;

    const apr = (rewardsApr ?? 0) + (baseApr ?? 0);

    cachedApys.bNectNect3Crv = Decimal.from(apr);
  } catch (error: unknown) {
    console.log("cacheCurveLpApy failed");
    console.error(error);
  }
};

const cacheYearnVaultApys = async (): Promise<void> => {
  try {
    if (cachedApys.nect3Crv !== undefined) return;

    const yearnResponse = (await (
      await window.fetch("https://api.yexporter.io/v1/chains/1/vaults/all")
    ).json()) as YearnVault[];

    const nect3CrvVault = yearnResponse.find(
      vault => vault?.token?.address === NECT_3CRV_POOL_ADDRESS
    );

    const stabilityPoolVault = yearnResponse.find(
      vault => vault?.token?.address === NECT_TOKEN_ADDRESS
    );

    if (
      nect3CrvVault?.apy?.net_apy === undefined ||
      stabilityPoolVault?.apy?.net_apy === undefined
    ) {
      return;
    }

    cachedApys.nect3Crv = Decimal.from(nect3CrvVault.apy.net_apy);
    cachedApys.stabilityPool = Decimal.from(stabilityPoolVault.apy.net_apy);
  } catch (error: unknown) {
    console.log("cacheYearnVaultApys failed");
    console.error(error);
  }
};

const getAccountBonds = async (
  account: string,
  bondNft: BondNFT,
  chickenBondManager: ChickenBondManager,
  protocolInfo: ProtocolInfo
): Promise<Bond[]> => {
  try {
    const {
      marketPrice,
      alphaAccrualFactor,
      marketPricePremium,
      claimBondFee,
      floorPrice,
      controllerTargetAge,
      averageBondAge
    } = protocolInfo;

    const totalBonds = (await bondNft.balanceOf(account)).toNumber();

    const bondIdRequests = Array.from(Array(totalBonds)).map((_, index) =>
      bondNft.tokenOfOwnerByIndex(account, index)
    );

    const bondIds = await Promise.all(bondIdRequests);

    const bondRequests = {
      deposits: bondIds.map(bondId => bondNft.getBondAmount(bondId)),
      accrueds: bondIds.map(bondId => chickenBondManager.calcAccruedBNECT(bondId)),
      startTimes: bondIds.map(bondId => bondNft.getBondStartTime(bondId)),
      endTimes: bondIds.map(bondId => bondNft.getBondEndTime(bondId)),
      statuses: bondIds.map(bondId => bondNft.getBondStatus(bondId)),
      tokenUris: bondIds.map(bondId => bondNft.tokenURI(bondId)),
      claimedAmounts: bondIds.map(bondId => bondNft.getBondClaimedBNECT(bondId))
    };

    const bondDeposits = await Promise.all(bondRequests.deposits);
    const bondAccrueds = await Promise.all(bondRequests.accrueds);
    const bondStartTimes = await Promise.all(bondRequests.startTimes);
    const bondEndTimes = await Promise.all(bondRequests.endTimes);
    const bondStatuses = await Promise.all(bondRequests.statuses);
    const bondTokenUris = await Promise.all(bondRequests.tokenUris);
    const bondClaimedAmounts = await Promise.all(bondRequests.claimedAmounts);

    const bonds = bondIds
      .reduce<Bond[]>((accumulator, _, idx) => {
        const id = numberify(bondIds[idx]).toString();
        const deposit = decimalify(bondDeposits[idx]);
        const accrued = decimalify(bondAccrueds[idx]);
        const startTime = milliseconds(numberify(bondStartTimes[idx]));
        const endTime = milliseconds(numberify(bondEndTimes[idx]));
        const status = BOND_STATUS[bondStatuses[idx]];
        const tokenUri = getTokenUri(bondTokenUris[idx]);
        const bondAgeInDays = getBondAgeInDays(startTime);
        const rebondPeriodInDays = getRebondPeriodInDays(
          alphaAccrualFactor,
          marketPricePremium,
          claimBondFee
        );
        const bondAgeInSeconds = Decimal.from(Date.now() - startTime).div(1000);
        const remainingRebondDays = getRemainingRebondOrBreakEvenDays(
          bondAgeInSeconds,
          controllerTargetAge,
          averageBondAge,
          rebondPeriodInDays
        );

        const breakEvenPeriodInDays = getBreakEvenPeriodInDays(
          alphaAccrualFactor,
          marketPricePremium,
          claimBondFee
        );
        const remainingBreakEvenDays = getRemainingRebondOrBreakEvenDays(
          bondAgeInSeconds,
          controllerTargetAge,
          averageBondAge,
          breakEvenPeriodInDays
        );

        const depositMinusClaimBondFee = Decimal.ONE.sub(claimBondFee).mul(deposit);
        const rebondAccrual =
          rebondPeriodInDays === Decimal.INFINITY
            ? Decimal.INFINITY
            : getFutureBNectAccrualFactor(floorPrice, rebondPeriodInDays, alphaAccrualFactor).mul(
                depositMinusClaimBondFee
              );

        const breakEvenAccrual =
          breakEvenPeriodInDays === Decimal.INFINITY
            ? Decimal.INFINITY
            : getFutureBNectAccrualFactor(floorPrice, breakEvenPeriodInDays, alphaAccrualFactor).mul(
                depositMinusClaimBondFee
              );

        const breakEvenTime =
          breakEvenPeriodInDays === Decimal.INFINITY
            ? UNKNOWN_DATE
            : getRebondOrBreakEvenTimeWithControllerAdjustment(
                bondAgeInSeconds,
                controllerTargetAge,
                averageBondAge,
                breakEvenPeriodInDays
              );

        const rebondTime =
          rebondPeriodInDays === Decimal.INFINITY
            ? UNKNOWN_DATE
            : getRebondOrBreakEvenTimeWithControllerAdjustment(
                bondAgeInSeconds,
                controllerTargetAge,
                averageBondAge,
                rebondPeriodInDays
              );

        const marketValue = decimalify(bondAccrueds[idx]).mul(marketPrice);

        // Accrued bNECT is 0 for cancelled/claimed bonds
        const claimNowReturn = accrued.isZero ? 0 : getReturn(accrued, deposit, marketPrice);
        const rebondReturn = accrued.isZero ? 0 : getReturn(rebondAccrual, deposit, marketPrice);
        const rebondRoi = rebondReturn / toFloat(deposit);
        const rebondApr = rebondRoi * (365 / (bondAgeInDays + remainingRebondDays));
        const claimedAmount = Decimal.from(numberify(bondClaimedAmounts[idx]));

        return [
          ...accumulator,
          {
            id,
            deposit,
            accrued,
            startTime,
            endTime,
            status,
            tokenUri,
            breakEvenAccrual,
            rebondAccrual,
            breakEvenTime,
            rebondTime,
            marketValue,
            rebondReturn,
            claimNowReturn,
            rebondRoi,
            rebondApr,
            claimedAmount,
            bondAgeInDays,
            remainingRebondDays,
            remainingBreakEvenDays
          }
        ];
      }, [])
      .sort((a, b) => (a.startTime > b.startTime ? -1 : a.startTime < b.startTime ? 1 : 0));

    return bonds;
  } catch (error: unknown) {
    console.error(error);
  }
  return [];
};

export const _getProtocolInfo = (
  marketPrice: Decimal,
  floorPrice: Decimal,
  claimBondFee: Decimal,
  alphaAccrualFactor: Decimal
) => {
  const marketPricePremium = marketPrice.div(floorPrice);
  const hasMarketPremium = marketPricePremium.mul(Decimal.ONE.sub(claimBondFee)).gt(Decimal.ONE);

  const breakEvenPeriodInDays = getBreakEvenPeriodInDays(
    alphaAccrualFactor,
    marketPricePremium,
    claimBondFee
  );
  const rebondPeriodInDays = getRebondPeriodInDays(
    alphaAccrualFactor,
    marketPricePremium,
    claimBondFee
  );
  const breakEvenAccrualFactor = getFutureBNectAccrualFactor(
    floorPrice,
    breakEvenPeriodInDays,
    alphaAccrualFactor
  );
  const rebondAccrualFactor = getFutureBNectAccrualFactor(
    floorPrice,
    rebondPeriodInDays,
    alphaAccrualFactor
  );

  return {
    marketPricePremium,
    hasMarketPremium,
    breakEvenAccrualFactor,
    rebondAccrualFactor,
    breakEvenPeriodInDays,
    rebondPeriodInDays
  };
};

const marginalInputAmount = Decimal.ONE.div(1000);

const getBnectAmmPrice = async (bNectAmm: CurveCryptoSwap2ETH): Promise<Decimal> => {
  try {
    const marginalOutputAmount = await getExpectedSwapOutput(
      BNectAmmTokenIndex.BNECT,
      marginalInputAmount,
      bNectAmm
    );

    return marginalOutputAmount.div(marginalInputAmount);
  } catch (error: unknown) {
    console.error("bNECT AMM get_dy() price failed, probably has no liquidity?", error);
  }

  return Decimal.ONE.div(decimalify(await bNectAmm.price_oracle()));
};

const getBnectAmmPriceMainnet = async (bNectAmm: CurveCryptoSwap2ETH): Promise<Decimal> => {
  try {
    const marginalOutputAmount = await getExpectedSwapOutputMainnet(
      BNectAmmTokenIndex.BNECT,
      marginalInputAmount,
      bNectAmm
    );

    return marginalOutputAmount.div(marginalInputAmount);
  } catch (error: unknown) {
    console.error("getExpectedSwapOutputMainnet() failed, probably no liquidity?", error);
  }

  const nect3CrvPool = new Contract(
    NECT_3CRV_POOL_ADDRESS,
    [
      "function calc_withdraw_one_coin(uint256 burn_amount, int128 i) external view returns (uint256)"
    ],
    bNectAmm.provider
  );

  const [oraclePrice, marginalOutputAmount] = await Promise.all([
    bNectAmm.price_oracle().then(decimalify),
    nect3CrvPool.calc_withdraw_one_coin(marginalInputAmount.hex, 0 /* NECT */).then(decimalify)
  ]);

  return marginalOutputAmount.div(marginalInputAmount).div(oraclePrice);
};

const getProtocolInfo = async (
  bNectToken: BNECTToken,
  bNectAmm: CurveCryptoSwap2ETH,
  chickenBondManager: ChickenBondManager,
  isMainnet: boolean
): Promise<ProtocolInfo> => {
  // TS breaks when including this call, or any more than 10 elements, in the Promise.all below.
  const bammNectDebtRequest = chickenBondManager.getBAMMNECTDebt().then(decimalify);

  const [
    bNectSupply,
    marketPrice,
    _treasury,
    protocolOwnedNectInStabilityPool,
    protocolNectInCurve,
    _floorPrice,
    claimBondFee,
    alphaAccrualFactor,
    controllerTargetAge,
    totalWeightedStartTimes
  ] = await Promise.all([
    bNectToken.totalSupply().then(decimalify),
    isMainnet ? getBnectAmmPriceMainnet(bNectAmm) : getBnectAmmPrice(bNectAmm),
    chickenBondManager.getTreasury().then(bucket => bucket.map(decimalify)),
    chickenBondManager.getOwnedNECTInSP().then(decimalify),
    chickenBondManager.getTotalNECTInCurve().then(decimalify),
    chickenBondManager.calcSystemBackingRatio().then(decimalify),
    chickenBondManager.CHICKEN_IN_AMM_FEE().then(decimalify),
    chickenBondManager.calcUpdatedAccrualParameter().then(p => decimalify(p).div(24 * 60 * 60)),
    chickenBondManager.targetAverageAgeSeconds().then(t => Decimal.from(t.toString())),
    chickenBondManager.totalWeightedStartTimes().then(decimalify)
  ]);

  const bammNectDebt = await bammNectDebtRequest;

  const treasury = {
    pending: _treasury[0],
    reserve: _treasury[1],
    permanent: _treasury[2],
    total: _treasury[0].add(_treasury[1]).add(_treasury[2])
  };

  const cachedApysRequests =
    cachedApys.nect3Crv === undefined ||
    cachedApys.stabilityPool === undefined ||
    cachedApys.bNectNect3Crv === undefined
      ? [cacheYearnVaultApys(), cacheCurveLpApy()]
      : null;

  const protocolNectInStabilityPool = treasury.pending.add(protocolOwnedNectInStabilityPool);

  const floorPrice = bNectSupply.isZero ? Decimal.ONE : _floorPrice;

  const floorPriceWithoutPendingHarvests = bNectSupply.isZero
    ? Decimal.ONE
    : getFloorPrice(
        bammNectDebt,
        protocolNectInCurve,
        treasury.pending,
        treasury.permanent,
        bNectSupply
      );

  const averageBondAge = getAverageBondAgeInSeconds(totalWeightedStartTimes, treasury.pending);

  let yieldAmplification: Maybe<Decimal> = undefined;
  let bNectApr: Maybe<Decimal> = undefined;
  const bNectLpApr: Maybe<Decimal> = cachedApys.bNectNect3Crv;

  const fairPrice = {
    lower: treasury.total.sub(treasury.pending).div(bNectSupply),
    upper: treasury.total.div(bNectSupply)
  };

  const {
    marketPricePremium,
    hasMarketPremium,
    breakEvenAccrualFactor,
    rebondAccrualFactor,
    breakEvenPeriodInDays,
    rebondPeriodInDays
  } = _getProtocolInfo(marketPrice, floorPrice, claimBondFee, alphaAccrualFactor);

  const simulatedMarketPrice = marketPrice;

  const windDownPrice = treasury.reserve.add(treasury.permanent).div(bNectSupply);

  // We need to know APYs to calculate the stats below
  if (cachedApysRequests) await Promise.all(cachedApysRequests);

  if (
    cachedApys.nect3Crv !== undefined &&
    cachedApys.stabilityPool !== undefined &&
    treasury.reserve.gt(0)
  ) {
    const protocolStabilityPoolYield = cachedApys.stabilityPool.mul(protocolNectInStabilityPool);
    const protocolCurveYield = cachedApys.nect3Crv.mul(protocolNectInCurve);
    bNectApr = protocolStabilityPoolYield.add(protocolCurveYield).div(treasury.reserve);
    yieldAmplification = bNectApr.div(cachedApys.stabilityPool);

    fairPrice.lower = protocolNectInStabilityPool
      .sub(treasury.pending)
      .add(protocolNectInCurve.mul(cachedApys.nect3Crv.div(cachedApys.stabilityPool)))
      .div(bNectSupply);

    fairPrice.upper = protocolNectInStabilityPool
      .add(protocolNectInCurve.mul(cachedApys.nect3Crv.div(cachedApys.stabilityPool)))
      .div(bNectSupply);
  }

  return {
    bNectSupply,
    marketPrice,
    treasury,
    fairPrice,
    floorPrice,
    claimBondFee,
    alphaAccrualFactor,
    marketPricePremium,
    hasMarketPremium,
    breakEvenAccrualFactor,
    rebondAccrualFactor,
    breakEvenPeriodInDays,
    rebondPeriodInDays,
    simulatedMarketPrice,
    yieldAmplification,
    bNectApr,
    bNectLpApr,
    controllerTargetAge,
    averageBondAge,
    floorPriceWithoutPendingHarvests,
    windDownPrice
  };
};

const getStats = async (chickenBondManager: ChickenBondManager): Promise<Stats> => {
  const [pendingBonds, cancelledBonds, claimedBonds] = await Promise.all([
    chickenBondManager.getOpenBondCount(),
    chickenBondManager.countChickenOut(),
    chickenBondManager.countChickenIn()
  ]);

  const totalBonds = pendingBonds.add(cancelledBonds).add(claimedBonds);

  return {
    pendingBonds: Decimal.from(pendingBonds.toString()),
    cancelledBonds: Decimal.from(cancelledBonds.toString()),
    claimedBonds: Decimal.from(claimedBonds.toString()),
    totalBonds: Decimal.from(totalBonds.toString())
  };
};

// Very minimal type that only contains what we need
export interface ERC20 {
  approve(
    spender: string,
    amount: BigNumber,
    _overrides?: CallOverrides
  ): Promise<ContractTransaction>;
  allowance(account: string, spender: string, _overrides?: CallOverrides): Promise<BigNumber>;
  balanceOf(account: string, _overrides?: CallOverrides): Promise<BigNumber>;
  totalSupply(_overrides?: CallOverrides): Promise<BigNumber>;
}

const erc20From = (tokenAddress: string, signerOrProvider: Signer | providers.Provider) =>
  (new Contract(
    tokenAddress,
    [
      "function approve(address spender, uint256 amount) returns (bool)",
      "function allowance(address owner, address spender) view returns (uint256)",
      "function balanceOf(address) view returns (uint256)",
      "function totalSupply() view returns (uint256)"
    ],
    signerOrProvider
  ) as unknown) as ERC20;

const getLpToken = async (pool: CurveCryptoSwap2ETH) =>
  erc20From(await pool.token(), pool.signer ?? pool.provider);

const getTokenBalance = async (account: string, token: ERC20): Promise<Decimal> => {
  return decimalify(await token.balanceOf(account));
};

const getTokenTotalSupply = async (token: ERC20): Promise<Decimal> => {
  return decimalify(await token.totalSupply());
};

const isInfiniteBondApproved = async (
  account: string,
  nectToken: NECTToken,
  chickenBondManager: ChickenBondManager
): Promise<boolean> => {
  const allowance = await nectToken.allowance(account, chickenBondManager.address);

  // Unlike bNECT, NECT doesn't explicitly handle infinite approvals, therefore the allowance will
  // start to decrease from 2**64.
  // However, it is practically impossible that it would decrease below 2**63.
  return allowance.gt(constants.MaxInt256);
};

const approveInfiniteBond = async (
  nectToken: NECTToken | undefined,
  chickenBondManager: ChickenBondManager | undefined,
  signer: Signer | undefined
): Promise<void> => {
  if (nectToken === undefined || chickenBondManager === undefined || signer === undefined) {
    throw new Error("approveInfiniteBond() failed: a dependency is null");
  }

  console.log("approveInfiniteBond() started");

  try {
    await (
      await ((nectToken as unknown) as Contract)
        .connect(signer)
        .approve(chickenBondManager.address, constants.MaxUint256._hex)
    ).wait();

    console.log("approveInfiniteBond() succceeded");
  } catch (error: unknown) {
    throw new Error(`approveInfiniteBond() failed: ${error}`);
  }
};

const createBond = async (
  nectAmount: Decimal,
  owner: string,
  chickenBondManager: ChickenBondManager | undefined,
  signer: Signer | undefined
): Promise<BondCreatedEventObject> => {
  if (chickenBondManager === undefined || signer === undefined) {
    throw new Error("createBond() failed: a dependency is null");
  }

  const gasEstimate = await chickenBondManager.estimateGas.createBond(nectAmount.hex, {
    from: owner
  });

  const receipt = await (
    await chickenBondManager.connect(signer).createBond(nectAmount.hex, {
      gasLimit: gasEstimate.add(POLLEN_ISSUANCE_GAS_HEADROOM)
    })
  ).wait();

  console.log(
    "CREATE BOND",
    receipt?.events,
    receipt?.events?.map(c => c.event),
    receipt?.events?.find(e => e.event === "BondCreated")
  );

  const createdEvent = receipt?.events?.find(
    e => e.event === "BondCreated"
  ) as Maybe<BondCreatedEvent>;

  if (createdEvent === undefined) {
    throw new Error("createBond() failed: couldn't find BondCreated event");
  }

  console.log("createBond() finished:", createdEvent.args);
  return createdEvent.args;
};

/*
const createBondWithPermit = async (
  nectAmount: Decimal,
  owner: string,
  nectAddress: string,
  nectToken: NECTToken | undefined,
  chickenBondManager: ChickenBondManager | undefined,
  signer: EthersSigner
): Promise<BondCreatedEventObject> => {
  if (chickenBondManager === undefined || nectToken === undefined) {
    throw new Error("createBondWithPermit() failed: a dependency is null");
  }

  const TEN_MINUTES_IN_SECONDS = 60 * 10;
  const spender = chickenBondManager.address;
  const deadline = Math.round(Date.now() / 1000) + TEN_MINUTES_IN_SECONDS;
  const nonce = (await nectToken.nonces(owner)).toNumber();
  const domain = {
    name: await nectToken.name(),
    version: "1",
    chainId: await signer.getChainId(),
    verifyingContract: nectAddress
  };
  const types = {
    Permit: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
      { name: "value", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" }
    ]
  };
  const message = {
    owner,
    spender,
    value: nectAmount.hex,
    nonce,
    deadline
  };

  // @ts-ignore - Ethers private func as API not stable yet
  const signature = await signer._signTypedData(domain, types, message);

  const { v, r, s } = splitSignature(signature);

  const gasEstimate = await chickenBondManager.estimateGas.createBondWithPermit(
    owner,
    nectAmount.hex,
    deadline,
    v,
    r,
    s
  );

  const receipt = await (
    await chickenBondManager.createBondWithPermit(owner, nectAmount.hex, deadline, v, r, s, {
      gasLimit: gasEstimate.add(POLLEN_ISSUANCE_GAS_HEADROOM)
    })
  ).wait();

  console.log(
    "CREATE BOND",
    receipt?.events,
    receipt?.events?.map(c => c.event),
    receipt?.events?.find(e => e.event === "BondCreated")
  );
  const createdEvent = receipt?.events?.find(
    e => e.event === "BondCreated"
  ) as Maybe<BondCreatedEvent>;

  if (createdEvent === undefined) {
    throw new Error("createBond() failed: couldn't find BondCreated event");
  }

  console.log("createBond() finished:", createdEvent.args);
  return createdEvent.args;
};
*/

const cancelBond = async (
  bondId: string,
  minimumNect: Decimal,
  owner: string,
  chickenBondManager: ChickenBondManager | undefined,
  signer: Signer | undefined
): Promise<BondCancelledEventObject> => {
  if (chickenBondManager === undefined || signer === undefined) {
    throw new Error("cancelBond() failed: a dependency is null");
  }

  console.log("cancelBond() started:", bondId, minimumNect.toString());

  const gasEstimate = await chickenBondManager.estimateGas.chickenOut(bondId, minimumNect.hex, {
    from: owner
  });

  const receipt = await (
    await chickenBondManager.connect(signer).chickenOut(bondId, minimumNect.hex, {
      gasLimit: gasEstimate.add(POLLEN_ISSUANCE_GAS_HEADROOM)
    })
  ).wait();

  const cancelledEvent = receipt?.events?.find(
    e => e.event === "BondCancelled"
  ) as Maybe<BondCancelledEvent>;

  if (cancelledEvent === undefined) {
    throw new Error("cancelBond() failed: couldn't find BondCancelled event");
  }

  console.log("cancelBond() finished:", cancelledEvent.args);
  return cancelledEvent.args;
};

const claimBond = async (
  bondId: string,
  owner: string,
  chickenBondManager: ChickenBondManager | undefined,
  signer: Signer | undefined
): Promise<BondClaimedEventObject> => {
  try {
    if (chickenBondManager === undefined || signer === undefined) {
      throw new Error("claimBond() failed: a dependency is null");
    }

    console.log("claimBond() started", bondId);

    const gasEstimate = await chickenBondManager.estimateGas.chickenIn(bondId, { from: owner });

    const receipt = await (
      await chickenBondManager.connect(signer).chickenIn(bondId, {
        gasLimit: gasEstimate.add(POLLEN_ISSUANCE_GAS_HEADROOM)
      })
    ).wait();

    const bondClaimedEvent = receipt.events?.find(
      e => e.event === "BondClaimed"
    ) as Maybe<BondClaimedEvent>;

    if (bondClaimedEvent === undefined) {
      throw new Error("claimBond() failed: couldn't find BondClaimed event");
    }

    console.log("claimBond() finished", bondClaimedEvent.args);
    return bondClaimedEvent.args;
  } catch (error: unknown) {
    console.error("claimBond() failed:", error);
    throw error;
  }
};

const isTokenApprovedWithBNectAmm = async (
  account: string,
  token: NECTToken | BNECTToken,
  bNectAmmAddress: string | null
): Promise<boolean> => {
  if (bNectAmmAddress === null) {
    throw new Error("isTokenApprovedWithBNectAmm() failed: a dependency is null");
  }

  const allowance = await token.allowance(account, bNectAmmAddress);

  // Unlike bNECT, NECT doesn't explicitly handle infinite approvals, therefore the allowance will
  // start to decrease from 2**64.
  // However, it is practically impossible that it would decrease below 2**63.
  return allowance.gt(constants.MaxInt256);
};

const isTokenApprovedWithBNectAmmMainnet = async (
  account: string,
  token: NECTToken | BNECTToken
): Promise<boolean> => {
  const allowance = await token.allowance(account, CURVE_REGISTRY_SWAPS_ADDRESS);

  // Unlike bNECT, NECT doesn't explicitly handle infinite approvals, therefore the allowance will
  // start to decrease from 2**64.
  // However, it is practically impossible that it would decrease below 2**63.
  return allowance.gt(constants.MaxInt256);
};

const isTokenApprovedWithAmmZapper = async (
  account: string,
  token: NECTToken | BNECTToken | ERC20,
  ammZapperAddress: string | null
): Promise<boolean> => {
  if (ammZapperAddress === null) {
    throw new Error("isTokenApprovedWithAmmZapper() failed: a dependency is null");
  }
  const allowance = await token.allowance(account, ammZapperAddress);
  return allowance.gt(constants.MaxInt256);
};

const approveTokenWithBNectAmm = async (
  token: NECTToken | BNECTToken | undefined,
  bNectAmmAddress: string | null,
  signer: Signer | undefined
) => {
  if (token === undefined || bNectAmmAddress === null || signer === undefined) {
    throw new Error("approveTokenWithBNectAmm() failed: a dependency is null");
  }

  await (
    await (token as Contract).connect(signer).approve(bNectAmmAddress, constants.MaxUint256)
  ).wait();
  return;
};

const approveToken = async (
  token: NECTToken | BNECTToken | ERC20 | undefined,
  spenderAddress: string | null,
  signer: Signer | undefined
) => {
  if (token === undefined || spenderAddress === null || signer === undefined) {
    throw new Error("approveToken() failed: a dependency is null");
  }

  await (
    await (token as Contract).connect(signer).approve(spenderAddress, constants.MaxUint256)
  ).wait();
  return;
};

const approveTokenWithBNectAmmMainnet = async (
  token: NECTToken | BNECTToken | undefined,
  signer: Signer | undefined
) => {
  if (token === undefined || signer === undefined) {
    throw new Error("approveTokenWithBNectAmmMainnet() failed: a dependency is null");
  }

  await (
    await (token as Contract)
      .connect(signer)
      .approve(CURVE_REGISTRY_SWAPS_ADDRESS, constants.MaxUint256)
  ).wait();
  return;
};

const getOtherToken = (thisToken: BNectAmmTokenIndex) =>
  thisToken === BNectAmmTokenIndex.BNECT ? BNectAmmTokenIndex.NECT : BNectAmmTokenIndex.BNECT;

const getExpectedSwapOutput = async (
  inputToken: BNectAmmTokenIndex,
  inputAmount: Decimal,
  bNectAmm: CurveCryptoSwap2ETH
): Promise<Decimal> =>
  decimalify(await bNectAmm.get_dy(inputToken, getOtherToken(inputToken), inputAmount.hex));

const getExpectedSwapOutputMainnet = async (
  inputToken: BNectAmmTokenIndex,
  inputAmount: Decimal,
  bNectAmm: CurveCryptoSwap2ETH
): Promise<Decimal> => {
  const bNectAmmBalance = await bNectAmm.balances(0);
  // Initial Curve bNECT price before liquidity = 1.29, reciprocal expected
  const reciprocal = Decimal.from(1).div(1.29);
  if (bNectAmmBalance.eq(0)) return inputAmount.div(reciprocal);

  const swaps = CurveRegistrySwaps__factory.connect(CURVE_REGISTRY_SWAPS_ADDRESS, bNectAmm.provider);

  return decimalify(
    await swaps["get_exchange_multiple_amount(address[9],uint256[3][4],uint256)"](
      ...getRoute(inputToken),
      inputAmount.hex
    )
  );
};

const swapTokens = async (
  inputToken: BNectAmmTokenIndex,
  inputAmount: Decimal,
  minOutputAmount: Decimal,
  bNectAmm: CurveCryptoSwap2ETH | undefined,
  signer: Signer | undefined,
  account: string
): Promise<TokenExchangeEventObject> => {
  if (bNectAmm === undefined || signer === undefined) {
    throw new Error("swapTokens() failed: a dependency is null");
  }

  const gasEstimate = await bNectAmm.estimateGas[
    "exchange(uint256,uint256,uint256,uint256)"
  ](inputToken, getOtherToken(inputToken), inputAmount.hex, minOutputAmount.hex, { from: account });

  const receipt = await (
    await bNectAmm.connect(signer)["exchange(uint256,uint256,uint256,uint256)"](
      inputToken,
      getOtherToken(inputToken),
      inputAmount.hex,
      minOutputAmount.hex,
      { gasLimit: gasEstimate.mul(6).div(5) } // Add 20% overhead (we've seen it fail otherwise)
    )
  ).wait();

  const exchangeEvent = receipt?.events?.find(
    e => e.event === "TokenExchange"
  ) as Maybe<TokenExchangeEvent>;

  if (exchangeEvent === undefined) {
    throw new Error("swapTokens() failed: couldn't find TokenExchange event");
  }

  console.log("swapTokens() finished:", exchangeEvent.args);
  return exchangeEvent.args;
};

const swapTokensMainnet = async (
  inputToken: BNectAmmTokenIndex,
  inputAmount: Decimal,
  minOutputAmount: Decimal,
  bNectAmm: CurveCryptoSwap2ETH | undefined,
  signer: Signer | undefined,
  account: string
): Promise<void> => {
  if (bNectAmm === undefined || signer === undefined) {
    throw new Error("swapTokensMainnet() failed: a dependency is null");
  }

  const swaps = CurveRegistrySwaps__factory.connect(CURVE_REGISTRY_SWAPS_ADDRESS, bNectAmm.provider);
  const route = getRoute(inputToken);

  const gasEstimate = await swaps.estimateGas[
    "exchange_multiple(address[9],uint256[3][4],uint256,uint256)"
  ](...route, inputAmount.hex, minOutputAmount.hex, { from: account });

  const receipt = await (
    await swaps.connect(signer)["exchange_multiple(address[9],uint256[3][4],uint256,uint256)"](
      ...route,
      inputAmount.hex,
      minOutputAmount.hex,
      { gasLimit: gasEstimate.mul(6).div(5) } // Add 20% overhead (we've seen it fail otherwise)
    )
  ).wait();

  if (!receipt.status) {
    throw new Error("swapTokensMainnet() failed");
  }

  console.log("swapTokensMainnet() finished");
};

const getExpectedLpTokensAmountViaZapper = async (
  bNectAmount: Decimal,
  nectAmount: Decimal,
  bNectZapper: BNECTLPZap
): Promise<Decimal> => {
  // allow 0.1% rounding error
  return decimalify(await bNectZapper.getMinLPTokens(bNectAmount.hex, nectAmount.hex)).mul(0.99);
};

const getExpectedLpTokens = async (
  bNectAmount: Decimal,
  nectAmount: Decimal,
  bNectZapper: BNECTLPZap
): Promise<Decimal> => {
  // Curve's calc_token_amount has rounding errors and they enforce a minimum 0.1% slippage
  let expectedLpTokenAmount = Decimal.ZERO;
  try {
    // If the user is depositing bNECT single sided, they won't have approved any.. WONT-FIX
    expectedLpTokenAmount = await getExpectedLpTokensAmountViaZapper(
      bNectAmount,
      nectAmount,
      bNectZapper
    );
  } catch {
    // Curve throws if there's no liquidity
    return expectedLpTokenAmount;
  }
  return expectedLpTokenAmount;
};

const addLiquidity = async (
  bNectAmount: Decimal,
  nectAmount: Decimal,
  minLpTokens: Decimal,
  shouldStakeInGauge: boolean,
  bNectZapper: BNECTLPZap | undefined,
  signer: Signer | undefined,
  account: string
): Promise<void> => {
  if (bNectZapper === undefined || signer === undefined) {
    throw new Error("addLiquidity() failed: a dependency is null");
  }

  const zapperFunction = shouldStakeInGauge ? "addLiquidityAndStake" : "addLiquidity";

  const gasEstimate = await bNectZapper.estimateGas[zapperFunction](
    bNectAmount.hex,
    nectAmount.hex,
    minLpTokens.hex,
    { from: account }
  );

  const receipt = await (
    await bNectZapper.connect(signer)[zapperFunction](
      bNectAmount.hex,
      nectAmount.hex,
      minLpTokens.hex,
      { gasLimit: gasEstimate.mul(6).div(5) } // Add 20% overhead (we've seen it fail otherwise)
    )
  ).wait();

  if (!receipt.status) {
    throw new Error("addLiquidity() failed");
  }

  console.log("addLiquidity() finished");
};

const getCoinBalances = (pool: CurveCryptoSwap2ETH) =>
  Promise.all([pool.balances(0).then(decimalify), pool.balances(1).then(decimalify)]);

const getExpectedWithdrawal = async (
  burnLp: Decimal,
  output: BNectAmmTokenIndex | "both",
  bNectZapper: BNECTLPZap,
  bNectAmm: CurveCryptoSwap2ETH
): Promise<Map<BNectAmmTokenIndex, Decimal>> => {
  if (output === "both") {
    const [bNectAmount, nectAmount] = await bNectZapper.getMinWithdrawBalanced(burnLp.hex);

    return new Map([
      [BNectAmmTokenIndex.BNECT, decimalify(bNectAmount)],
      [BNectAmmTokenIndex.NECT, decimalify(nectAmount)]
    ]);
  } else {
    const withdrawEstimatorFunction =
      output === BNectAmmTokenIndex.NECT
        ? () => bNectZapper.getMinWithdrawNECT(burnLp.hex)
        : () => bNectAmm.calc_withdraw_one_coin(burnLp.hex, 0);
    return new Map([[output, await withdrawEstimatorFunction().then(decimalify)]]);
  }
};

const removeLiquidity = async (
  burnLpTokens: Decimal,
  minBNectAmount: Decimal,
  minNectAmount: Decimal,
  bNectZapper: BNECTLPZap | undefined,
  signer: Signer | undefined
): Promise<void> => {
  if (bNectZapper === undefined || signer === undefined) {
    throw new Error("removeLiquidity() failed: a dependency is null");
  }

  const receipt = await (
    await bNectZapper
      .connect(signer)
      .removeLiquidityBalanced(burnLpTokens.hex, minBNectAmount.hex, minNectAmount.hex)
  ).wait();

  if (!receipt.status) {
    throw new Error("removeLiquidity() failed");
  }

  console.log("removeLiquidity() finished");
};

const removeLiquidityNECT = async (
  burnLpTokens: Decimal,
  minAmount: Decimal,
  bNectZapper: BNECTLPZap | undefined,
  signer: Signer | undefined,
  account: string
): Promise<void> => {
  if (bNectZapper === undefined || signer === undefined) {
    throw new Error("removeLiquidityNECT() failed: a dependency is null");
  }

  const removeLiquidityFunction = "removeLiquidityNECT";

  const gasEstimate = await bNectZapper.estimateGas[removeLiquidityFunction](
    burnLpTokens.hex,
    minAmount.hex,
    { from: account }
  );

  const receipt = await (
    await bNectZapper.connect(signer)[removeLiquidityFunction](
      burnLpTokens.hex,
      minAmount.hex,
      { gasLimit: gasEstimate.mul(6).div(5) } // Add 20% overhead (we've seen it fail otherwise)
    )
  ).wait();

  if (!receipt.status) {
    throw new Error("removeLiquidityNECT() failed");
  }

  console.log("removeLiquidityNECT() finished");
};

const removeLiquidityBNECT = async (
  burnLpTokens: Decimal,
  minAmount: Decimal,
  bNectAmm: CurveCryptoSwap2ETH | undefined,
  signer: Signer | undefined,
  account: string
): Promise<void> => {
  if (bNectAmm === undefined || signer === undefined) {
    throw new Error("removeLiquidityBNECT() failed: a dependency is null");
  }

  const removeLiquidityFunction = "remove_liquidity_one_coin(uint256,uint256,uint256,bool)";

  const gasEstimate = await bNectAmm.estimateGas[removeLiquidityFunction](
    burnLpTokens.hex,
    0,
    minAmount.hex,
    false,
    { from: account }
  );

  const receipt = await (
    await bNectAmm.connect(signer)[removeLiquidityFunction](
      burnLpTokens.hex,
      0,
      minAmount.hex,
      false,
      { gasLimit: gasEstimate.mul(6).div(5) } // Add 20% overhead (we've seen it fail otherwise)
    )
  ).wait();

  if (!receipt.status) {
    throw new Error("removeLiquidityBNECT() failed");
  }

  console.log("removeLiquidityBNECT() finished");
};

const removeLiquidityOneCoin = async (
  burnLpTokens: Decimal,
  output: BNectAmmTokenIndex,
  minAmount: Decimal,
  bNectZapper: BNECTLPZap | undefined,
  bNectAmm: CurveCryptoSwap2ETH | undefined,
  signer: Signer | undefined,
  account: string
): Promise<void> => {
  if (output === BNectAmmTokenIndex.NECT) {
    return removeLiquidityNECT(burnLpTokens, minAmount, bNectZapper, signer, account);
  } else {
    return removeLiquidityBNECT(burnLpTokens, minAmount, bNectAmm, signer, account);
  }
};

const stakeLiquidity = async (
  stakeAmount: Decimal,
  bNectGauge: CurveLiquidityGaugeV5 | undefined,
  signer: Signer | undefined
): Promise<DepositEventObject> => {
  if (bNectGauge === undefined || signer === undefined) {
    throw new Error("stakeLiquidity() failed: a dependency is null");
  }

  const receipt = await (
    await bNectGauge.connect(signer)["deposit(uint256)"](stakeAmount.hex)
  ).wait();

  const depositEvent = receipt?.events?.find(e => e?.event === "Deposit") as Maybe<DepositEvent>;

  if (depositEvent === undefined) {
    throw new Error("stakeLiquidity() failed: couldn't find Withdraw event");
  }

  console.log("stakeLiquidity() finished:", depositEvent.args);
  return depositEvent.args;
};

const unstakeLiquidity = async (
  unstakeAmount: Decimal,
  bNectGauge: CurveLiquidityGaugeV5 | undefined,
  signer: Signer | undefined
): Promise<WithdrawEventObject> => {
  if (bNectGauge === undefined || signer === undefined) {
    throw new Error("unstakeLiquidity() failed: a dependency is null");
  }

  const receipt = await (
    await bNectGauge.connect(signer)["withdraw(uint256,bool)"](unstakeAmount.hex, true)
  ).wait();

  const withdrawEvent = receipt?.events?.find(e => e?.event === "Withdraw") as Maybe<WithdrawEvent>;

  if (withdrawEvent === undefined) {
    throw new Error("unstakeLiquidity() failed: couldn't find Withdraw event");
  }

  console.log("unstakeLiquidity() finished:", withdrawEvent.args);
  return withdrawEvent.args;
};

const claimLpRewards = async (
  bNectGauge: CurveLiquidityGaugeV5 | undefined,
  signer: Signer | undefined
): Promise<void> => {
  if (bNectGauge === undefined || signer === undefined) {
    throw new Error("claimLpRewards() failed: a dependency is null");
  }

  const receipt = await (await bNectGauge.connect(signer)["claim_rewards()"]()).wait();

  if (!receipt.status) {
    throw new Error("claimLpRewards() failed: no transaction receipt status received.");
  }
};

const getLpRewards = async (
  account: string,
  bNectGauge: CurveLiquidityGaugeV5
): Promise<BNectLpRewards> => {
  const rewards: BNectLpRewards = [];

  const totalRewardTokens = (await bNectGauge.reward_count()).toNumber();

  for (let tokenIndex = 0; tokenIndex < totalRewardTokens; tokenIndex++) {
    const tokenAddress = await bNectGauge.reward_tokens(tokenIndex);
    const tokenRewards = decimalify(await bNectGauge.claimable_reward(account, tokenAddress));
    const tokenName =
      TOKEN_ADDRESS_NAME_MAP[tokenAddress] ||
      `${tokenAddress.slice(0, 5)}..${tokenAddress.slice(tokenAddress.length - 3)}`;

    rewards.push({ name: tokenName, address: tokenAddress, amount: tokenRewards });
  }
  return rewards;
};

export const api = {
  getAccountBonds,
  getStats,
  erc20From,
  getLpToken,
  getTokenBalance,
  getTokenTotalSupply,
  getProtocolInfo,
  approveInfiniteBond,
  isInfiniteBondApproved,
  createBond,
  cancelBond,
  claimBond,
  isTokenApprovedWithBNectAmm,
  isTokenApprovedWithBNectAmmMainnet,
  approveTokenWithBNectAmm,
  approveTokenWithBNectAmmMainnet,
  isTokenApprovedWithAmmZapper,
  approveToken,
  getExpectedSwapOutput,
  getExpectedSwapOutputMainnet,
  swapTokens,
  swapTokensMainnet,
  getCoinBalances,
  getExpectedLpTokens,
  addLiquidity,
  getExpectedWithdrawal,
  removeLiquidity,
  removeLiquidityOneCoin,
  stakeLiquidity,
  unstakeLiquidity,
  getLpRewards,
  claimLpRewards
};

export type BondsApi = typeof api;
