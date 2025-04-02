import {
  createEffect,
  createMemo,
  createSignal,
  from,
  Match,
  Switch,
} from "solid-js";
import { accounts } from "../lib/accounts";
import { replaceableLoader } from "../lib/loaders";
import { of, switchMap } from "rxjs";
import { queryStore, userStore } from "../lib/stores";
import { ProfileQuery } from "applesauce-core/queries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import { LucideLogOut } from "lucide-solid";
import { truncatedNpub } from "../lib/utils";

export default function User() {
  const account = from(accounts.active$);

  const signout = () => {
    // do nothing if the user is not signed in
    if (!accounts.active) return;

    // signout the user
    userStore.clear();
    const account = accounts.active;
    accounts.removeAccount(account);
    accounts.clearActive();
  };

  // fetch the user's profile when they sign in
  createEffect(async () => {
    const active = account();

    if (active) {
      // get the user's relays or fallback to some default relays
      const usersRelays = await active.getRelays?.();
      const relays = usersRelays
        ? Object.keys(usersRelays)
        : ["wss://relay.damus.io", "wss://nos.lol", "wss://purplepag.es"];

      // tell the loader to fetch the users profile event
      replaceableLoader.next({
        pubkey: active.pubkey,
        kind: 0,
        relays,
      });
    }
  });

  // subscribe to the active account, then subscribe to the users profile or undefined
  const profile = from(
    accounts.active$.pipe(
      switchMap((account) =>
        account
          ? queryStore.createQuery(ProfileQuery, account!.pubkey)
          : of(undefined)
      )
    )
  );

  const displayNpub = createMemo(() => truncatedNpub(account()!.pubkey));

  const [settingsIsOpen, setSettingsIsOpen] = createSignal(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Switch>
            <Match when={account() && profile()}>
              <img
                src={
                  profile()?.picture ||
                  "https://robohash.org/" + account()?.pubkey
                }
                class="h-8 w-8 rounded-full"
              />
            </Match>
            <Match when={!profile()}>
              <img
                src={"https://robohash.org/" + account()?.pubkey}
                class="h-8 w-8 rounded-full"
              />
            </Match>
          </Switch>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="bg-white">
          <DropdownMenuLabel>
            {profile()?.display_name || (
              <span class="text-xs">{displayNpub()}</span>
            )}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signout}>
            <LucideLogOut class="w-4 h-4 text-gray-600" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
