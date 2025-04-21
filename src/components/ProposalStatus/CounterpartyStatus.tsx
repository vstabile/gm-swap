import { LucideHourglass, LucideLoader } from "lucide-solid";
import { createSignal, Show } from "solid-js";
import { StatusProps } from "../ProposalStatus";
import { eventStore } from "~/stores/eventStore";
import { nip19, NostrEvent } from "nostr-tools";
import { rxNostr } from "~/lib/nostr";
import { Button } from "../ui/button";
import { actions } from "~/actions/hub";
import { GenerateNonce } from "~/actions/generateNonce";
import { signGivenEvent } from "~/actions/signGivenEvent";

export function CounterypartyStatus(props: StatusProps) {
  const [isAccepting, setIsAccepting] = createSignal(false);
  const [isRejecting, setIsRejecting] = createSignal(false);
  const [isPublishing, setIsPublishing] = createSignal(false);

  async function acceptProposal() {
    setIsAccepting(true);

    try {
      await actions
        .exec(GenerateNonce, props.proposal)
        .forEach((event: NostrEvent) => {
          eventStore.add(event);
          rxNostr.send(event);
        });
    } catch {
    } finally {
      setIsAccepting(false);
    }
  }

  async function rejectProposal() {
    setIsRejecting(true);

    // await actions
    //   .exec(AcceptProposal, props.proposal.id)
    //   .forEach((event: NostrEvent) => {
    //     eventStore.add(event);
    //     rxNostr.send(event);
    //   });

    setTimeout(() => setIsRejecting(false), 1000);
  }

  async function publishGivenEvent() {
    setIsPublishing(true);

    try {
      await actions
        .exec(
          signGivenEvent,
          props.proposal,
          props.nonceEvent,
          props.adaptorEvent
        )
        .forEach((event: NostrEvent) => {
          eventStore.add(event);
          rxNostr.send(event);
        });
    } catch {
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <>
      <Show when={!props.adaptorEvent && !props.nonceEvent}>
        <div class="flex flex-row justify-center w-full h-7 items-center">
          <Show when={!isAccepting() && !isRejecting()}>
            <button
              class="text-red-600 px-2 py-1 mr-1"
              onClick={rejectProposal}
            >
              Reject
            </button>
            <button
              class="bg-green-600 text-white px-2 py-1 rounded-md"
              onClick={acceptProposal}
            >
              Accept
            </button>
          </Show>
          <Show when={isAccepting()}>
            <div class="text-green-600 flex flex-row items-center">
              <LucideLoader class="w-4 h-4 mr-1 animate-spin" />
              Accepting
            </div>
          </Show>
          <Show when={isRejecting()}>
            <div class="text-red-600 flex flex-row items-center">
              <LucideLoader class="w-4 h-4 mr-1 animate-spin" />
              Rejecting
            </div>
          </Show>
        </div>
      </Show>
      <Show when={!props.adaptorEvent && props.nonceEvent}>
        <div class="flex items-center text-white bg-yellow-500 px-2 py-1 rounded-md h-7 text-xs">
          <LucideHourglass class="w-3 h-3 mr-1" /> Pending signature
        </div>
      </Show>

      <Show when={!props.give && props.adaptorEvent}>
        <Button size="sm" onClick={publishGivenEvent} disabled={isPublishing()}>
          <Show when={isPublishing()} fallback="Publish GM">
            <LucideLoader class="w-4 h-4 animate-spin" />
            Publishing
          </Show>
        </Button>
      </Show>
      <Show when={props.give}>
        <a
          href={"https://njump.me/" + nip19.neventEncode({ id: props.give.id })}
          class="flex text-primary flex-row justify-center w-full h-7 items-center"
          target="_blank"
        >
          GM was published!
        </a>
      </Show>
    </>
  );
}
