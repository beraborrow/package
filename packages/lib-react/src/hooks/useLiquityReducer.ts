import { useCallback, useEffect, useReducer, useRef } from "react";

import { BeraBorrowStoreState } from "@beraborrow/lib-base";

import { equals } from "../utils/equals";
import { useLiquityStore } from "./useLiquityStore";

export type LiquityStoreUpdate<T = unknown> = {
  type: "updateStore";
  newState: BeraBorrowStoreState<T>;
  oldState: BeraBorrowStoreState<T>;
  stateChange: Partial<BeraBorrowStoreState<T>>;
};

export const useLiquityReducer = <S, A, T>(
  reduce: (state: S, action: A | LiquityStoreUpdate<T>) => S,
  init: (storeState: BeraBorrowStoreState<T>) => S
): [S, (action: A | LiquityStoreUpdate<T>) => void] => {
  const store = useLiquityStore<T>();
  const oldStore = useRef(store);
  const state = useRef(init(store.state));
  const [, rerender] = useReducer(() => ({}), {});

  const dispatch = useCallback(
    (action: A | LiquityStoreUpdate<T>) => {
      const newState = reduce(state.current, action);

      if (!equals(newState, state.current)) {
        state.current = newState;
        rerender();
      }
    },
    [reduce]
  );

  useEffect(() => store.subscribe(params => dispatch({ type: "updateStore", ...params })), [
    store,
    dispatch
  ]);

  if (oldStore.current !== store) {
    state.current = init(store.state);
    oldStore.current = store;
  }

  return [state.current, dispatch];
};
