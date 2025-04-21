import { EventStore } from "applesauce-core";
import { NostrEvent, VerifiedEvent, verifyEvent } from "nostr-tools";
import { KINDS } from "~/lib/nostr";
import {
  adaptorEventSchema,
  nonceEventSchema,
  proposalEventSchema,
} from "~/schema";

export const eventStore = new EventStore();

// verify the events when they are added to the store
eventStore.verifyEvent = deepVerifyEvent;

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
