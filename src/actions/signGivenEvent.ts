import { Action } from "applesauce-actions";
import { getEventHash, NostrEvent } from "nostr-tools";
import { accounts } from "~/lib/accounts";
import { completeSignatures } from "~/lib/ass";
import { Swap } from "~/queries/swap";

export function signGivenEvent(swap: Swap): Action {
  return async function* () {
    const adaptors = swap.adaptors;

    // Decrypt the secret stored in the nonceEvent event
    const secret = await accounts.signer.nip04.decrypt(
      swap.noncePubkey,
      swap.enc_s
    );

    const sigs = completeSignatures(swap.proposal, adaptors, secret);

    const giveTemplate = {
      pubkey: swap.proposal.pubkey,
      ...JSON.parse(swap.proposal.content)["give"]["template"],
    };

    const giveEvent: NostrEvent = {
      id: getEventHash(giveTemplate),
      ...giveTemplate,
      sig: sigs[0],
    };

    yield giveEvent;
  };
}
