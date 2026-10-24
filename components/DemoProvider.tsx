"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useCurrentDay } from "@/hooks/useCurrentDay";
import { initialState } from "@/lib/mockData";
import { getAiStatus } from "@/lib/aiService";
import {
  clearStoredDemo,
  deleteSpace,
  loadDemo,
  loadStoredDemo,
  saveMovement,
  saveReceivable,
  saveSpace,
  saveUser,
  storeDemo,
} from "@/lib/demoService";
import {
  collectDemoReceivable,
  isCollectionMovement,
  saveDemoCapture,
  type CaptureInput,
  type CollectionInput,
} from "@/lib/demoTransactions";
import type {
  AiMode,
  AiStatus,
  DemoState,
  Movement,
  Receivable,
} from "@/lib/types";

type MovementInput = Omit<Movement, "id"> & { id?: string };
type ReceivableInput = Omit<Receivable, "id" | "paidMinor">;
type DemoContextValue = DemoState & {
  // false hasta restaurar lo guardado en el dispositivo (evita mostrar datos de ejemplo un instante).
  isReady: boolean;
  today: string | null;
  aiMode: AiMode | null;
  aiStatusFailed: boolean;
  supportsAudio: boolean;
  neuralVoice: boolean;
  updateSpace: (name: string, id?: string) => string;
  removeSpace: (spaceId: string) => void;
  updateMovement: (movement: MovementInput) => void;
  addMovements: (movements: MovementInput[]) => void;
  addReceivables: (receivables: ReceivableInput[]) => void;
  collectReceivable: (collection: CollectionInput) => void;
  saveCapture: (input: CaptureInput) => void;
  updateUser: (name: string) => void;
  reset: () => void;
};
const DemoContext = createContext<DemoContextValue | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(() => structuredClone(initialState));
  const stateRef = useRef(state);
  const today = useCurrentDay();
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  // Solo se guarda después de restaurar: si no, los datos de ejemplo
  // sobrescribirían lo guardado (React ejecuta los efectos dos veces en desarrollo).
  const [isRestored, setIsRestored] = useState(false);
  useEffect(() => {
    const storedState = loadStoredDemo();
    queueMicrotask(() => {
      const restoredState = storedState ?? loadDemo();
      stateRef.current = restoredState;
      setState(restoredState);
      setIsRestored(true);
    });
    getAiStatus().then(setAiStatus);
  }, []);
  useEffect(() => {
    if (isRestored) storeDemo(state);
  }, [isRestored, state]);
  // La referencia se actualiza en cada comando: dos cobros antes del próximo render
  // validan el saldo más reciente. React recibe solo el estado ya validado.
  function commitState(nextState: DemoState) {
    stateRef.current = nextState;
    setState(nextState);
  }
  function updateSpace(name: string, id?: string) {
    const current = stateRef.current;
    const space = saveSpace(current.spaces, name, id);
    commitState({
      ...current,
      spaces: id
        ? current.spaces.map((item) => (item.id === id ? space : item))
        : [...current.spaces, space],
    });
    return space.id;
  }
  function removeSpace(spaceId: string) {
    const current = stateRef.current;
    const removedId = deleteSpace(current.spaces, spaceId);
    commitState({
      ...current,
      spaces: current.spaces.filter((space) => space.id !== removedId),
      movements: current.movements.filter((movement) => movement.spaceId !== removedId),
      receivables: current.receivables.filter((receivable) => receivable.spaceId !== removedId),
    });
  }
  function addMovements(inputs: MovementInput[]) {
    const current = stateRef.current;
    const hasCollection = inputs.some((input) => {
      const existing = current.movements.find((movement) => movement.id === input.id);
      return Boolean(input.receivableId) || (existing && isCollectionMovement(existing));
    });
    if (hasCollection)
      throw new Error("Los cobros vinculados a fiados no se pueden editar desde Movimientos.");
    const movements = inputs.map(saveMovement);
    const savedIds = new Set(movements.map((movement) => movement.id));
    commitState({
      ...current,
      movements: [
        ...current.movements.filter((item) => !savedIds.has(item.id)),
        ...movements,
      ],
    });
  }
  function addReceivables(inputs: ReceivableInput[]) {
    const current = stateRef.current;
    const receivables = inputs.map(saveReceivable);
    commitState({ ...current, receivables: [...current.receivables, ...receivables] });
  }
  function collectReceivable(collection: CollectionInput) {
    const nextState = collectDemoReceivable(stateRef.current, collection);
    commitState(nextState);
  }
  function saveCapture(input: CaptureInput) {
    const nextState = saveDemoCapture(stateRef.current, input);
    commitState(nextState);
  }
  function updateUser(name: string) {
    const current = stateRef.current;
    const user = saveUser(current.user, name);
    commitState({ ...current, user });
  }
  function reset() {
    clearStoredDemo();
    commitState(loadDemo());
  }
  return (
    <DemoContext.Provider
      value={{
        ...state,
        isReady: isRestored && today !== null,
        today,
        aiMode: aiStatus?.mode ?? null,
        aiStatusFailed: aiStatus?.checkFailed ?? false,
        supportsAudio: aiStatus?.supportsAudio ?? true,
        neuralVoice: aiStatus?.neuralVoice ?? false,
        updateSpace,
        removeSpace,
        updateMovement: (movement) => addMovements([movement]),
        addMovements,
        addReceivables,
        collectReceivable,
        saveCapture,
        updateUser,
        reset,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
}
export function useDemo() {
  const context = useContext(DemoContext);
  if (!context) throw new Error("Falta DemoProvider");
  return context;
}
