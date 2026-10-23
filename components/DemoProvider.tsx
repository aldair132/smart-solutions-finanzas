"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getAiStatus } from "@/lib/aiService";
import {
  clearStoredDemo,
  loadDemo,
  loadStoredDemo,
  saveMovement,
  saveSpace,
  saveUser,
  storeDemo,
} from "@/lib/demoService";
import type { AiMode, AiStatus, DemoState, Movement } from "@/lib/types";

type MovementInput = Omit<Movement, "id"> & { id?: string };
type DemoContextValue = DemoState & {
  aiMode: AiMode | null;
  supportsAudio: boolean;
  updateSpace: (name: string, id?: string) => string;
  updateMovement: (movement: MovementInput) => void;
  addMovements: (movements: MovementInput[]) => void;
  updateUser: (name: string) => void;
  reset: () => void;
};
const DemoContext = createContext<DemoContextValue | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(loadDemo);
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null);
  const hasRestoredRef = useRef(false);
  useEffect(() => {
    const storedState = loadStoredDemo();
    hasRestoredRef.current = true;
    if (storedState) queueMicrotask(() => setState(storedState));
    getAiStatus().then(setAiStatus);
  }, []);
  useEffect(() => {
    if (hasRestoredRef.current) storeDemo(state);
  }, [state]);
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
        updateSpace,
        updateMovement: (movement) => addMovements([movement]),
        addMovements,
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
