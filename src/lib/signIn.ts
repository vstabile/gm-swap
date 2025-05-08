import { ExtensionAccount, SimpleAccount } from "applesauce-accounts/accounts";
import {
  ExtensionSigner,
  NostrConnectSigner,
  SimpleSigner,
} from "applesauce-signers";
import { nip19 } from "nostr-tools";
import { accounts } from "./accounts";
import { KINDS, NIP46_RELAY, rxNostr } from "./nostr";
import { createRxForwardReq } from "rx-nostr";
import { Subscription } from "rxjs";
import { BaseAccount } from "applesauce-accounts";

export type AuthMethod = "nip07" | "nsec" | "nip46";

export const NIP46_PERMISSIONS = [
  `sign_event:${KINDS.SEARCH_REQUEST}`,
  `sign_event:${KINDS.PROPOSAL}`,
  `sign_event:${KINDS.NONCE}`,
  `sign_event:${KINDS.ADAPTOR}`,
  `sign_event:${KINDS.DELETION}`,
  `nip04_encrypt`,
];

export async function signIn(method: AuthMethod, nsec?: string) {
  let account: BaseAccount<any, any, any>;

  if (method === "nip07" && window.nostr) {
    const signer = new ExtensionSigner();
    const pubkey = await signer.getPublicKey();
    account = new ExtensionAccount(pubkey, signer);
  } else if (method === "nsec" && nsec) {
    const decoded = nip19.decode(nsec);
    if (decoded.type !== "nsec") throw new Error("Invalid nsec");

    const key = decoded.data;
    const signer = new SimpleSigner(key);
    const pubkey = await signer.getPublicKey();
    account = new SimpleAccount(pubkey, signer);
  } else if (method === "nip46") {
    const rxReq = createRxForwardReq();
    let subscription: Subscription;

    const signer = new NostrConnectSigner({
      relays: [NIP46_RELAY],
      async onSubOpen(filters, relays, onEvent) {
        subscription = rxNostr
          .use(rxReq, { on: { relays } })
          .subscribe(({ event }) => onEvent(event));

        rxReq.emit(filters);
      },
      async onSubClose() {
        subscription.unsubscribe();
      },
      async onPublishEvent(event, relays) {
        console.log("onPublishEvent", relays);
        rxNostr.send(event, { on: { relays } });
      },
    });

    return signer;
  }

  if (account) {
    accounts.addAccount(account);
    accounts.setActive(account);
  }

  return account;
}
