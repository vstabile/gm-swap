import { createEffect, from } from "solid-js";
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
import { profileName } from "../lib/utils";
import ProfilePicture from "./ProfilePicture";
import { clearSession } from "~/stores/session";

export default function User() {
  const account = from(accounts.active$);

  const signout = () => {
    // do nothing if the user is not signed in
    if (!accounts.active) return;

    // signout the user
    const account = accounts.active;
    accounts.removeAccount(account);
    accounts.clearActive();

    clearSession();
  };

  // fetch the user's profile when they sign in
  createEffect(async () => {
    const active = account();

    replaceableLoader.next({
      pubkey: active.pubkey,
      kind: 0,
    });
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

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <div class="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
            <ProfilePicture profile={profile} pubkey={account()?.pubkey} />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="bg-white">
          <DropdownMenuLabel>
            {profileName(profile(), account()?.pubkey)}
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
