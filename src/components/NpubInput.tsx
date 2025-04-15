import { ProfileQuery } from "applesauce-core/queries";
import { LucideLoader, LucideSearch, LucideX } from "lucide-solid";
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
import { profileName, truncatedNpub } from "~/lib/utils";
import ProfilePicture from "./ProfilePicture";

export default function NpubInput(props: {
  npub: string;
  onChange: (value: string) => void;
}) {
  const rxReq = createRxForwardReq();
  let debounceTimer: NodeJS.Timeout;
  const [isSearching, setIsSearching] = createSignal(false);
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

  async function handleSearch(query: string) {
    if (!query || query.length === 0) return;

    setSearchResults([]);
    setIsSearching(true);
    setIsFocused(true);

    await actions.exec(SearchPubkeys, query).forEach((event: NostrEvent) => {
      rxNostrDVM.send(event).subscribe((packet) => {
        // Subscribe to the DVM response
        rxReq.emit([
          {
            kinds: [KINDS.SEARCH_RESPONSE],
            "#e": [event.id],
          },
        ]);
      });
    });
  }

  createEffect(() => {
    if (props.npub === "") {
      clearTimeout(debounceTimer);
    }
  });

  const handleChange = (value: string) => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      setIsFocused(false);

      if (value.startsWith("npub") || value === "") {
        props.onChange(value);
      } else if (value.length >= 3) {
        handleSearch(value);
      }
    }, 500);
  };

  onCleanup(() => {
    clearTimeout(debounceTimer);
  });

  function handleSelect(pubkey: string) {
    props.onChange(nip19.npubEncode(pubkey));
  }

  function handleClearInput() {
    props.onChange("");
  }

  const resultsAreVisible = createMemo(() => {
    return isFocused() && searchResults() && searchResults().length > 0;
  });

  return (
    <div class="relative flex flex-col max-w-sm w-full">
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
          autocomplete="off"
        />
        {isSearching() && (
          <LucideLoader class="w-4 h-4 absolute right-3 text-gray-400 animate-spin" />
        )}
        {props.npub && props.npub.length > 0 && (
          <button
            onClick={handleClearInput}
            class="absolute right-2 bg-secondary rounded-full p-0.5"
          >
            <LucideX class="w-4 h-4 text-red-600" />
          </button>
        )}
      </TextField>
      <Show when={resultsAreVisible()}>
        <div class="absolute mt-10 w-full">
          <div class="bg-white rounded-b-md shadow-md py-1 border border-t-0">
            <For each={searchResults()}>
              {(result) => (
                <button
                  class="flex flex-row items-center py-2 px-3 w-full"
                  onClick={() => handleSelect(result.pubkey)}
                >
                  <div class="flex mr-4 w-8">
                    <ProfilePicture {...result} />
                  </div>
                  <div class="flex flex-col text-left overflow-hidden w-full">
                    <p class="text-sm truncate max-w-full">
                      {profileName(result.profile(), result.pubkey)}
                    </p>
                    <p class="flex text-sm text-gray-500 truncate max-w-full">
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
