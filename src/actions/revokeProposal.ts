import { Action } from "applesauce-actions";
import { KINDS } from "~/lib/nostr";

export function RevokeProposal(proposalId: string): Action {
  return async function* ({ factory }) {
    const created_at = Math.floor(Date.now() / 1000);

    const draft = await factory.build({
      kind: KINDS.DELETION,
      content: "Revoked",
      created_at,
      tags: [
        ["e", proposalId],
        ["k", KINDS.PROPOSAL.toString()],
      ],
    });

    yield await factory.sign(draft);
  };
}
