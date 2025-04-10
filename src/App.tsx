import {
  createEffect,
  createMemo,
  createSignal,
  For,
  from,
  onCleanup,
  onMount,
  Show,
  type Component,
} from "solid-js";
import Navbar from "./components/Navbar";
import GmProposal from "./components/GmProposal";
import { accounts } from "./lib/accounts";
import { ExtensionSigner, SimpleSigner } from "applesauce-signers";
import { ExtensionAccount, SimpleAccount } from "applesauce-accounts/accounts";
import { Button } from "./components/ui/button";
import { createRxForwardReq } from "rx-nostr";
import { KINDS, rxNostr } from "./lib/nostr";
import { eventStore, queryStore, STORAGE_KEY, userStore } from "./lib/stores";
import CreateProposal from "./components/CreateProposal";
import { of, switchMap } from "rxjs";
import { TextField, TextFieldInput } from "./components/ui/text-field";
import { nip19 } from "nostr-tools";
import { bytesToHex } from "@noble/hashes/utils";

const App: Component = () => {
  const account = from(accounts.active$);
  const rxReq = createRxForwardReq();

  const [nsec, setNsec] = createSignal("");
  const [nip07Available, setNip07Available] = createSignal(false);

  const key = createMemo(() => {
    if (!nsec()) return null;

    try {
      return nip19.decode(nsec()).data as Uint8Array;
    } catch {
      return null;
    }
  });

  const signinNip07 = async () => {
    if (accounts.active) return;

    const signer = new ExtensionSigner();
    const pubkey = await signer.getPublicKey();
    const account = new ExtensionAccount(pubkey, signer);

    accounts.addAccount(account);
    accounts.setActive(account);

    userStore.set({
      signInMethod: "nip07",
      pubkey,
    });
  };

  const signinWithNsec = async () => {
    if (!nsecIsValid()) return;
    if (accounts.active) return;

    const signer = new SimpleSigner(userStore.getKey() || key());
    const pubkey = await signer.getPublicKey();
    const account = new SimpleAccount(pubkey, signer);

    accounts.addAccount(account);
    accounts.setActive(account);

    userStore.set({
      signInMethod: "nsec",
      pubkey,
      key: bytesToHex(userStore.getKey() || key()),
    });

    setNsec("");
  };

  const nsecIsValid = createMemo(() => {
    if (!nsec()) return false;

    try {
      const decoded = nip19.decode(nsec());
      return decoded.type === "nsec";
    } catch {
      return false;
    }
  });

  const proposalsSent = from(
    accounts.active$.pipe(
      switchMap((account) =>
        account
          ? queryStore.timeline({
              authors: [account.pubkey],
              kinds: [KINDS.PROPOSAL],
            })
          : of([])
      )
    )
  );

  const proposalsReceived = from(
    accounts.active$.pipe(
      switchMap((account) =>
        account
          ? queryStore.timeline({
              "#p": [account.pubkey],
              kinds: [KINDS.PROPOSAL],
            })
          : of([])
      )
    )
  );

  onMount(() => {
    rxNostr.use(rxReq).subscribe(({ event }) => {
      eventStore.add(event);
    });

    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      const data = JSON.parse(stored);
      userStore.set(data);
    }

    const checkNip07 = () => {
      if (window.nostr) {
        setNip07Available(true);
        clearInterval(interval);
      }
    };

    const interval = setInterval(checkNip07, 100);
    onCleanup(() => clearInterval(interval));
  });

  createEffect(() => {
    if (account() || !userStore.user()) return;

    userStore.getSignInMethod() === "nip07"
      ? nip07Available() && signinNip07()
      : signinWithNsec();
  });

  createEffect(() => {
    if (!account()) return;

    rxReq.emit([
      { authors: [account()!.pubkey], kinds: [KINDS.PROPOSAL], limit: 12 },
      { "#p": [account()!.pubkey], kinds: [KINDS.PROPOSAL], limit: 12 },
    ]);
  });

  return (
    <div class="flex flex-col min-h-screen bg-gradient-to-b from-sky-400 via-orange-200 to-yellow-100 text-slate-800">
      <Navbar />
      <main class="flex flex-col gap-2 max-w-7xl mx-auto px-4 sm:px-6 lg:pb-6 w-full flex-1 pt-6 sm:pt-8">
        <h1 class="text-3xl sm:text-4xl font-black text-center flex flex-col">
          <span class="text-6xl mb-4">🌞</span>
          <span>GM Swap</span>
        </h1>
        <div class="flex justify-center text-center">
          <p class="sm:text-lg pt-2">
            Atomic exchange of GM notes using
            <br />
            Schnorr adaptor signatures
          </p>
        </div>
        <div class="flex flex-col w-full items-center pt-8 pb-8">
          <Show when={account()}>
            <CreateProposal />
          </Show>
          <Show when={!account()}>
            <Button
              onClick={signinNip07}
              class="flex w-full max-w-sm"
              disabled={!nip07Available()}
            >
              Sign In with NIP-07
            </Button>
            <div class="flex gap-2 mt-2 text-sm w-full max-w-sm">
              <TextField class="w-full">
                <TextFieldInput
                  type="text"
                  class="bg-white h-6"
                  placeholder="nsec1..."
                  onInput={(e) => setNsec((e.target as HTMLInputElement).value)}
                />
              </TextField>
              <Button
                class="rounded-md h-6 px-2 text-xs"
                onClick={signinWithNsec}
                disabled={!nsecIsValid()}
              >
                Sign In
              </Button>
            </div>
            <p class="text-xs text-gray-500 mt-2 max-w-sm text-center">
              nsec is necessary to finalize swaps proposals sent by you, but is
              not necessary for received swap proposals
            </p>
          </Show>
        </div>
        <Show when={proposalsSent().length > 0}>
          <h2 class="text-center text-lg font-bold mb-2">Proposals Sent</h2>
          <div class="flex flex-wrap justify-center gap-2 sm:gap-4">
            <For each={proposalsSent()}>
              {(proposal) => (
                <div class="w-full md:w-[calc(50%-0.5rem)] xl:w-[calc(33.333%-0.75rem)]">
                  <GmProposal proposal={proposal} />
                </div>
              )}
            </For>
          </div>
        </Show>
        <Show when={proposalsReceived().length > 0}>
          <h2 class="text-center text-lg font-bold mt-6 mb-2">
            Proposals Received
          </h2>
          <div class="flex flex-wrap justify-center gap-2 sm:gap-4">
            <For each={proposalsReceived()}>
              {(proposal) => (
                <div class="w-full md:w-[calc(50%-0.5rem)] xl:w-[calc(33.333%-0.75rem)]">
                  <GmProposal proposal={proposal} />
                </div>
              )}
            </For>
          </div>
        </Show>
      </main>
      <div class="flex flex-col justify-center py-6 px-4 text-center text-sm text-gray-500 items-center">
        <p class="flex items-center pb-1">
          <a
            href="https://github.com/vstabile/gm-swap"
            target="_blank"
            class="flex items-center"
          >
            <img src="/github.svg" alt="GitHub" class="w-4 h-4 mr-2" /> Github
          </a>
        </p>
        <p>
          This is a proof of concept for{" "}
          <a
            href="https://github.com/vstabile/nips/blob/atomic-signature-swaps/XX.md"
            target="_blank"
            class="mx-1 text-blue-500"
          >
            NIP-XX: Atomic Signature Swaps
          </a>
        </p>
      </div>
    </div>
  );
};

export default App;
