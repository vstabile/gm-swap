import { EventStore, Query, QueryStore } from "applesauce-core";
import { NostrEvent, verifyEvent, VerifiedEvent } from "nostr-tools";
import { KINDS } from "./nostr";
import { createSignal } from "solid-js";
import { hexToBytes } from "@noble/hashes/utils";
import {
  proposalEventSchema,
  nonceEventSchema,
  adaptorEventSchema,
} from "~/schema";

export const STORAGE_KEY = "gm_swap";

type User = {
  signInMethod: "nsec" | "nip07";
  key?: string;
  pubkey: string;
};

const [user, setUser] = createSignal<User | null>(null);

export const userStore = {
  user,
  set: (data: User | null) => {
    setUser(data);
    if (data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  },
  getKey: () => (user()?.key ? hexToBytes(user().key) : null),
  getSignInMethod: () => user()?.signInMethod,
  clear: () => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  },
};

export const eventStore = new EventStore();

// verify the events when they are added to the store
eventStore.verifyEvent = deepVerifyEvent;

// the query store needs the event store to subscribe to it
export const queryStore = new QueryStore(eventStore);

/** A query that returns all reactions to an event (supports replaceable events) */
export function SwapNonceQuery(proposal: NostrEvent): Query<NostrEvent> {
  return {
    key: `swap-nonce-${proposal.id}`,
    run: (events) =>
      events.filters([
        {
          kinds: [KINDS.NONCE],
          "#e": [proposal.id],
          authors: [
            proposal.pubkey,
            proposal.tags.filter((t) => t[0] === "p")[0][1],
          ],
        },
      ]),
  };
}

export function SwapAdaptorQuery(proposal: NostrEvent): Query<NostrEvent> {
  return {
    key: `swap-adaptor-${proposal.id}`,
    run: (events) =>
      events.filters([{ kinds: [KINDS.ADAPTOR], "#E": [proposal.id] }]),
  };
}

function deepVerifyEvent(event: NostrEvent): event is VerifiedEvent {
  const deepVerifyKinds = [KINDS.PROPOSAL, KINDS.NONCE, KINDS.ADAPTOR];
  const shallowVerify = verifyEvent(event);

  if (!shallowVerify) return false;
  if (!deepVerifyKinds.includes(event.kind)) return true;

  try {
    if (event.kind === KINDS.PROPOSAL) {
      proposalEventSchema.parse(event);
    } else if (event.kind === KINDS.NONCE) {
      nonceEventSchema.parse(event);
    } else if (event.kind === KINDS.ADAPTOR) {
      adaptorEventSchema.parse(event);
    }

    return true;
  } catch (error) {
    return false;
  }
}
