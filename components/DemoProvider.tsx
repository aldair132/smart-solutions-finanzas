"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { getAiStatus } from "@/lib/aiService";
import {
  clearStoredDemo,
  loadDemo,
  loadStoredDemo,
  saveMovement,
  saveReceivable,
  saveSpace,
  saveUser,
  storeDemo,
} from "@/lib/demoService";
import { getReceivableBalance } from "@/lib/receivables";
import type {
  AiMode,
  AiStatus,
  CaptureSource,
  DemoState,
  Movement,
  Receivable,
} from "@/lib/types";

type MovementInput = Omit<Movement, "id"> & { id?: string };
type ReceivableInput = Omit<Receivable, "id" | "paidMinor">;
type CollectionInput = {
  receivableId: string;
  amountMinor: number;
  occurredAt: string;
  source: CaptureSource;
};
type DemoContextValue = DemoState & {
  aiMode: AiMode | null;
  supportsAudio: boolean;
  neuralVoice: boolean;
  updateSpace: (name: string, id?: string) => string;
  updateMovement: (movement: MovementInput) => void;
  addMovements: (movements: MovementInput[]) => void;
  addReceivables: (receivables: ReceivableInput[]) => void;
  collectReceivable: (collection: CollectionInput) => void;
  updateUser: (name: string) => void;
  reset: () => void;
};
const DemoContext = createContext<DemoContextValue | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(loadDemo);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  // Solo se guarda después de restaurar: si no, los datos de ejemplo
  // sobrescribirían lo guardado (React ejecuta los efectos dos veces en desarrollo).
  const [isRestored, setIsRestored] = useState(false);
  useEffect(() => {
    const storedState = loadStoredDemo();
    queueMicrotask(() => {
      if (storedState) setState(storedState);
      setIsRestored(true);
    });
    getAiStatus().then(setAiStatus);
  }, []);
  useEffect(() => {
    if (isRestored) storeDemo(state);
  }, [isRestored, state]);
  function updateSpace(name: string, id?: string) {
    const space = saveSpace(state.spaces, name, id);
    setState((current) => ({
      ...current,
      spaces: id
        ? current.spaces.map((item) => (item.id === id ? space : item))
        : [...current.spaces, space],
    }));
    return space.id;
  }
  function addMovements(inputs: MovementInput[]) {
    const movements = inputs.map(saveMovement);
    const savedIds = new Set(movements.map((movement) => movement.id));
    setState((current) => ({
      ...current,
      movements: [
        ...current.movements.filter((item) => !savedIds.has(item.id)),
        ...movements,
      ],
    }));
  }
  function addReceivables(inputs: ReceivableInput[]) {
    const receivables = inputs.map(saveReceivable);
    setState((current) => ({
      ...current,
      receivables: [...current.receivables, ...receivables],
    }));
  }
  // Un cobro registra el dinero que entra (venta en caja) y reduce el saldo del fiado.
  function collectReceivable(collection: CollectionInput) {
    const receivable = state.receivables.find(
      (item) => item.id === collection.receivableId,
    );
    if (!receivable) throw new Error("No encontramos ese fiado.");
    const amountMinor = Math.min(
      collection.amountMinor,
      getReceivableBalance(receivable),
    );
    const movement = saveMovement({
      spaceId: receivable.spaceId,
      kind: "income",
      amountMinor,
      description: `Cobro de fiado: ${receivable.customer}`,
      category: "Ventas",
      occurredAt: collection.occurredAt,
      source: collection.source,
    });
    // TODO(BACKEND): registrar el cobro (receivableId, amountMinor, occurredAt) y el movimiento en una sola transacción.
    setState((current) => ({
      ...current,
      movements: [...current.movements, movement],
      receivables: current.receivables.map((item) => {
        if (item.id !== receivable.id) return item;
        const paidMinor = item.paidMinor + amountMinor;
        return {
          ...item,
          paidMinor,
          paidAt:
            paidMinor >= item.amountMinor ? collection.occurredAt : item.paidAt,
        };
      }),
    }));
  }
  function updateUser(name: string) {
    const user = saveUser(state.user, name);
    setState((current) => ({ ...current, user }));
  }
  function reset() {
    clearStoredDemo();
    setState(loadDemo());
  }
  return (
    <DemoContext.Provider
      value={{
        ...state,
        aiMode: aiStatus?.mode ?? null,
        supportsAudio: aiStatus?.supportsAudio ?? true,
        neuralVoice: aiStatus?.neuralVoice ?? false,
        updateSpace,
        updateMovement: (movement) => addMovements([movement]),
        addMovements,
        addReceivables,
        collectReceivable,
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
