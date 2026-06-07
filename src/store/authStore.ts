import { create } from "zustand";

interface UserData {
  uid: string;
  name: string;
  email: string;
  partnerId: string;
  birthday: Date | null;
  weddingDate: Date | null;
}

interface AuthStore {
  user: UserData | null;
  setUser: (user: UserData | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));