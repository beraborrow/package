import { AddressZero } from "@ethersproject/constants";
import { isAddress, getAddress } from "@ethersproject/address";
import CONFIG from "./config.json"

export type BeraBorrowFrontendConfig = {
  frontendTag: string;
  infuraApiKey?: string;
  alchemyApiKey?: string;
  testnetOnly?: boolean;
  walletConnectProjectId: string;
};

const defaultConfig: BeraBorrowFrontendConfig = {
  frontendTag: AddressZero,
  walletConnectProjectId: "c68378d9d2b9f25c29d30c16bb76f258",
};

function hasKey<K extends string>(o: object, k: K): o is Record<K, unknown> {
  return k in o;
}

const parseConfig = (json: unknown): BeraBorrowFrontendConfig => {
  const config = { ...defaultConfig };

  if (typeof json === "object" && json !== null) {
    if (hasKey(json, "frontendTag") && json.frontendTag !== "") {
      const { frontendTag } = json;

      if (typeof frontendTag === "string" && isAddress(frontendTag)) {
        config.frontendTag = getAddress(frontendTag);
      } else {
        console.error("Malformed frontendTag:");
        console.log(frontendTag);
      }
    }

    if (hasKey(json, "infuraApiKey") && json.infuraApiKey !== "") {
      const { infuraApiKey } = json;

      if (typeof infuraApiKey === "string") {
        config.infuraApiKey = infuraApiKey;
      } else {
        console.error("Malformed infuraApiKey:");
        console.log(infuraApiKey);
      }
    }

    if (hasKey(json, "alchemyApiKey") && json.alchemyApiKey !== "") {
      const { alchemyApiKey } = json;

      if (typeof alchemyApiKey === "string") {
        config.alchemyApiKey = alchemyApiKey;
      } else {
        console.error("Malformed alchemyApiKey:");
        console.log(alchemyApiKey);
      }
    }

    if (hasKey(json, "testnetOnly")) {
      const { testnetOnly } = json;

      if (typeof testnetOnly === "boolean") {
        config.testnetOnly = testnetOnly;
      } else {
        console.error("Malformed testnetOnly:");
        console.log(testnetOnly);
      }
    }
  } else {
    console.error("Malformed config:");
    console.log(json);
  }

  return config;
};

let configPromise: Promise<BeraBorrowFrontendConfig> | undefined = undefined;

const fetchConfig = async () => {
  try {
    // const response = await fetch("config.json");

    // if (!response.ok) {
    //   throw new Error(`Failed to fetch config.json (status ${response.status})`);
    // }

    return parseConfig(CONFIG);
  } catch (err) {
    console.error(err);
    return { ...defaultConfig };
  }
};

export const getConfig = (): Promise<BeraBorrowFrontendConfig> => {
  if (!configPromise) {
    configPromise = fetchConfig();
  }

  return configPromise;
};
