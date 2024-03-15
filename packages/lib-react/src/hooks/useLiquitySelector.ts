import { useEffect, useReducer } from "react";

import { BeraBorrowStoreState } from "@beraborrow/lib-base";

import { equals } from "../utils/equals";
import { useLiquityStore } from "./useLiquityStore";

export const useLiquitySelector = <S, T>(select: (state: BeraBorrowStoreState<T>) => S): S => {
  const store = useLiquityStore<T>();
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
