import { Accessor, createMemo, createSignal, from, Show } from "solid-js";
import NpubInput from "./NpubInput";
import ProposalPreview from "./ProposalPreview";
import { nip19, NostrEvent } from "nostr-tools";
import { accounts } from "~/lib/accounts";
import { Button } from "./ui/button";
import { LucideLoader } from "lucide-solid";
import { actions, Proposal, Propose } from "~/lib/actions";
import { eventStore } from "~/lib/stores";
import { rxNostr } from "~/lib/nostr";

export default function CreateProposal() {
  const [npub, setNpub] = createSignal<string>();
  const [isSubmitting, setIsSubmitting] = createSignal(false);
  const [searchError, setSearchError] = createSignal<string | undefined>();

  const account = from(accounts.active$);

  const myNpub = createMemo(() => {
    if (!account()) return undefined;
    return nip19.npubEncode(account()!.pubkey);
  });

  const pubkey = createMemo(() => {
    let pubkey = undefined;
    try {
      pubkey = nip19.decode(npub()!).data;
    } catch (e) {}

    return pubkey;
  });

  const proposal: Accessor<Proposal | undefined> = createMemo(() => {
    if (!pubkey() || !myNpub()) return undefined;

    const created_at = Math.floor(Date.now() / 1000) + 60 * 10; // 10 minutes from now

    return {
      give: {
        type: "nostr" as const,
        template: {
          kind: 1,
          content: "GM nostr:" + npub() + "!",
          tags: [["p", pubkey()]],
          created_at,
        },
      },
      take: {
        type: "nostr" as const,
        template: {
          kind: 1,
          content: "GM nostr:" + myNpub() + "!",
          tags: [["p", account()!.pubkey]],
          created_at,
        },
      },
    };
  });

  async function handleSubmit() {
    setIsSubmitting(true);

    await actions
      .exec(Propose, pubkey(), proposal())
      .forEach((event: NostrEvent) => {
        eventStore.add(event);
        rxNostr.send(event);
      });

    setIsSubmitting(false);
    setNpub("");
  }

  return (
    <>
      <NpubInput
        npub={npub()}
        onChange={(value) => setNpub(value)}
        onSearchError={(error) => setSearchError(error)}
      />
      <Show when={pubkey() && npub() !== myNpub()}>
        <div class="flex mt-4 w-full">
          <ProposalPreview proposal={proposal()} />
        </div>
        <Button
          class="w-full mt-4 max-w-sm"
          onClick={handleSubmit}
          disabled={isSubmitting()}
        >
          <Show when={isSubmitting()} fallback="Propose Swap">
            <LucideLoader class="w-4 h-4 animate-spin" />
          </Show>
        </Button>
      </Show>
      <Show when={npub() && !pubkey()}>
        <div class="mt-4 w-full text-center text-sm text-red-600">
          <p>This npub is not valid...</p>
        </div>
      </Show>
      <Show when={npub() === myNpub()}>
        <div class="mt-4 w-full text-center text-sm text-red-600">
          <p>You should exchange GMs with others...</p>
        </div>
      </Show>
      <Show when={searchError()}>
        <div class="mt-4 w-full text-center text-sm text-red-600">
          <p>{searchError()}</p>
        </div>
      </Show>
    </>
  );
}
