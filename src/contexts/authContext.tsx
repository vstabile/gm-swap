import { createContext, useContext, JSX, Accessor } from "solid-js";
import { NostrConnectSigner } from "applesauce-signers";
import { AuthMethod } from "~/lib/signIn";
import { NIP46_RELAY } from "~/lib/nostr";

export type AuthState = {
  method: AuthMethod | null;
  pubkey: string | null;
  nsec: string | null;
  remoteRelay: string | null;
  isLoading: boolean;
};

export const defaultState: AuthState = {
  method: null,
  pubkey: null,
  nsec: null,
  remoteRelay: null,
  isLoading: true,
};

// Context containing auth state and methods
export type AuthContextValue = {
  state: AuthState;
  signIn: (
    method: AuthMethod,
    nsec?: string,
    pubkey?: string,
    remoteRelay?: string
  ) => Promise<void>;
  signOut: () => void;
  isAuthenticated: Accessor<boolean>;
  nostrConnectUri: Accessor<string | undefined>;
  setNostrConnectUri: (uri: string | undefined) => void;
  connectWithBunker: (bunkerUri: string) => Promise<void>;
  remoteSignerRelay: Accessor<string>;
  setRemoteSignerRelay: (relay: string) => void;
  nip46Signer: Accessor<NostrConnectSigner | undefined>;
  closeNip46Signer: () => void;
  setOnSignInSuccess: (callback: () => void) => void;
};

export const AuthContext = createContext<AuthContextValue>({
  state: defaultState,
  signIn: async () => {},
  signOut: () => {},
  isAuthenticated: () => false,
  nostrConnectUri: () => undefined,
  setNostrConnectUri: () => {},
  connectWithBunker: async () => {},
  remoteSignerRelay: () => NIP46_RELAY,
  setRemoteSignerRelay: () => {},
  nip46Signer: () => undefined,
  closeNip46Signer: () => {},
  setOnSignInSuccess: () => {},
});

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
