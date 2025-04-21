import { Action } from "applesauce-actions";
import { EventTemplate } from "nostr-tools";
import { KINDS } from "~/lib/nostr";

export type SwapProposal = {
  give: SignatureTemplate;
  take: SignatureTemplate;
  listing?: string;
  description?: string;
};

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

export function ProposeSwap(recipient: string, proposal: SwapProposal): Action {
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
