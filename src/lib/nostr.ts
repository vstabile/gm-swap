import { createRxNostr, noopVerifier } from "rx-nostr";

export const rxNostr = createRxNostr({
  // skip verification here because we are going to verify events at the event store
  skipVerify: true,
  verifier: noopVerifier,
});

rxNostr.setDefaultRelays([
  "wss://relay.primal.net",
  "wss://relay.damus.io",
  "wss://nostr.wine",
  "wss://relay.nostr.band",
  "wss://relay.vertexlab.io",
]);

export const DVM_RELAY = "wss://relay.vertexlab.io";

export const NIP46_RELAY = "wss://relay.nsec.app";

export const KINDS = {
  PROPOSAL: 455,
  NONCE: 456,
  ADAPTOR: 457,
  DELETION: 5,
  SEARCH_REQUEST: 5315,
  SEARCH_RESULT: 6315,
  JOB_FEEDBACK: 7000,
};
