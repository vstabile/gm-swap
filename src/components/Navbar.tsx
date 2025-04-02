import { from, Show } from "solid-js";
import { accounts } from "../lib/accounts";
import User from "./User";

export default function Navbar() {
  const account = from(accounts.active$);

  return (
    <div class="flex justify-end px-4 sm:px-6 py-4 absolute top-0 right-0">
      <Show when={account()}>
        <div class="flex items-center gap-4">
          <User />
        </div>
      </Show>
    </div>
  );
}
