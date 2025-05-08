import { getEventHash, NostrEvent } from "nostr-tools";
import { createRxForwardReq } from "rx-nostr";
import { createEffect, createMemo, from, Show } from "solid-js";
import { KINDS, rxNostr } from "~/lib/nostr";
import { eventStore } from "~/stores/eventStore";
import { queryStore } from "~/stores/queryStore";
import { SwapNonceQuery, SwapAdaptorQuery } from "~/queries/swap";
import { ProposerStatus } from "./ProposalStatus/ProposerStatus";
import { CounterypartyStatus } from "./ProposalStatus/CounterpartyStatus";
import { accounts } from "~/lib/accounts";
import { getGivenId, getTakenId } from "~/lib/ass";

export type StatusProps = {
  proposal: NostrEvent;
  nonceEvent: NostrEvent | undefined;
  adaptorEvent: NostrEvent | undefined;
  give: NostrEvent | undefined;
  take: NostrEvent | undefined;
};

export default function ProposalStatus(props: { proposal: NostrEvent }) {
  const account = from(accounts.active$);

  createEffect(() => {
    const rxReq = createRxForwardReq();

    rxNostr.use(rxReq).subscribe(({ event }) => {
      eventStore.add(event);
    });

    rxReq.emit([
      {
        kinds: [KINDS.NONCE],
        "#e": [props.proposal.id],
      },
      {
        kinds: [KINDS.ADAPTOR],
        "#E": [props.proposal.id],
      },
      {
        ids: [giveId(), takeId()],
      },
    ]);
  });

  const giveId = createMemo(() => {
    return getGivenId(props.proposal);
  });

  const takeId = createMemo(() => {
    return getTakenId(props.proposal);
  });

  const nonceEvent = from(
    queryStore.createQuery(SwapNonceQuery, props.proposal)
  );

  const adaptorEvent = from(
    queryStore.createQuery(SwapAdaptorQuery, props.proposal)
  );

  const give = from(queryStore.event(giveId()));
  const take = from(queryStore.event(takeId()));

  return (
    <>
      <Show when={props.proposal.pubkey === account()!.pubkey}>
        <ProposerStatus
          proposal={props.proposal}
          nonceEvent={nonceEvent()}
          adaptorEvent={adaptorEvent()}
          give={give()}
          take={take()}
        />
      </Show>
      <Show when={props.proposal.pubkey !== account()!.pubkey}>
        <CounterypartyStatus
          proposal={props.proposal}
          nonceEvent={nonceEvent()}
          adaptorEvent={adaptorEvent()}
          give={give()}
          take={take()}
        />
      </Show>
    </>
  );
}
