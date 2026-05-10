import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type { CarConfig, EnvironmentId, StickerId } from '@/types';
import { DEFAULT_CONFIG } from '@/services/buildService';

/**
 * Configurator state — the entire 3D car is a function of this CarConfig.
 * The reducer is the only legal way to mutate it; the 3D scene reads it.
 */

type Action =
  | { type: 'set-paint'; id: string }
  | { type: 'set-wheels'; id: string }
  | { type: 'set-exhaust'; id: string }
  | { type: 'set-sticker'; id: StickerId }
  | { type: 'set-ride-height'; value: number }
  | { type: 'set-environment'; id: EnvironmentId }
  | { type: 'load'; config: CarConfig }
  | { type: 'reset' };

function reducer(state: CarConfig, action: Action): CarConfig {
  switch (action.type) {
    case 'set-paint':
      return { ...state, paintId: action.id };
    case 'set-wheels':
      return { ...state, wheelId: action.id };
    case 'set-exhaust':
      return { ...state, exhaustId: action.id };
    case 'set-sticker':
      return { ...state, stickerId: action.id };
    case 'set-ride-height':
      return { ...state, rideHeight: action.value };
    case 'set-environment':
      return { ...state, environmentId: action.id };
    case 'load':
      return { ...action.config };
    case 'reset':
      return { ...DEFAULT_CONFIG };
    default:
      return state;
  }
}

interface ConfiguratorContextValue {
  config: CarConfig;
  setPaint: (id: string) => void;
  setWheels: (id: string) => void;
  setExhaust: (id: string) => void;
  setSticker: (id: StickerId) => void;
  setRideHeight: (value: number) => void;
  setEnvironment: (id: EnvironmentId) => void;
  loadConfig: (config: CarConfig) => void;
  reset: () => void;
}

const ConfiguratorContext = createContext<ConfiguratorContextValue | undefined>(
  undefined,
);

export function ConfiguratorProvider({ children }: { children: ReactNode }) {
  const [config, dispatch] = useReducer(reducer, DEFAULT_CONFIG);

  const setPaint = useCallback((id: string) => dispatch({ type: 'set-paint', id }), []);
  const setWheels = useCallback((id: string) => dispatch({ type: 'set-wheels', id }), []);
  const setExhaust = useCallback(
    (id: string) => dispatch({ type: 'set-exhaust', id }),
    [],
  );
  const setSticker = useCallback(
    (id: StickerId) => dispatch({ type: 'set-sticker', id }),
    [],
  );
  const setRideHeight = useCallback(
    (value: number) => dispatch({ type: 'set-ride-height', value }),
    [],
  );
  const setEnvironment = useCallback(
    (id: EnvironmentId) => dispatch({ type: 'set-environment', id }),
    [],
  );
  const loadConfig = useCallback(
    (next: CarConfig) =>
      // Fill in defaults for any field a partial config may be missing
      // (older share links / gallery builds may predate newer fields).
      dispatch({
        type: 'load',
        config: { ...DEFAULT_CONFIG, ...next },
      }),
    [],
  );
  const reset = useCallback(() => dispatch({ type: 'reset' }), []);

  const value = useMemo<ConfiguratorContextValue>(
    () => ({
      config,
      setPaint,
      setWheels,
      setExhaust,
      setSticker,
      setRideHeight,
      setEnvironment,
      loadConfig,
      reset,
    }),
    [
      config,
      setPaint,
      setWheels,
      setExhaust,
      setSticker,
      setRideHeight,
      setEnvironment,
      loadConfig,
      reset,
    ],
  );

  return (
    <ConfiguratorContext.Provider value={value}>{children}</ConfiguratorContext.Provider>
  );
}

export function useConfigurator() {
  const ctx = useContext(ConfiguratorContext);
  if (!ctx) {
    throw new Error('useConfigurator must be used inside <ConfiguratorProvider>');
  }
  return ctx;
}
