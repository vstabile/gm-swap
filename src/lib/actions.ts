import { EventFactory } from "applesauce-factory";
import { Action, ActionHub } from "applesauce-actions";
import { eventStore, userStore } from "./stores";
import { accounts } from "./accounts";
import { KINDS } from "./nostr";
import { EventTemplate, getEventHash, NostrEvent } from "nostr-tools";
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
  give: SignatureTemplate;
  take: SignatureTemplate;
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
      content: "Revoked",
      created_at,
      tags: [
        ["e", proposalId],
        ["k", KINDS.PROPOSAL],
      ],
    });

    yield await factory.sign(draft);
  };
}

// Accepts a proposal by creating a new Swap Nonce event
export function AcceptProposal(proposal: NostrEvent): Action {
  return async function* ({ factory }) {
    const account = from(accounts.active$);
    const created_at = Math.floor(Date.now() / 1000);

    const proposalContent: Proposal = JSON.parse(proposal.content);

    const myEvent = {
      pubkey: account()!.pubkey,
      ...proposalContent["take"]["template"],
    };

    const signedEvent = await accounts.signer.signEvent(myEvent);
    const nonce = signedEvent.sig.slice(0, 64);
    const encrypted_scalar = await accounts.signer.nip04.encrypt(
      account()!.pubkey,
      signedEvent.sig.slice(64)
    );

    const draft = await factory.build({
      kind: KINDS.NONCE,
      content: JSON.stringify({
        nonce,
      }),
      created_at,
      tags: [
        ["e", proposal.id],
        ["p", proposal.pubkey],
        ["enc_s", encrypted_scalar],
      ],
    });

    yield await factory.sign(draft);
  };
}

// Executes a swap by creating a new Swap Adaptor event
export function ExecuteSwap(
  nonceEvent: NostrEvent,
  proposal: NostrEvent
): Action {
  return async function* ({ factory }) {
    const created_at = Math.floor(Date.now() / 1000);

    const proposalId = nonceEvent.tags.filter((t) => t[0] === "e")[0][1];
    const nonce = JSON.parse(nonceEvent.content).nonce;

    const content = {
      adaptors: computeAdaptors(proposal, nonce, userStore.getKey()),
    };

    const draft = await factory.build({
      kind: KINDS.ADAPTOR,
      content: JSON.stringify(content),
      created_at,
      tags: [
        ["E", proposalId],
        ["e", nonceEvent.id],
        ["p", nonceEvent.pubkey],
      ],
    });

    yield await factory.sign(draft);
  };
}

export function PublishGivenEvent(
  proposal: NostrEvent,
  nonceEvent: NostrEvent,
  adaptorEvent: NostrEvent
): Action {
  return async function* () {
    const adaptors = JSON.parse(adaptorEvent.content).adaptors;
    const encrypted_scalar = nonceEvent.tags.filter(
      (t) => t[0] === "enc_s"
    )[0][1];

    // Decrypt the secret stored in the nonceEvent event
    const secret = await accounts.signer.nip04.decrypt(
      nonceEvent.pubkey,
      encrypted_scalar
    );

    const sigs = completeSignatures(proposal, adaptors, secret);

    const giveTemplate = {
      pubkey: proposal.pubkey,
      ...JSON.parse(proposal.content)["give"]["template"],
    };

    const giveEvent: NostrEvent = {
      id: getEventHash(giveTemplate),
      ...giveTemplate,
      sig: sigs[0],
    };

    yield giveEvent;
  };
}

export function PublishTakenEvent(
  proposal: NostrEvent,
  nonceEvent: NostrEvent,
  adaptorEvent: NostrEvent,
  give: NostrEvent
): Action {
  return async function* () {
    const sig = extractSignature(nonceEvent, adaptorEvent, give);

    const takeTemplate = {
      pubkey: nonceEvent.pubkey,
      ...JSON.parse(proposal.content)["take"]["template"],
    };

    const takeEvent = {
      id: getEventHash(takeTemplate),
      ...takeTemplate,
      sig,
    };

    yield takeEvent;
  };
}
