import { Action } from "applesauce-actions";
import { nip19, NostrEvent } from "nostr-tools";
import { computeAdaptors } from "~/lib/ass";
import { KINDS } from "~/lib/nostr";
import { session } from "~/stores/session";

export function GenerateAdaptors(
  nonceEvent: NostrEvent,
  proposal: NostrEvent
): Action {
  return async function* ({ factory }) {
    const created_at = Math.floor(Date.now() / 1000);

    const key = nip19.decode(session.nsec).data as Uint8Array;
    const proposalId = nonceEvent.tags.filter((t) => t[0] === "e")[0][1];
    const nonce = JSON.parse(nonceEvent.content).nonce;

    const content = {
      adaptors: computeAdaptors(proposal, nonce, key),
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
