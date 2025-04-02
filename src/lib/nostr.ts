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
]);

export const KINDS = {
  PROPOSAL: 455,
  ACCEPTANCE: 456,
  EXECUTION: 457,
  DELETION: 5,
};
