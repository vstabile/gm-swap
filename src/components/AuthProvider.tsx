import { createResource, createSignal, JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { AuthMethod, signIn, NIP46_PERMISSIONS } from "~/lib/signIn";
import { accounts } from "~/lib/accounts";
import { NostrConnectSigner } from "applesauce-signers";
import { NostrConnectAccount } from "applesauce-accounts/accounts";
import { waitForNip07 } from "~/lib/utils";
import { NIP46_RELAY, rxNostr } from "~/lib/nostr";
import { createRxForwardReq } from "rx-nostr";
import { map } from "rxjs";
import {
  AuthContext,
  AuthContextValue,
  defaultState,
} from "~/contexts/authContext";

export function AuthProvider(props: { children: JSX.Element }) {
  const [state, setState] = createStore(defaultState);
  const [nostrConnectUri, setNostrConnectUri] = createSignal<
    string | undefined
  >();
  const [remoteSignerRelay, setRemoteSignerRelay] =
    createSignal<string>(NIP46_RELAY);
  const [nip46Signer, setNip46Signer] = createSignal<
    NostrConnectSigner | undefined
  >();
  const [nip46AbortController, setNip46AbortController] =
    createSignal<AbortController>();
  let signInSuccessCallback: (() => void) | undefined;

  // AbortController for cancelling the waitForSigner operation
  setNip46AbortController(new AbortController());

  // Handle dialog close by aborting the signer wait operation
  const handleSetNostrConnectUri = (uri: string | undefined) => {
    if (uri === undefined && state.isLoading && !state.pubkey) {
      // Abort when dialog closes during sign-in
      nip46AbortController().abort();
      // Create a new controller for next time
      setNip46AbortController(new AbortController());
    }
    setNostrConnectUri(uri);
  };

  function closeNip46Signer() {
    if (nip46Signer()) {
      nip46AbortController().abort();
      setNip46AbortController(new AbortController());
      nip46Signer()?.close();
      setState({ isLoading: false });
    }
  }

  // Derived state - true if user is authenticated
  const isAuthenticated = () => !!state.pubkey && !state.isLoading;

  const saveSession = (data: {
    method: AuthMethod;
    pubkey: string;
    nsec: string | null;
  }) => {
    setState({
      method: data.method,
      pubkey: data.pubkey,
      nsec: data.nsec,
      isLoading: false,
    });

    localStorage.setItem("auth", JSON.stringify(data));
  };

  const clearSession = () => {
    setState({
      method: null,
      pubkey: null,
      nsec: null,
      isLoading: false,
    });

    localStorage.removeItem("auth");
  };

  const handleSignIn = async (
    method: AuthMethod,
    nsec?: string,
    relayUrl?: string
  ) => {
    if (accounts.active) return;

    setState({ isLoading: true });

    try {
      // Use the provided relay or the current relay from state
      const relay = relayUrl || remoteSignerRelay();
      const result = await signIn(method, nsec, relay);

      if (result instanceof NostrConnectSigner) {
        const signer = result;
        setNip46Signer(signer);
        const uri = signer.getNostrConnectURI({
          name: "GM Swap",
          permissions: NIP46_PERMISSIONS,
        });

        setNostrConnectUri(uri);

        try {
          // Wait for signer to connect
          await waitForSigner(signer, nip46AbortController().signal);

          const pubkey = await signer.getPublicKey();
          const account = new NostrConnectAccount(pubkey, signer);
          accounts.addAccount(account);
          accounts.setActive(account);

          setState({ isLoading: false });
          signInSuccessCallback?.();
        } catch (error) {
          if (state.isLoading) {
            setState({ isLoading: false });
          }
        }
      } else if (result) {
        saveSession({
          method,
          pubkey: result.pubkey,
          nsec: method === "nsec" ? nsec || null : null,
        });

        signInSuccessCallback?.();
      } else {
        setState({ isLoading: false });
      }
    } catch (error) {
      console.error("Sign in error:", error);
      setState({ isLoading: false });
    }
  };

  function waitForSigner(
    signer: NostrConnectSigner,
    signal: AbortSignal
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const abortHandler = () => {
        closeNip46Signer();
        reject(new Error("Waiting for signer aborted"));
      };

      signal.addEventListener("abort", abortHandler);

      signer
        .waitForSigner()
        .then(() => {
          signal.removeEventListener("abort", abortHandler);
          resolve();
        })
        .catch((err) => {
          signal.removeEventListener("abort", abortHandler);
          reject(err);
        });
    });
  }

  const handleConnectWithBunker = async (bunkerUri: string) => {
    if (accounts.active) return;

    setState({ isLoading: true });

    try {
      const signer = await NostrConnectSigner.fromBunkerURI(bunkerUri, {
        permissions: NIP46_PERMISSIONS,
        subscriptionMethod: (relays, filters) => {
          const rxReq = createRxForwardReq();

          queueMicrotask(() => {
            rxReq.emit(filters);
          });

          return rxNostr
            .use(rxReq, { on: { relays } })
            .pipe(map((packet) => packet.event));
        },
        publishMethod: async (relays, event) => {
          rxNostr.send(event, { on: { relays } });
        },
      });

      if (signer) {
        const pubkey = await signer.getPublicKey();

        const account = new NostrConnectAccount(pubkey, signer);
        accounts.addAccount(account);
        accounts.setActive(account);

        setState({ isLoading: false });
        signInSuccessCallback?.();
      } else {
        setState({ isLoading: false });
      }
    } catch (error) {
      console.error("Bunker connection error:", error);
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
    nostrConnectUri,
    setNostrConnectUri: handleSetNostrConnectUri,
    connectWithBunker: handleConnectWithBunker,
    remoteSignerRelay,
    setRemoteSignerRelay,
    nip46Signer,
    closeNip46Signer,
    setOnSignInSuccess: (callback: () => void) => {
      signInSuccessCallback = callback;
    },
  };

  return (
    <AuthContext.Provider value={authValue}>
      {props.children}
    </AuthContext.Provider>
  );
}
