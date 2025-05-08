import {
  createContext,
  createResource,
  createSignal,
  useContext,
  JSX,
  Accessor,
} from "solid-js";
import { createStore } from "solid-js/store";
import { AuthMethod, signIn, NIP46_PERMISSIONS } from "~/lib/signIn";
import { accounts } from "~/lib/accounts";
import { NostrConnectSigner } from "applesauce-signers";
import { NostrConnectAccount } from "applesauce-accounts/accounts";
import { waitForNip07 } from "~/lib/utils";

type AuthState = {
  method: AuthMethod | null;
  pubkey: string | null;
  nsec: string | null;
  isLoading: boolean;
};

const defaultState: AuthState = {
  method: null,
  pubkey: null,
  nsec: null,
  isLoading: true,
};

// Context containing auth state and methods
type AuthContextValue = {
  state: AuthState;
  signIn: (method: AuthMethod, nsec?: string) => Promise<void>;
  signOut: () => void;
  isAuthenticated: Accessor<boolean>;
  nip46Uri: Accessor<string | undefined>;
  setNip46Uri: (uri: string | undefined) => void;
};

const AuthContext = createContext<AuthContextValue>();

export function AuthProvider(props: { children: JSX.Element }) {
  // Internal auth state
  const [state, setState] = createStore<AuthState>(defaultState);

  // NIP-46 URI state
  const [nip46Uri, setNip46Uri] = createSignal<string | undefined>();

  // Derived state - true if user is authenticated
  const isAuthenticated = () => !!state.pubkey && !state.isLoading;

  const saveSession = (data: Omit<AuthState, "isLoading">) => {
    setState({ ...data, isLoading: false });
    localStorage.setItem(
      "auth",
      JSON.stringify({
        method: data.method,
        pubkey: data.pubkey,
        nsec: data.nsec,
      })
    );
  };

  const clearSession = () => {
    setState(defaultState);
    localStorage.removeItem("auth");
  };

  const handleSignIn = async (method: AuthMethod, nsec?: string) => {
    if (accounts.active) return;

    setState({ isLoading: true });

    try {
      const result = await signIn(method, nsec);

      if (result instanceof NostrConnectSigner) {
        const signer = result;
        const uri = signer.getNostrConnectURI({
          name: "GM Swap",
          permissions: NIP46_PERMISSIONS,
        });

        setNip46Uri(uri);

        // Wait for signer to connect
        signer.waitForSigner().then(async () => {
          setNip46Uri(undefined);

          const pubkey = await signer.getPublicKey();

          const account = new NostrConnectAccount(pubkey, signer);
          accounts.addAccount(account);
          accounts.setActive(account);

          saveSession({
            method,
            pubkey,
            nsec: null,
          });
        });
      } else if (result) {
        saveSession({
          method,
          pubkey: result.pubkey,
          nsec: method === "nsec" ? nsec || null : null,
        });
      } else {
        setState({ isLoading: false });
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setState({ isLoading: false });
    }
  };

  const handleSignOut = () => {
    if (!accounts.active) return;

    const account = accounts.active;
    accounts.removeAccount(account);
    accounts.clearActive();

    clearSession();
  };

  const initializeAuth = async () => {
    setState({ isLoading: true });

    const stored = localStorage.getItem("auth");
    if (!stored) {
      setState({ isLoading: false });
      return;
    }

    const storedData = JSON.parse(stored);
    if (!storedData.method) {
      setState({ isLoading: false });
      return;
    }

    if (storedData.method === "nip07") {
      const nostrAvailable = await waitForNip07();
      if (!nostrAvailable) {
        console.warn("NIP-07 extension not available");
        setState({ isLoading: false });
        return;
      }
    }

    try {
      await handleSignIn(storedData.method, storedData.nsec || undefined);
    } catch (error) {
      console.error("Error restoring auth:", error);
      setState({ isLoading: false });
    }
  };

  createResource(() => initializeAuth());

  const authValue: AuthContextValue = {
    state,
    signIn: handleSignIn,
    signOut: handleSignOut,
    isAuthenticated,
    nip46Uri,
    setNip46Uri,
  };

  return (
    <AuthContext.Provider value={authValue}>
      {props.children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
