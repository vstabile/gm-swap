import { Action } from "applesauce-actions";
import { getEventHash, NostrEvent } from "nostr-tools";
import { extractSignature } from "~/lib/ass";

export function SignTakenEvent(
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
