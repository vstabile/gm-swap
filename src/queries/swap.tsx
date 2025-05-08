import { EventStore, IEventStore, Query } from "applesauce-core";
import { NostrEvent } from "nostr-tools";
import { KINDS } from "../lib/nostr";
import { combineLatest, map, Observable, of, switchMap } from "rxjs";
import { getTagValue } from "applesauce-core/helpers";
import { getGivenId, getTakenId } from "~/lib/ass";

export type SwapState =
  | "nonce-pending"
  | "adaptor-pending"
  | "given-pending"
  | "taken-pending"
  | "completed";

export type Swap = {
  id: string;
  proposer: string;
  counterparty: string;
  proposal: NostrEvent;
  noncePubkey: string;
  adaptorPubkey: string;
  nonce: string | null;
  enc_s: string | null;
  adaptors:
    | {
        sa: string;
        R: string;
        T: string;
      }[]
    | null;
  givenHash: string;
  takenHash: string;
  given: NostrEvent | null;
  taken: NostrEvent | null;
  state: SwapState;
};

type SwapEvents = {
  proposal: NostrEvent;
  nonceEvent: NostrEvent | undefined;
  adaptorEvent: NostrEvent | undefined;
  given: NostrEvent | undefined;
  taken: NostrEvent | undefined;
};

// Extract the transformation logic to a separate function
export function projectSwap(events: SwapEvents): Swap {
  const { proposal, nonceEvent, adaptorEvent, given, taken } = events;
  const proposalContent = JSON.parse(proposal.content);
  let nonce = proposalContent["nonce"];
  let enc_s = proposalContent["enc_s"];
  const counterparty = getTagValue(proposal, "p");
  let noncePubkey = nonce ? proposal.pubkey : counterparty;
  let adaptorPubkey = nonce ? counterparty : proposal.pubkey;

  // Override nonce if nonce event exists
  if (nonceEvent) {
    const nonceContent = JSON.parse(nonceEvent.content);
    nonce = nonceContent["nonce"];
    enc_s = nonceContent["enc_s"];
    noncePubkey = nonceEvent.pubkey;
  }

  // Find adaptor event
  const adaptors = adaptorEvent
    ? JSON.parse(adaptorEvent.content).adaptors
    : null;

  let state: SwapState;
  if (taken) {
    state = "completed";
  } else if (given) {
    state = "given-pending";
  } else if (adaptors) {
    state = "taken-pending";
  } else if (nonce) {
    state = "adaptor-pending";
  } else {
    state = "nonce-pending";
  }

  return {
    id: proposal.id,
    proposer: proposal.pubkey,
    counterparty,
    proposal,
    noncePubkey,
    adaptorPubkey,
    nonce: nonce,
    enc_s: enc_s,
    adaptors,
    givenHash: getGivenId(proposal),
    takenHash: getTakenId(proposal),
    given: given || null,
    taken: taken || null,
    state,
  };
}

// Fetch swap events related to a proposal
export function fetchSwapEvents(
  store: IEventStore,
  proposal: NostrEvent
): Observable<SwapEvents> {
  const givenId = getGivenId(proposal);
  const takenId = getTakenId(proposal);

  const relatedEvents$ = store.timeline([
    { kinds: [KINDS.NONCE], "#e": [proposal.id] },
    { kinds: [KINDS.ADAPTOR], "#E": [proposal.id] },
    { ids: [givenId, takenId] },
  ]);

  return combineLatest([of(proposal), relatedEvents$]).pipe(
    map(([proposal, relatedEvents]) => ({
      proposal,
      nonceEvent: relatedEvents.find((e) => e.kind === KINDS.NONCE),
      adaptorEvent: relatedEvents.find((e) => e.kind === KINDS.ADAPTOR),
      given: relatedEvents.find((e) => e.id === givenId),
      taken: relatedEvents.find((e) => e.id === takenId),
    }))
  );
}

export function Swaps(pubkey: string): Query<Swap[]> {
  return {
    key: `swaps-${pubkey}`,
    run: (store) =>
      store
        .timeline([
          { authors: [pubkey], kinds: [KINDS.PROPOSAL] },
          {
            "#p": [pubkey],
            kinds: [KINDS.PROPOSAL],
          },
        ])
        .pipe(
          // Fetch all events related to each proposal
          switchMap((proposals) => {
            const swapEvents$ = proposals.map((proposal) =>
              fetchSwapEvents(store, proposal)
            );

            return swapEvents$.length > 0 ? combineLatest(swapEvents$) : of([]);
          }),
          // Project the swap events into Swap models
          map((swapEventsArray) => swapEventsArray.map(projectSwap))
        ),
  };
}

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
