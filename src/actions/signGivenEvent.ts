import { Action } from "applesauce-actions";
import { getEventHash, NostrEvent } from "nostr-tools";
import { accounts } from "~/lib/accounts";
import { completeSignatures } from "~/lib/ass";

export function signGivenEvent(
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
