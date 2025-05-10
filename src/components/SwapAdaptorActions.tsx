import { LucideHourglass, LucideLoader } from "lucide-solid";
import { createSignal, Match, Show, Switch } from "solid-js";
import { GenerateAdaptors } from "~/actions/generateAdaptors";
import { actions } from "~/actions/hub";
import { Swap } from "~/queries/swap";
import { SignTakenEvent } from "~/actions/signTakenEvent";
import { useAuth } from "~/contexts/authContext";
import { RevokeProposal } from "~/actions/revokeProposal";

export default function SwapAdaptorActions(props: { swap: Swap }) {
  const { state } = useAuth();
  const [isSendingAdaptor, setIsSendingAdaptor] = createSignal(false);
  const [isPublishing, setIsPublishing] = createSignal(false);
  const [isRevoking, setIsRevoking] = createSignal(false);

  async function sendAdaptor() {
    setIsSendingAdaptor(true);

    try {
      // Make sure we have an nsec
      if (!state.nsec) {
        throw new Error("No nsec available");
      }

      await actions.run(GenerateAdaptors, props.swap, state.nsec);
    } catch {
    } finally {
      setIsSendingAdaptor(false);
    }
  }

  async function publishTakenEvent() {
    setIsPublishing(true);

    try {
      await actions.run(SignTakenEvent, props.swap);
    } catch {
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleRevokeProposal() {
    setIsRevoking(true);

    try {
      await actions.run(RevokeProposal, props.swap.id);
    } catch {
    } finally {
      setIsRevoking(false);
    }
  }

  return (
    <div class="flex text-gray-400 text-xs px-3 py-2 justify-center w-full gap-2">
      <Switch>
        <Match when={props.swap.state === "nonce-pending"}>
          <div class="flex items-center w-full group">
            <div class="flex justify-center w-full items-center group-hover:hidden">
              <LucideHourglass class="w-3 h-3 mr-1" /> Waiting nonce
            </div>
            <button
              class="text-red-600 w-full group-hover:block hidden"
              onClick={handleRevokeProposal}
              disabled={isRevoking() || isSendingAdaptor()}
            >
              <Show when={isRevoking()} fallback="Revoke Proposal">
                <div class="flex justify-center items-center">
                  <LucideLoader class="w-4 h-4 animate-spin mr-1" />
                  Revoking
                </div>
              </Show>
            </button>
          </div>
        </Match>
        <Match when={props.swap.state === "adaptor-pending"}>
          <button
            class="flex items-center justify-center border-green-700 bg-gradient-to-br from-green-600 to-green-500 drop-shadow hover:from-green-600 hover:to-green-400 disabled:from-green-600/80 disabled:to-green-600/80 text-white px-2 py-1 rounded-md w-full"
            onClick={sendAdaptor}
            disabled={isSendingAdaptor() || isRevoking()}
          >
            <Show when={isSendingAdaptor()} fallback="Send Adaptor Signature">
              <LucideLoader class="w-3 h-3 mr-1 animate-spin" /> Sending
            </Show>
          </button>
          <button
            class="flex  items-center justify-center border border-red-600 text-red-600 px-2 py-1 rounded-md w-full hover:bg-red-600 hover:text-white disabled:bg-red-600/80 disabled:text-white"
            onClick={handleRevokeProposal}
            disabled={isRevoking() || isSendingAdaptor()}
          >
            <Show when={isRevoking()} fallback="Revoke Proposal">
              <LucideLoader class="w-4 h-4 animate-spin mr-1" />
              Revoking
            </Show>
          </button>
        </Match>
        <Match when={props.swap.state === "given-pending"}>
          <div class="flex items-center">
            <LucideHourglass class="w-3 h-3 mr-1" /> Waiting publishing
          </div>
        </Match>
        <Match when={props.swap.state === "taken-pending"}>
          <button
            onClick={publishTakenEvent}
            disabled={isPublishing()}
            class="flex items-center justify-center bg-gradient-to-br from-primary to-accent text-primary-foreground drop-shadow hover:from-primary/90 hover:to-primary/70 disabled:bg-primary/80 text-white px-2 py-1 rounded-md w-full"
          >
            <Show when={isPublishing()} fallback="Publish GM">
              <LucideLoader class="w-4 h-4 animate-spin" />
              Publishing
            </Show>
          </button>
        </Match>
        <Match when={props.swap.state === "completed"}>
          <div class="flex items-center">Swap completed!</div>
        </Match>
      </Switch>
    </div>
  );
}
