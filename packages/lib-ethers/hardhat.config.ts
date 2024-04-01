import assert from "assert";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import "colors";

import { JsonFragment } from "@ethersproject/abi";
import { Wallet } from "@ethersproject/wallet";
import { Signer } from "@ethersproject/abstract-signer";
import { ContractFactory, Overrides } from "@ethersproject/contracts";

import { task, HardhatUserConfig, types, extendEnvironment } from "hardhat/config";
import { HardhatRuntimeEnvironment, NetworkUserConfig } from "hardhat/types";
import "@nomiclabs/hardhat-ethers";

import { Decimal } from "@beraborrow/lib-base";

import { deployAndSetupContracts, deployTellorCaller, setSilent } from "./utils/deploy";
import { _connectToContracts, _BeraBorrowDeploymentJSON, _priceFeedIsTestnet } from "./src/contracts";

import accounts from "./accounts.json";

dotenv.config();

const numAccounts = 100;

const useLiveVersionEnv = (process.env.USE_LIVE_VERSION ?? "false").toLowerCase();
const useLiveVersion = !["false", "no", "0"].includes(useLiveVersionEnv);

const contractsDir = path.join("..", "contracts");
const artifacts = path.join(contractsDir, "artifacts");
const cache = path.join(contractsDir, "cache");

const contractsVersion = fs
  .readFileSync(path.join(useLiveVersion ? "live" : artifacts, "version"))
  .toString()
  .trim();

if (useLiveVersion) {
  console.log(`Using live version of contracts (${contractsVersion}).`.cyan);
}

const generateRandomAccounts = (numberOfAccounts: number) => {
  const accounts = new Array<string>(numberOfAccounts);

  for (let i = 0; i < numberOfAccounts; ++i) {
    accounts[i] = Wallet.createRandom().privateKey;
  }

  return accounts;
};

const deployerAccount = process.env.DEPLOYER_PRIVATE_KEY || Wallet.createRandom().privateKey;
const devChainRichAccount = "0x4d5db4107d237df6a3d58ee5f70ae63d73d7658d4026f2eefd2f204c81682cb7";

const infuraApiKey = "ad9cef41c9c844a7b54d10be24d416e5";

const infuraNetwork = (name: string): { [name: string]: NetworkUserConfig } => ({
  [name]: {
    url: `https://${name}.infura.io/v3/${infuraApiKey}`,
    accounts: [deployerAccount]
  }
});

// https://docs.chain.link/docs/ethereum-addresses
// https://docs.tellor.io/tellor/integration/reference-page

const oracleAddresses = {
  berachain: {
    chainlink: "0x8b327b4B93B7aAA184aA2F90Fba34185F80C3429",
    tellor: "0x93225f2574789EcE78a9fEE68D64F394aDccE3E5"
  }
};

const hasOracles = (network: string): network is keyof typeof oracleAddresses =>
  network in oracleAddresses;

const ibgtAddresses = {
  berachain: "0x61ac8568e1309342F4614b1D664E341A4E10C5b8"
};

const hasiBGT = (network: string): network is keyof typeof ibgtAddresses => network in ibgtAddresses;

const config: HardhatUserConfig = {
  networks: {
    hardhat: {
      accounts: accounts.slice(0, numAccounts),

      gas: 12e6, // tx gas limit
      blockGasLimit: 12e6,

      // Let Ethers throw instead of Buidler EVM
      // This is closer to what will happen in production
      throwOnCallFailures: false,
      throwOnTransactionFailures: false
    },

    dev: {
      url: "http://localhost:8545",
      accounts: [deployerAccount, devChainRichAccount, ...generateRandomAccounts(numAccounts - 2)]
    },

    berachain: {
      url: "https://artio.rpc.berachain.com/",
      accounts: [deployerAccount]
    },

    forkedMainnet: {
      url: "http://localhost:8545"
    }
  },

  paths: {
    artifacts,
    cache
  }
};

declare module "hardhat/types/runtime" {
  interface HardhatRuntimeEnvironment {
    deployBeraBorrow: (
      deployer: Signer,
      useRealPriceFeed?: boolean,
      ibgtAddress?: string,
      overrides?: Overrides
    ) => Promise<_BeraBorrowDeploymentJSON>;
  }
}

const getLiveArtifact = (name: string): { abi: JsonFragment[]; bytecode: string } =>
  require(`./live/${name}.json`);

const getContractFactory: (
  env: HardhatRuntimeEnvironment
) => (name: string, signer: Signer) => Promise<ContractFactory> = useLiveVersion
  ? env => (name, signer) => {
      const { abi, bytecode } = getLiveArtifact(name);
      return env.ethers.getContractFactory(abi, bytecode, signer);
    }
  : env => env.ethers.getContractFactory;

extendEnvironment(env => {
  env.deployBeraBorrow = async (
    deployer,
    useRealPriceFeed = false,
    ibgtAddress = undefined,
    overrides?: Overrides
  ) => {
    const deployment = await deployAndSetupContracts(
      deployer,
      getContractFactory(env),
      !useRealPriceFeed,
      env.network.name === "dev",
      ibgtAddress,
      overrides
    );

    return { ...deployment, version: contractsVersion };
  };
});

type DeployParams = {
  channel: string;
  gasPrice?: number;
  useRealPriceFeed?: boolean;
  createUniswapPair?: boolean;
};

const defaultChannel = process.env.CHANNEL || "default";

task("deploy", "Deploys the contracts to the network")
  .addOptionalParam("channel", "Deployment channel to deploy into", defaultChannel, types.string)
  .addOptionalParam("gasPrice", "Price to pay for 1 gas [Gwei]", undefined, types.float)
  .addOptionalParam(
    "useRealPriceFeed",
    "Deploy the production version of PriceFeed and connect it to Chainlink",
    undefined,
    types.boolean
  )
  .addOptionalParam(
    "createUniswapPair",
    "Create a real Uniswap v2 iBGT-NECT pair instead of a mock ERC20 token",
    undefined,
    types.boolean
  )
  .setAction(
    async ({ channel, gasPrice, useRealPriceFeed, createUniswapPair }: DeployParams, env) => {
      const overrides = { gasPrice: gasPrice && Decimal.from(gasPrice).div(1000000000).hex };
      const [deployer] = await env.ethers.getSigners();

      useRealPriceFeed ??= env.network.name === "mainnet";

      if (useRealPriceFeed && !hasOracles(env.network.name)) {
        throw new Error(`PriceFeed not supported on ${env.network.name}`);
      }

      let ibgtAddress: string | undefined = undefined;
      if (createUniswapPair) {
        if (!hasiBGT(env.network.name)) {
          throw new Error(`iBGT not deployed on ${env.network.name}`);
        }
        ibgtAddress = ibgtAddresses[env.network.name];
      }

      setSilent(false);

      const deployment = await env.deployBeraBorrow(deployer, useRealPriceFeed, ibgtAddress, overrides);

      if (useRealPriceFeed) {
        const contracts = _connectToContracts(deployer, deployment);

        assert(!_priceFeedIsTestnet(contracts.priceFeed));

        if (hasOracles(env.network.name)) {
          const tellorCallerAddress = await deployTellorCaller(
            deployer,
            getContractFactory(env),
            oracleAddresses[env.network.name].tellor,
            overrides
          );

          console.log(`Hooking up PriceFeed with oracles ...`);

          const tx = await contracts.priceFeed.setAddresses(
            oracleAddresses[env.network.name].chainlink,
            tellorCallerAddress,
            overrides
          );

          await tx.wait();
        }
      }

      fs.mkdirSync(path.join("deployments", channel), { recursive: true });

      fs.writeFileSync(
        path.join("deployments", channel, `${env.network.name}.json`),
        JSON.stringify(deployment, undefined, 2)
      );

      console.log();
      console.log(deployment);
      console.log();
    }
  );

type StorageSlotParams = {
  contractAddress: string;
  walletAddress: string;
  slotIndex: number;
  value: string;
};

task("setStorageSlotIndex", "Returns the index of the balanceOf storage slot in an ERC20")
  .addParam("contractAddress", "Address of the contract")
  .addParam("walletAddress", "Address of the wallet balance to set")
  .addOptionalParam("slotIndex", "Index of slot to set")
  .addOptionalParam("value", "Value of slot to set (assumed to be a number)")
  .setAction(
    async (
      {
        contractAddress,
        walletAddress,
        slotIndex = 0,
        value = "1000000000000000000000"
      }: StorageSlotParams,
      hre
    ) => {
      const utils = hre.ethers.utils;
      const erc20 = await hre.ethers.getContractAt("ERC20", contractAddress);
      const balanceBefore = await erc20.balanceOf(walletAddress);
      await hre.ethers.provider.send("hardhat_setStorageAt", [
        contractAddress,
        utils.hexStripZeros(
          utils.keccak256(
            utils.defaultAbiCoder.encode(["address", "uint"], [walletAddress, slotIndex])
          )
        ),
        hre.ethers.utils.hexlify(hre.ethers.utils.zeroPad(hre.ethers.BigNumber.from(value)._hex, 32))
      ]);
      const balanceNow = await erc20.balanceOf(walletAddress);
      console.log({ balanceBefore: balanceBefore.toString(), balanceNow: balanceNow.toString() });
    }
  );

export default config;
