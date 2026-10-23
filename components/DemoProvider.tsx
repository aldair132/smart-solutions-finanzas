"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { loadDemo, saveMovement, saveSpace, saveUser } from "@/lib/demoService";
import type { DemoState, Movement } from "@/lib/types";

type DemoContextValue = DemoState & {
  updateSpace: (name: string, id?: string) => string;
  updateMovement: (movement: Omit<Movement, "id"> & { id?: string }) => void;
  updateUser: (name: string) => void;
  reset: () => void;
};
const DemoContext = createContext<DemoContextValue | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(loadDemo);
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
  function updateMovement(input: Omit<Movement, "id"> & { id?: string }) {
    const movement = saveMovement(input);
    setState((current) => ({
      ...current,
      movements: [
        ...current.movements.filter((item) => item.id !== movement.id),
        movement,
      ],
    }));
  }
  function updateUser(name: string) {
    const user = saveUser(state.user, name);
    setState((current) => ({ ...current, user }));
  }
  return (
    <DemoContext.Provider
      value={{
        ...state,
        updateSpace,
        updateMovement,
        updateUser,
        reset: () => setState(loadDemo()),
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
