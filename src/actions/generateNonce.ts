import { Action } from "applesauce-actions";
import { NostrEvent } from "nostr-tools";
import { from } from "solid-js";
import { accounts } from "~/lib/accounts";
import { SwapProposal } from "./proposeSwap";
import { KINDS } from "~/lib/nostr";

export function GenerateNonce(proposal: NostrEvent): Action {
  return async function* ({ factory }) {
    const account = from(accounts.active$);
    const created_at = Math.floor(Date.now() / 1000);

    const proposalContent: SwapProposal = JSON.parse(proposal.content);

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
