import { BeraBorrowStore } from "@beraborrow/lib-base";
import React, { createContext, useEffect, useState } from "react";

export const BeraBorrowStoreContext = createContext<BeraBorrowStore | undefined>(undefined);

type BeraBorrowStoreProviderProps = {
  store: BeraBorrowStore;
  loader?: React.ReactNode;
};

export const BeraBorrowStoreProvider: React.FC<BeraBorrowStoreProviderProps> = ({
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

  return <BeraBorrowStoreContext.Provider value={loadedStore}>{children}</BeraBorrowStoreContext.Provider>;
};
