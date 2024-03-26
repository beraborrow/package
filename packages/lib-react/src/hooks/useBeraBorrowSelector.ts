import { useEffect, useReducer } from "react";

import { BeraBorrowStoreState } from "@beraborrow/lib-base";

import { equals } from "../utils/equals";
import { useBeraBorrowStore } from "./useBeraBorrowStore";

export const useBeraBorrowSelector = <S, T>(select: (state: BeraBorrowStoreState<T>) => S): S => {
  const store = useBeraBorrowStore<T>();
  const [, rerender] = useReducer(() => ({}), {});

  useEffect(
    () =>
      store.subscribe(({ newState, oldState }) => {
        if (!equals(select(newState), select(oldState))) {
          rerender();
        }
      }),
    [store, select]
  );

  return select(store.state);
};
