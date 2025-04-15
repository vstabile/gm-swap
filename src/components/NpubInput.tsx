import { ProfileQuery } from "applesauce-core/queries";
import { LucideLoader, LucideSearch, LucideX } from "lucide-solid";
import { nip19, NostrEvent } from "nostr-tools";
import { createRxForwardReq } from "rx-nostr";
import {
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import { actions, SearchPubkeys } from "~/lib/actions";
import { replaceableLoader } from "~/lib/loaders";
import { DVM_RELAY, KINDS, rxNostr } from "~/lib/nostr";
import { queryStore, SearchResults } from "~/lib/stores";
import { fromReactive, profileName } from "~/lib/utils";
import ProfilePicture from "./ProfilePicture";
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  Subject,
} from "rxjs";

export default function NpubInput(props: {
  npub: string;
  onChange: (value: string) => void;
}) {
  const rxReq = createRxForwardReq();
  const [isSearching, setIsSearching] = createSignal(false);
  const [searchResults, setSearchResults] = createSignal<SearchResults>([]);
  const [isFocused, setIsFocused] = createSignal(false);

  const inputChanges = new Subject<string>();

  onMount(() => {
    // Handle the Search DVM response
    const searchSubscription = rxNostr
      .use(rxReq, { on: { relays: [DVM_RELAY] } })
      .subscribe(({ event }) => handleSearchResponse(event));

    // Handle the input changes and search requests
    const inputSubscription = inputChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        filter((value) => {
          if (value.startsWith("npub") || value === "") {
            props.onChange(value);
            setIsFocused(false);
            return false;
          }
          return value.length >= 3;
        })
      )
      .subscribe((query) => handleSearchRequest(query));

    onCleanup(() => {
      searchSubscription.unsubscribe();
      inputSubscription.unsubscribe();
      inputChanges.complete();
    });
  });

  function handleSearchResponse(event: NostrEvent) {
    try {
      const results = JSON.parse(event.content).map(
        (result: { pubkey: string; rank: number }) => {
          replaceableLoader.next({
            pubkey: result.pubkey,
            kind: 0,
          });

          return {
            pubkey: result.pubkey,
            profile: fromReactive(() =>
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
  }

  async function handleSearchRequest(query: string) {
    setSearchResults([]);
    setIsSearching(true);
    setIsFocused(true);

    // Build and sign the Search job request event
    const event = await firstValueFrom(actions.exec(SearchPubkeys, query));

    // Subscribe to the job response
    rxReq.emit([
      {
        kinds: [KINDS.SEARCH_RESPONSE],
        "#e": [event.id],
      },
    ]);

    // Workaround for some kind of racing condition
    setTimeout(() => rxNostr.send(event, { on: { relays: [DVM_RELAY] } }), 200);
  }

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
          onInput={(e) =>
            inputChanges.next((e.target as HTMLInputElement).value)
          }
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
