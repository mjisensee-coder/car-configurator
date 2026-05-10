import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react';
import type { CarConfig, StickerId } from '@/types';
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
  const loadConfig = useCallback(
    (next: CarConfig) => dispatch({ type: 'load', config: next }),
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
      loadConfig,
      reset,
    }),
    [config, setPaint, setWheels, setExhaust, setSticker, setRideHeight, loadConfig, reset],
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
