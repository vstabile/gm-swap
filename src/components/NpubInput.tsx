import { ProfileQuery } from "applesauce-core/queries";
import { LucideLoader, LucideSearch } from "lucide-solid";
import { nip19, NostrEvent } from "nostr-tools";
import { createRxForwardReq } from "rx-nostr";
import {
  createEffect,
  createMemo,
  createSignal,
  For,
  from,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import { actions, SearchPubkeys } from "~/lib/actions";
import { replaceableLoader } from "~/lib/loaders";
import { KINDS, rxNostrDVM } from "~/lib/nostr";
import { queryStore, SearchResults } from "~/lib/stores";
import { truncatedNpub } from "~/lib/utils";

export default function NpubInput(props: {
  npub: string;
  onChange: (value: string) => void;
}) {
  const rxReq = createRxForwardReq();
  let debounceTimer: NodeJS.Timeout;
  const [isSearching, setIsSearching] = createSignal(false);
  const [query, setQuery] = createSignal<string | null>(null);
  const [searchResults, setSearchResults] = createSignal<SearchResults>([]);
  const [isFocused, setIsFocused] = createSignal(false);

  onMount(() => {
    // Handle the Search DVM response
    const subscription = rxNostrDVM.use(rxReq).subscribe(({ event }) => {
      try {
        const results = JSON.parse(event.content).map(
          (result: { pubkey: string; rank: number }) => {
            replaceableLoader.next({
              pubkey: result.pubkey,
              kind: 0,
            });

            return {
              pubkey: result.pubkey,
              profile: from(
                queryStore.createQuery(ProfileQuery, result.pubkey)
              ),
            };
          }
        );
        setIsSearching(false);
        setSearchResults(results);
      } catch (error) {
        console.error("Error parsing DVM response", error);
      }
    });

    onCleanup(() => subscription.unsubscribe());
  });

  createEffect(async () => {
    if (!query()) return;

    await actions.exec(SearchPubkeys, query()).forEach((event: NostrEvent) => {
      // Subscribe to the DVM response
      rxNostrDVM.send(event);
      setTimeout(() => {
        rxReq.emit([
          {
            kinds: [KINDS.SEARCH_RESPONSE],
            "#e": [event.id],
          },
        ]);
      }, 500);
    });
  });

  createEffect(() => {
    if (props.npub === "") {
      clearTimeout(debounceTimer);
    }
  });

  const handleChange = (value: string) => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      if (value.startsWith("npub")) {
        props.onChange(value);
        setIsFocused(false);
        setIsSearching(false);
      } else if (value.length === 0) {
        props.onChange("");
        setIsFocused(false);
        setIsSearching(false);
      } else {
        setIsSearching(true);
        setIsFocused(true);
        setSearchResults([]);
        setQuery(value);
      }
    }, 500);
  };

  onCleanup(() => {
    clearTimeout(debounceTimer);
  });

  function handleSelect(pubkey: string) {
    props.onChange(nip19.npubEncode(pubkey));
  }

  const resultsAreVisible = createMemo(() => {
    return isFocused() && searchResults() && searchResults().length > 0;
  });

  return (
    <div class="flex flex-col max-w-sm w-full">
      <TextField class="relative flex items-center flex-row w-full">
        <LucideSearch class="w-4 h-4 absolute left-3 text-gray-400" />
        <TextFieldInput
          type="text"
          id="npub"
          placeholder="Who do you want to swap GM with?"
          class={
            (resultsAreVisible() ? "rounded-b-none" : "") + " bg-white pl-9"
          }
          value={props.npub}
          onInput={(e) => handleChange((e.target as HTMLInputElement).value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Small delay to allow clicking on results
            setTimeout(() => setIsFocused(false), 200);
          }}
        />
        {isSearching() && (
          <LucideLoader class="w-4 h-4 absolute right-3 text-gray-400 animate-spin" />
        )}
      </TextField>
      <Show when={resultsAreVisible()}>
        <div class="absolute mt-10 w-full max-w-sm">
          <div class="bg-white rounded-b-md shadow-md py-1">
            <For each={searchResults()}>
              {(result) => (
                <button
                  class="flex flex-row items-center py-2 px-3 w-full"
                  onClick={() => handleSelect(result.pubkey)}
                >
                  <div class="flex mr-4 w-8">
                    <img
                      src={
                        result.profile()?.picture ||
                        "https://robohash.org/" + result.pubkey
                      }
                      class="h-8 w-8 rounded-full mr-2 object-cover"
                    />
                  </div>
                  <div class="flex flex-col text-left">
                    <p class="text-sm">
                      {result.profile()
                        ? result.profile().name
                        : truncatedNpub(result.pubkey)}
                    </p>
                    <p class="text-sm text-gray-500">
                      {result.profile() && result.profile().nip05}
                    </p>
                  </div>
                </button>
              )}
            </For>
          </div>
        </div>
      </Show>
    </div>
  );
}
