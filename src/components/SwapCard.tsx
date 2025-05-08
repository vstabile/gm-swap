import ProposalStatus from "./ProposalStatus";
import { Swap } from "~/queries/swap";
import { SwapSide } from "./SwapSide";
import Timeline from "./Timeline";
import { createEffect, from, Match, Show, Switch } from "solid-js";
import { accounts } from "~/lib/accounts";
import SwapNonceActions from "./SwapNonceActions";
import SwapAdaptorActions from "./SwapAdaptorActions";
import { createRxForwardReq } from "rx-nostr";
import { eventStore } from "~/stores/eventStore";
import { KINDS, rxNostr } from "~/lib/nostr";

export default function SwapCard(props: { swap: Swap }) {
  const account = from(accounts.active$);

  createEffect(() => {
    const rxReq = createRxForwardReq();

    rxNostr.use(rxReq).subscribe(({ event }) => {
      eventStore.add(event);
    });

    rxReq.emit([
      {
        kinds: [KINDS.NONCE],
        "#e": [props.swap.id],
      },
      {
        kinds: [KINDS.ADAPTOR],
        "#E": [props.swap.id],
      },
      {
        ids: [props.swap.givenHash, props.swap.takenHash],
      },
    ]);
  });

  return (
    <div class="flex flex-col bg-white rounded-lg border border-gray-200 text-sm">
      <div class="flex flex-row justify-between border-b border-gray-200">
        <SwapSide pubkey={props.swap.proposer} swap={props.swap} />
        <div class="border-l border-gray-200 h-auto"></div>
        <SwapSide pubkey={props.swap.counterparty} swap={props.swap} />
      </div>

      <div class="px-3 pt-0 pb-1">
        <Timeline
          swap={props.swap}
          isNonceProvider={account().pubkey === props.swap.noncePubkey}
        />
      </div>

      <div class="flex w-full py-1 border-t border-gray-200 text-center justify-center">
        <Switch>
          <Match when={account().pubkey === props.swap.noncePubkey}>
            <SwapNonceActions swap={props.swap} />
          </Match>
          <Match when={account().pubkey !== props.swap.noncePubkey}>
            <SwapAdaptorActions swap={props.swap} />
          </Match>
        </Switch>
        {/* <ProposalStatus proposal={props.swap.proposal} /> */}
      </div>
    </div>
  );
}
