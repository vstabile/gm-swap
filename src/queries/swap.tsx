import { Query } from "applesauce-core";
import { NostrEvent } from "nostr-tools";
import { KINDS } from "../lib/nostr";

// type Swap = {
//   id: string;
//   proposer: string;
//   counterparty: string;
//   nonce: string;
//   adaptors: {
//     sa: string;
//     R: string;
//     T: string;
//   }[];
//   given: NostrEvent;
//   taken: NostrEvent;
// };

// /** A query that returns the current state of a swap */
// export function SwapQuery(proposalId: string): Query<Swap> {
//   return {
//     key: `swap-${proposalId}`,
//     run: (events) =>
//       events.filters([{ kinds: [KINDS.PROPOSAL], "#E": [proposal.id] }]),
//   };
// }

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
