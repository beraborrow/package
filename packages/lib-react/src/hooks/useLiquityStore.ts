import { useContext } from "react";

import { BeraBorrowStore } from "@beraborrow/lib-base";

import { LiquityStoreContext } from "../components/LiquityStoreProvider";

export const useLiquityStore = <T>(): BeraBorrowStore<T> => {
  const store = useContext(LiquityStoreContext);

  if (!store) {
    throw new Error("You must provide a LiquityStore via LiquityStoreProvider");
  }

  return store as BeraBorrowStore<T>;
};
