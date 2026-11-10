import { createJSONStorage, type StateStorage } from 'zustand/middleware';

const ephemeralValues = new Map<string, string>();
const nonBrowserStorage: StateStorage = {
  getItem: (name) => ephemeralValues.get(name) ?? null,
  setItem: (name, value) => {
    ephemeralValues.set(name, value);
  },
  removeItem: (name) => {
    ephemeralValues.delete(name);
  },
};

export const demoStorage = createJSONStorage(() =>
  typeof window === 'undefined' ? nonBrowserStorage : window.localStorage,
);
