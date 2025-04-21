import { ActionHub } from "applesauce-actions";
import { EventFactory } from "applesauce-factory";
import { accounts } from "~/lib/accounts";
import { eventStore } from "~/stores/eventStore";

export const factory = new EventFactory({
  signer: accounts.signer,
});

// The action hub is used to run Actions against the event store
export const actions = new ActionHub(eventStore, factory);
