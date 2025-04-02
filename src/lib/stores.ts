import { EventStore, Query, QueryStore } from "applesauce-core";
import { NostrEvent, verifyEvent } from "nostr-tools";
import { KINDS } from "./nostr";
import { createSignal } from "solid-js";
import { hexToBytes } from "@noble/hashes/utils";

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
eventStore.verifyEvent = verifyEvent;

// the query store needs the event store to subscribe to it
export const queryStore = new QueryStore(eventStore);

/** A query that returns all reactions to an event (supports replaceable events) */
export function AcceptanceQuery(proposal: NostrEvent): Query<NostrEvent> {
  return {
    key: `acceptance-${proposal.id}`,
    run: (events) =>
      events.filters([
        {
          kinds: [KINDS.ACCEPTANCE],
          "#e": [proposal.id],
          authors: [
            proposal.pubkey,
            proposal.tags.filter((t) => t[0] === "p")[0][1],
          ],
        },
      ]),
  };
}

export function SwapExecutionQuery(proposal: NostrEvent): Query<NostrEvent> {
  return {
    key: `swap-execution-${proposal.id}`,
    run: (events) =>
      events.filters([{ kinds: [KINDS.EXECUTION], "#E": [proposal.id] }]),
  };
}
