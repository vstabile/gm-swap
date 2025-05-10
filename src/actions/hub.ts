import { ActionHub } from "applesauce-actions";
import { EventFactory } from "applesauce-factory";
import { NostrEvent } from "nostr-tools";
import { accounts } from "~/lib/accounts";
import { rxNostr } from "~/lib/nostr";
import { eventStore } from "~/stores/eventStore";

export const factory = new EventFactory({
  signer: accounts.signer,
});

const publish = async (event: NostrEvent) => {
  eventStore.add(event);
  rxNostr.send(event);
};

// The action hub is used to run Actions against the event store
export const actions = new ActionHub(eventStore, factory, publish);
