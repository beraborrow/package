import { useContext } from "react";

import { BeraBorrowStore } from "@beraborrow/lib-base";

import { BeraBorrowStoreContext } from "../components/BeraBorrowStoreProvider";

export const useBeraBorrowStore = <T>(): BeraBorrowStore<T> => {
  const store = useContext(BeraBorrowStoreContext);

  if (!store) {
    throw new Error("You must provide a BeraBorrowStore via BeraBorrowStoreProvider");
  }

  return store as BeraBorrowStore<T>;
};
