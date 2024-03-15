import { BeraBorrowStore } from "@beraborrow/lib-base";
import React, { createContext, useEffect, useState } from "react";

export const LiquityStoreContext = createContext<BeraBorrowStore | undefined>(undefined);

type LiquityStoreProviderProps = {
  store: BeraBorrowStore;
  loader?: React.ReactNode;
};

export const LiquityStoreProvider: React.FC<LiquityStoreProviderProps> = ({
  store,
  loader,
  children
}) => {
  const [loadedStore, setLoadedStore] = useState<BeraBorrowStore>();

  useEffect(() => {
    store.onLoaded = () => setLoadedStore(store);
    const stop = store.start();

    return () => {
      store.onLoaded = undefined;
      setLoadedStore(undefined);
      stop();
    };
  }, [store]);

  if (!loadedStore) {
    return <>{loader}</>;
  }

  return <LiquityStoreContext.Provider value={loadedStore}>{children}</LiquityStoreContext.Provider>;
};
