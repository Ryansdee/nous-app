import { create } from "zustand";

export interface UserData {
  uid: string;
  name: string;
  email: string;
  partnerId: string;
  birthday: Date | null;
  weddingDate: Date | null;
}

/** loading = Firebase n'a pas encore répondu ; authed / anon ensuite. */
export type AuthStatus = "loading" | "authed" | "anon";

interface AuthStore {
  user: UserData | null;
  status: AuthStatus;
  setUser: (user: UserData | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  status: "loading",
  setUser: (user) => set({ user, status: user ? "authed" : "anon" }),
}));
