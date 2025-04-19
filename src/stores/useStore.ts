import { create } from "zustand";

interface StoreState {
  versionList: any[];
  setVersionList: (newVersionList: any[]) => void;
}

export const useStore = create<StoreState>((set) => ({
  versionList: [],
  setVersionList: (newVersionList: string[]) =>
    set({ versionList: newVersionList }),
}));
