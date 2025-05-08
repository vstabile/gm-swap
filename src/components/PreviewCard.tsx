import { ProfileQuery } from "applesauce-core/queries";
import { EventTemplate } from "nostr-tools";
import { createEffect, Show } from "solid-js";
import { replaceableLoader } from "~/lib/loaders";
import { queryStore } from "~/stores/queryStore";
import { formatContent, fromReactive, profileName } from "~/lib/utils";
import ProfilePicture from "./ProfilePicture";

export function PreviewCard(props: { note: EventTemplate; pubkey: string }) {
  const profile = fromReactive(() =>
    queryStore.createQuery(ProfileQuery, props.pubkey)
  );

  createEffect(async () => {
    replaceableLoader.next({
      pubkey: props.pubkey,
      kind: 0,
    });
  });

  return (
    <div class="flex flex-col border border-gray-200 rounded-md p-3 bg-white max-w-sm w-full">
      <div class="flex flex-row items-center mb-2 w-full overflow-hidden">
        <div class="h-6 w-6 rounded-full overflow-hidden flex-shrink-0">
          <ProfilePicture profile={profile} pubkey={props.pubkey} />
        </div>
        <span class="flex ml-2 max-w-full truncate">
          {profileName(profile(), props.pubkey)}
        </span>
        <Show when={profile()?.nip05}>
          <span class="flex flex-1 text-sm text-muted-foreground max-w-full truncate ml-2">
            {profile().nip05}
          </span>
        </Show>
      </div>
      <div innerHTML={formatContent(props.note.content)}></div>
    </div>
  );
}
