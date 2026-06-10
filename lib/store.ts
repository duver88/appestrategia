"use client";

import { create } from "zustand";

interface UIState {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  /** Timestamp del último guardado confirmado (indicador "Guardado ✓"). */
  lastSavedAt: number | null;
  markSaved: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  drawerOpen: false,
  setDrawerOpen: (open) => set({ drawerOpen: open }),
  lastSavedAt: null,
  markSaved: () => set({ lastSavedAt: Date.now() }),
}));
