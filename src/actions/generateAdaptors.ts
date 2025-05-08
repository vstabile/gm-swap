import { Action } from "applesauce-actions";
import { nip19, NostrEvent } from "nostr-tools";
import { computeAdaptors } from "~/lib/ass";
import { KINDS } from "~/lib/nostr";
import { Swap } from "~/queries/swap";

export function GenerateAdaptors(swap: Swap, nsec: string): Action {
  return async function* ({ factory }) {
    const created_at = Math.floor(Date.now() / 1000);

    const key = nip19.decode(nsec).data as Uint8Array;
    const nonce = swap.nonce;

    const content = {
      adaptors: computeAdaptors(swap.proposal, nonce, key),
    };

    const draft = await factory.build({
      kind: KINDS.ADAPTOR,
      content: JSON.stringify(content),
      created_at,
      tags: [
        ["E", swap.id],
        ["p", swap.noncePubkey],
      ],
    });

    yield await factory.sign(draft);
  };
}
