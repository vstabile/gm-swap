import { createEffect, from } from "solid-js";
import { accounts } from "../lib/accounts";
import { replaceableLoader } from "../lib/loaders";
import { of, switchMap } from "rxjs";
import { queryStore } from "~/stores/queryStore";
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
import { useAuth } from "~/contexts/authContext";

export default function User() {
  const account = from(accounts.active$);
  const { signOut } = useAuth();

  const handleSignOut = () => {
    signOut();
  };

  // fetch the user's profile when they sign in
  createEffect(async () => {
    const active = account();
    if (!active?.pubkey) return;

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
    <DropdownMenu>
      <DropdownMenuTrigger class="outline-none">
        <div class="flex items-center gap-2">
          <div class="h-8 w-8 rounded-full overflow-hidden">
            <ProfilePicture profile={profile} pubkey={account()?.pubkey} />
          </div>
          <span class="font-medium hidden sm:inline">
            {profile() && account()
              ? profileName(profile(), account()!.pubkey)
              : account()?.pubkey.slice(0, 4) +
                "..." +
                account()?.pubkey.slice(-4)}
          </span>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LucideLogOut class="mr-2 h-4 w-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
