"use client";

import React, { createContext, useContext, useReducer } from 'react';

export type BuilderAction =
  | { type: 'CREATE_ESTIMATE'; payload: any }
  | { type: 'CREATE_PAGE'; payload: any }
  | { type: 'CREATE_AUTOMATION'; payload: any }
  | { type: 'CLEAR' };

type BuilderState = {
  lastAction: BuilderAction | null;
};

const initialState: BuilderState = { lastAction: null };

function reducer(state: BuilderState, action: BuilderAction): BuilderState {
  switch (action.type) {
    case 'CREATE_ESTIMATE':
    case 'CREATE_PAGE':
    case 'CREATE_AUTOMATION':
      return { ...state, lastAction: action };
    case 'CLEAR':
      return { ...state, lastAction: null };
    default:
      return state;
  }
}

const BuilderStateContext = createContext<{
  state: BuilderState;
  dispatch: React.Dispatch<BuilderAction>;
}>({ state: initialState, dispatch: () => {} });

export function BuilderStateProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  return <BuilderStateContext.Provider value={{ state, dispatch }}>{children}</BuilderStateContext.Provider>;
}

export function useBuilderState() {
  return useContext(BuilderStateContext).state;
}

export function useBuilderDispatch() {
  return useContext(BuilderStateContext).dispatch;
}
