import { EventFactory } from "applesauce-factory";
import { Action, ActionHub } from "applesauce-actions";
import { eventStore, userStore } from "./stores";
import { accounts } from "./accounts";
import { KINDS } from "./nostr";
import {
  EventTemplate,
  getEventHash,
  nip04,
  NostrEvent,
  verifyEvent,
} from "nostr-tools";
import { from } from "solid-js";
import { completeSignatures, computeAdaptors, extractSignature } from "./ass";

// The event factory is used to build and modify nostr events
export const factory = new EventFactory({
  // accounts.signer is a NIP-07 signer that signs with the currently active account
  signer: accounts.signer,
});

// The action hub is used to run Actions against the event store
export const actions = new ActionHub(eventStore, factory);

type NostrSignatureTemplate = {
  type: "nostr";
  template: EventTemplate;
};

type CashuSignatureTemplate = {
  type: "cashu";
  amount: number;
  mint: string | string[];
};

export type SignatureTemplate = NostrSignatureTemplate | CashuSignatureTemplate;

export type Proposal = {
  offer: SignatureTemplate;
  request: SignatureTemplate;
  listing?: string;
  description?: string;
};

// Creates a new Swap Proposal event
export function Propose(recipient: string, proposal: Proposal): Action {
  return async function* ({ factory }) {
    const created_at = Math.floor(Date.now() / 1000);

    const draft = await factory.build({
      kind: KINDS.PROPOSAL,
      content: JSON.stringify(proposal),
      created_at,
      tags: [["p", recipient]],
    });

    yield await factory.sign(draft);
  };
}

// Revokes a proposal by deleting the Swap Proposal event
export function RevokeProposal(proposalId: string) {
  return async function* ({ factory }) {
    const created_at = Math.floor(Date.now() / 1000);

    const draft = await factory.build({
      kind: KINDS.DELETION,
      content: "Proposal revoked",
      created_at,
      tags: [
        ["e", proposalId],
        ["k", KINDS.PROPOSAL],
      ],
    });

    yield await factory.sign(draft);
  };
}

// Accepts a proposal by creating a new Swap Acceptance event
export function AcceptProposal(proposal: NostrEvent): Action {
  return async function* ({ factory }) {
    const account = from(accounts.active$);
    const created_at = Math.floor(Date.now() / 1000);

    const proposalContent: Proposal = JSON.parse(proposal.content);

    const myEvent = {
      pubkey: account()!.pubkey,
      ...proposalContent["request"]["template"],
    };

    const signedEvent = await accounts.signer.signEvent(myEvent);
    console.log("pre-signed Event", signedEvent);
    console.log("pre-signed Event is valid", verifyEvent(signedEvent));
    const nonce = signedEvent.sig.slice(0, 64);
    const encrypted_scalar = await accounts.signer.nip04.encrypt(
      account()!.pubkey,
      signedEvent.sig.slice(64)
    );

    const draft = await factory.build({
      kind: KINDS.ACCEPTANCE,
      content: JSON.stringify({
        nonce,
        encrypted_scalar,
      }),
      created_at,
      tags: [
        ["e", proposal.id],
        ["p", proposal.pubkey],
      ],
    });

    yield await factory.sign(draft);
  };
}

// Executes a swap by creating a new Swap Execution event
export function ExecuteSwap(
  acceptance: NostrEvent,
  proposal: NostrEvent
): Action {
  return async function* ({ factory }) {
    const created_at = Math.floor(Date.now() / 1000);

    const proposalId = acceptance.tags.filter((t) => t[0] === "e")[0][1];
    const nonce = JSON.parse(acceptance.content).nonce;

    const content = {
      adaptors: computeAdaptors(proposal, nonce, userStore.getKey()),
    };

    const draft = await factory.build({
      kind: KINDS.EXECUTION,
      content: JSON.stringify(content),
      created_at,
      tags: [
        ["E", proposalId],
        ["e", acceptance.id],
        ["p", acceptance.pubkey],
      ],
    });

    yield await factory.sign(draft);
  };
}

export function PublishOffer(
  proposal: NostrEvent,
  acceptance: NostrEvent,
  execution: NostrEvent
): Action {
  return async function* () {
    const adaptors = JSON.parse(execution.content).adaptors;
    const encrypted_scalar = JSON.parse(acceptance.content).encrypted_scalar;

    // Decrypt the secret stored in the acceptance event
    const secret = await accounts.signer.nip04.decrypt(
      acceptance.pubkey,
      encrypted_scalar
    );

    const sigs = completeSignatures(proposal, adaptors, secret);

    const offerTemplate = {
      pubkey: proposal.pubkey,
      ...JSON.parse(proposal.content)["offer"]["template"],
    };

    const offerEvent: NostrEvent = {
      id: getEventHash(offerTemplate),
      ...offerTemplate,
      sig: sigs[0],
    };

    console.log("offerEvent", offerEvent);

    yield offerEvent;
  };
}

export function PublishRequest(
  proposal: NostrEvent,
  acceptance: NostrEvent,
  execution: NostrEvent,
  offer: NostrEvent
): Action {
  return async function* () {
    const sig = extractSignature(acceptance, execution, offer);

    const requestTemplate = {
      pubkey: acceptance.pubkey,
      ...JSON.parse(proposal.content)["request"]["template"],
    };

    const requestEvent = {
      id: getEventHash(requestTemplate),
      ...requestTemplate,
      sig,
    };

    yield requestEvent;
  };
}
