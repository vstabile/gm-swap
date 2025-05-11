import { createResource, createSignal, JSX } from "solid-js";
import { createStore } from "solid-js/store";
import { AuthMethod, signIn, NIP46_PERMISSIONS } from "~/lib/signIn";
import { accounts } from "~/lib/accounts";
import { NostrConnectSigner, SimpleSigner } from "applesauce-signers";
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
import { generateSecretKey, nip19 } from "nostr-tools";

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
    remoteRelay?: string;
  }) => {
    setState({
      method: data.method,
      pubkey: data.pubkey,
      nsec: data.nsec,
      remoteRelay: data.remoteRelay,
      isLoading: false,
    });

    const remoteRelay = data.remoteRelay || remoteSignerRelay();

    localStorage.setItem("auth", JSON.stringify({ ...data, remoteRelay }));
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
    pubkey?: string,
    remoteRelay?: string
  ) => {
    if (accounts.active) return;

    setState({ isLoading: true });

    try {
      // Use the provided relay or the current relay from state
      const relay = remoteRelay || remoteSignerRelay();
      const result = await signIn(method, nsec, pubkey, relay);

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
          signer.connect();

          const pubkey = await signer.getPublicKey();
          const account = new NostrConnectAccount(pubkey, signer);
          accounts.addAccount(account);
          accounts.setActive(account);

          saveSession({
            method,
            pubkey,
            nsec,
          });

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

    const key = generateSecretKey();
    const nsec = nip19.nsecEncode(key);
    const simpleSigner = new SimpleSigner(key);
    const { relays } = NostrConnectSigner.parseBunkerURI(bunkerUri);

    try {
      const signer = await NostrConnectSigner.fromBunkerURI(bunkerUri, {
        permissions: NIP46_PERMISSIONS,
        signer: simpleSigner,
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

        saveSession({
          method: "nip46",
          pubkey,
          nsec,
          remoteRelay: relays[0],
        });
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

    // Abort restoring NIP-46 session if it takes too long
    if (storedData.method === "nip46") {
      setTimeout(() => {
        if (state.isLoading) {
          nip46AbortController().abort();
          setNip46AbortController(new AbortController());
          clearSession();
        }
      }, 5000);
    }

    try {
      await handleSignIn(
        storedData.method,
        storedData.nsec || undefined,
        storedData.pubkey || undefined,
        storedData.remoteRelay || undefined
      );
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
