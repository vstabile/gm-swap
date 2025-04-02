import { LucideHourglass, LucideLoader, LucideX } from "lucide-solid";
import { createSignal, Show } from "solid-js";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { eventStore, userStore } from "~/lib/stores";
import { nip19, NostrEvent } from "nostr-tools";
import { StatusProps } from "../ProposalStatus";
import {
  actions,
  ExecuteSwap,
  PublishRequest,
  RevokeProposal,
} from "~/lib/actions";
import { rxNostr } from "~/lib/nostr";
import { Button } from "../ui/button";

export function ProposerStatus(props: StatusProps) {
  const [isRevoking, setIsRevoking] = createSignal(false);
  const [isExecuting, setIsExecuting] = createSignal(false);
  const [isPublishing, setIsPublishing] = createSignal(false);

  async function revokeProposal() {
    setIsRevoking(true);

    try {
      await actions
        .exec(RevokeProposal, props.proposal.id)
        .forEach((event: NostrEvent) => {
          eventStore.add(event);
          rxNostr.send(event);
        });
    } catch {
    } finally {
      setIsRevoking(false);
    }
  }

  async function executeSwap() {
    setIsExecuting(true);

    try {
      await actions
        .exec(ExecuteSwap, props.acceptance, props.proposal)
        .forEach((event: NostrEvent) => {
          eventStore.add(event);
          rxNostr.send(event);
        });
    } catch {
    } finally {
      setIsExecuting(false);
    }
  }

  async function publishRequest() {
    setIsPublishing(true);

    try {
      await actions
        .exec(
          PublishRequest,
          props.proposal,
          props.acceptance,
          props.execution,
          props.offer
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
      <Show when={!props.acceptance}>
        <div class="flex items-center text-white bg-yellow-500 px-2 py-1 rounded-md h-7 text-xs">
          <LucideHourglass class="w-3 h-3 mr-1" /> Pending acceptance
          {isRevoking() ? (
            <LucideLoader class="w-3 h-3 ml-1 animate-spin" />
          ) : (
            <LucideX
              class="w-3 h-3 ml-1 mt-0.5 cursor-pointer"
              onClick={revokeProposal}
            />
          )}
        </div>
      </Show>
      <Show when={!props.execution && props.acceptance}>
        <Show when={!isExecuting() && !isRevoking()}>
          <button class="text-red-600 px-2 py-1 mr-1" onClick={revokeProposal}>
            Revoke
          </button>
          <Tooltip>
            <TooltipTrigger>
              <button
                class={
                  (userStore.getKey() ? "bg-green-600" : "bg-gray-400") +
                  " text-white px-2 py-1 rounded-md"
                }
                onClick={executeSwap}
                disabled={!userStore.getKey()}
              >
                Swap
              </button>
            </TooltipTrigger>
            {!userStore.getKey() ? (
              <TooltipContent>
                You need to sign in using your nsec in order to swap.
              </TooltipContent>
            ) : (
              ""
            )}
          </Tooltip>
        </Show>
        <Show when={isExecuting()}>
          <div class="text-green-600 flex flex-row items-center">
            <LucideLoader class="w-4 h-4 mr-1 animate-spin" />
            Finalizing
          </div>
        </Show>
        <Show when={isRevoking()}>
          <div class="text-red-600 flex flex-row items-center">
            <LucideLoader class="w-4 h-4 mr-1 animate-spin" />
            Revoking
          </div>
        </Show>
      </Show>

      <Show when={!props.request && !props.offer && props.execution}>
        <div class="flex items-center text-white bg-sky-500 px-2 py-1 rounded-md h-7 text-xs">
          <LucideHourglass class="w-3 h-3 mr-1" /> Waiting counterparty to
          publish
        </div>
      </Show>
      <Show when={!props.request && props.offer}>
        <Button size="sm" onClick={publishRequest} disabled={isPublishing()}>
          <Show when={isPublishing()} fallback="Publish GM">
            <LucideLoader class="w-4 h-4 animate-spin" />
            Publishing
          </Show>
        </Button>
      </Show>
      <Show when={props.request}>
        <a
          href={
            "https://njump.me/" + nip19.neventEncode({ id: props.request.id })
          }
          class="flex text-primary flex-row justify-center w-full h-7 items-center"
          target="_blank"
        >
          GM was published!
        </a>
      </Show>
    </>
  );
}
