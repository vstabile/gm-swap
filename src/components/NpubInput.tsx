import { ProfileQuery } from "applesauce-core/queries";
import { LucideLoader, LucideSearch, LucideX } from "lucide-solid";
import { nip19 } from "nostr-tools";
import { createRxForwardReq } from "rx-nostr";
import {
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
import { DVM_RELAY, KINDS, rxNostr } from "~/lib/nostr";
import { queryStore } from "~/lib/stores";
import { profileName } from "~/lib/utils";
import ProfilePicture from "./ProfilePicture";
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  firstValueFrom,
  map,
  merge,
  partition,
  share,
  Subject,
  tap,
} from "rxjs";

export default function NpubInput(props: {
  npub: string;
  onChange: (value: string) => void;
  onSearchError: (error: string | undefined) => void;
}) {
  const rxReq = createRxForwardReq();
  const [isFocused, setIsFocused] = createSignal(false);

  const inputChanges$ = new Subject<string>();
  const isSearching$ = new Subject<boolean>();

  const isSearching = from(isSearching$);

  // Handle search result and feedback events separately
  const [jobResult$, jobFeedback$] = partition(
    rxNostr.use(rxReq, { on: { relays: [DVM_RELAY] } }).pipe(share()),
    ({ event }) => event.kind === KINDS.SEARCH_RESULT
  );

  const searchResult$ = merge(
    isSearching$.pipe(
      filter(Boolean),
      map(() => [])
    ),
    jobResult$.pipe(
      map(({ event }) => {
        isSearching$.next(false);

        try {
          return JSON.parse(event.content).map(
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
        } catch (error) {
          console.error("Error parsing DVM response", error);
          return [];
        }
      })
    )
  );

  const searchResult = from(searchResult$);

  from(
    jobFeedback$.pipe(
      tap(({ event }) => {
        isSearching$.next(false);
        const status = event.tags
          .find((tag) => tag[0] === "status")
          ?.join(": ");
        props.onSearchError("Search is not working, insert a valid npub.");
        console.error("JOB_FEEDBACK", status, event);
      })
    )
  );

  onMount(() => {
    // Handle the input changes and search requests
    const inputSubscription = inputChanges$
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        filter((value) => {
          if (value.startsWith("npub") || value === "") {
            props.onSearchError(undefined);
            props.onChange(value);
            setIsFocused(false);
            return false;
          }
          return value.length >= 3;
        })
      )
      .subscribe((query) => handleSearchRequest(query));

    onCleanup(() => {
      inputSubscription.unsubscribe();
      inputChanges$.complete();
      isSearching$.complete();
    });
  });

  async function handleSearchRequest(query: string) {
    isSearching$.next(true);
    setIsFocused(true);

    // Build and sign the Search job request event
    const event = await firstValueFrom(actions.exec(SearchPubkeys, query));

    // Subscribe to the job response
    rxReq.emit([
      {
        kinds: [KINDS.SEARCH_RESULT, KINDS.JOB_FEEDBACK],
        "#e": [event.id],
      },
    ]);

    // Workaround: wait rxNostr to hot swap the filters
    setTimeout(() => rxNostr.send(event, { on: { relays: [DVM_RELAY] } }), 200);
  }

  const showResults = createMemo(() => {
    return isFocused() && searchResult() && searchResult().length > 0;
  });

  return (
    <div class="relative flex flex-col max-w-sm w-full">
      <TextField class="relative flex items-center flex-row w-full">
        <LucideSearch class="w-4 h-4 absolute left-3 text-gray-400" />
        <TextFieldInput
          type="text"
          id="npub"
          placeholder="Who do you want to swap GMs with?"
          class={(showResults() ? "rounded-b-none" : "") + " bg-white pl-9"}
          value={props.npub}
          onInput={(e) =>
            inputChanges$.next((e.target as HTMLInputElement).value)
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
            onClick={() => {
              inputChanges$.next("");
              props.onChange("");
            }}
            class="absolute right-2 bg-secondary rounded-full p-0.5"
          >
            <LucideX class="w-4 h-4 text-red-600" />
          </button>
        )}
      </TextField>
      <Show when={showResults()}>
        <div class="absolute mt-10 w-full">
          <div class="bg-white rounded-b-md shadow-md py-1 border border-t-0">
            <For each={searchResult()}>
              {(result) => (
                <button
                  class="flex flex-row items-center py-2 px-3 w-full"
                  onClick={() =>
                    props.onChange(nip19.npubEncode(result.pubkey))
                  }
                >
                  <div class="flex mr-4 w-8">
                    <div class="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                      <ProfilePicture {...result} />
                    </div>
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
