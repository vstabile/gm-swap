import { LucideHourglass, LucideLoader } from "lucide-solid";
import { createSignal, Match, Show, Switch } from "solid-js";
import { GenerateNonce } from "~/actions/generateNonce";
import { actions } from "~/actions/hub";
import { signGivenEvent } from "~/actions/signGivenEvent";
import { Swap } from "~/queries/swap";

export default function SwapNonceActions(props: { swap: Swap }) {
  const [isSendingNonce, setIsSendingNonce] = createSignal(false);
  const [isPublishing, setIsPublishing] = createSignal(false);

  async function sendNonce() {
    setIsSendingNonce(true);

    try {
      await actions.run(GenerateNonce, props.swap);
    } catch {
    } finally {
      setIsSendingNonce(false);
    }
  }

  async function publishGivenEvent() {
    setIsPublishing(true);

    try {
      await actions.run(signGivenEvent, props.swap);
    } catch {
    } finally {
      setIsPublishing(false);
    }
  }

  return (
    <div class="flex text-gray-400 text-xs px-3 py-2 justify-center w-full">
      <Switch>
        <Match when={props.swap.state === "nonce-pending"}>
          <button
            class="flex items-center justify-center border-green-700 bg-gradient-to-br from-green-600 to-green-500 drop-shadow hover:from-green-600 hover:to-green-400 disabled:bg-green-600/80 text-white px-2 py-1 rounded-md w-full"
            onClick={sendNonce}
            disabled={isSendingNonce()}
          >
            <Show when={isSendingNonce()} fallback="Accept Proposal">
              <LucideLoader class="w-3 h-3 mr-1 animate-spin" /> Accepting
            </Show>
          </button>
        </Match>
        <Match when={props.swap.state === "adaptor-pending"}>
          <div class="flex items-center">
            <LucideHourglass class="w-3 h-3 mr-1" /> Waiting adaptor
          </div>
        </Match>
        <Match when={props.swap.state === "given-pending"}>
          <button
            onClick={publishGivenEvent}
            disabled={isPublishing()}
            class="flex items-center justify-center bg-gradient-to-br from-primary to-accent text-primary-foreground drop-shadow text-white px-2 py-1 rounded-md w-full"
          >
            <Show when={isPublishing()} fallback="Publish GM">
              <LucideLoader class="w-4 h-4 animate-spin" />
              Publishing
            </Show>
          </button>
        </Match>
        <Match when={props.swap.state === "taken-pending"}>
          <div class="flex items-center">
            <LucideHourglass class="w-3 h-3 mr-1" /> Pending publishing
          </div>
        </Match>
        <Match when={props.swap.state === "completed"}>
          <div class="flex items-center">Swap completed!</div>
        </Match>
      </Switch>
    </div>
  );
}
