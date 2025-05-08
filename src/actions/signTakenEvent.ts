import { Action } from "applesauce-actions";
import { getEventHash, NostrEvent } from "nostr-tools";
import { extractSignature } from "~/lib/ass";
import { Swap } from "~/queries/swap";

export function SignTakenEvent(swap: Swap): Action {
  return async function* () {
    const sig = extractSignature(swap);

    const takeTemplate = {
      pubkey: swap.noncePubkey,
      ...JSON.parse(swap.proposal.content)["take"]["template"],
    };

    const takeEvent = {
      id: getEventHash(takeTemplate),
      ...takeTemplate,
      sig,
    };

    yield takeEvent;
  };
}
