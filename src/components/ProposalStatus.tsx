import { getEventHash, NostrEvent } from "nostr-tools";
import { createRxForwardReq } from "rx-nostr";
import { createEffect, createMemo, from, Show } from "solid-js";
import { KINDS, rxNostr } from "~/lib/nostr";
import {
  AcceptanceQuery,
  eventStore,
  queryStore,
  SwapExecutionQuery,
} from "~/lib/stores";
import { ProposerStatus } from "./ProposalStatus/ProposerStatus";
import { CounterypartyStatus } from "./ProposalStatus/CounterpartyStatus";
import { accounts } from "~/lib/accounts";

export type StatusProps = {
  proposal: NostrEvent;
  acceptance: NostrEvent | undefined;
  execution: NostrEvent | undefined;
  offer: NostrEvent | undefined;
  request: NostrEvent | undefined;
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
        kinds: [KINDS.ACCEPTANCE],
        "#e": [props.proposal.id],
      },
      {
        kinds: [KINDS.EXECUTION],
        "#E": [props.proposal.id],
      },
      {
        ids: [offerId(), requestId()],
      },
    ]);
  });

  const offerId = createMemo(() => {
    return getEventHash({
      pubkey: props.proposal.pubkey,
      ...JSON.parse(props.proposal.content)["offer"]["template"],
    });
  });

  const requestId = createMemo(() => {
    return getEventHash({
      pubkey: props.proposal.tags.filter((t) => t[0] === "p")[0][1],
      ...JSON.parse(props.proposal.content)["request"]["template"],
    });
  });

  const acceptance = from(
    queryStore.createQuery(AcceptanceQuery, props.proposal)
  );

  const execution = from(
    queryStore.createQuery(SwapExecutionQuery, props.proposal)
  );

  const offer = from(queryStore.event(offerId()));
  const request = from(queryStore.event(requestId()));

  return (
    <>
      <Show when={props.proposal.pubkey === account()!.pubkey}>
        <ProposerStatus
          proposal={props.proposal}
          acceptance={acceptance()}
          execution={execution()}
          offer={offer()}
          request={request()}
        />
      </Show>
      <Show when={props.proposal.pubkey !== account()!.pubkey}>
        <CounterypartyStatus
          proposal={props.proposal}
          acceptance={acceptance()}
          execution={execution()}
          offer={offer()}
          request={request()}
        />
      </Show>
    </>
  );
}
