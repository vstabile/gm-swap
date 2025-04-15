import { ProfileContent } from "applesauce-core/helpers";
import { ProfileQuery } from "applesauce-core/queries";
import { EventTemplate, nip19 } from "nostr-tools";
import { createEffect, createMemo, createSignal, from, Show } from "solid-js";
import { replaceableLoader } from "~/lib/loaders";
import { queryStore } from "~/lib/stores";
import { fromReactive, profileName, truncatedNpub } from "~/lib/utils";
import ProfilePicture from "./ProfilePicture";

export function PreviewCard(props: { note: EventTemplate; pubkey: string }) {
  const profile = fromReactive(() =>
    queryStore.createQuery(ProfileQuery, props.pubkey)
  );
  const [npubProfiles, setNpubProfiles] = createSignal(
    new Map<string, ProfileContent>()
  );

  createEffect(async () => {
    replaceableLoader.next({
      pubkey: props.pubkey,
      kind: 0,
    });
  });

  // Load profiles for npubs in content
  createEffect(() => {
    const npubMatches =
      props.note.content.match(/nostr:npub1[a-zA-Z0-9]+/g) || [];

    for (const match of npubMatches) {
      const npub = match.replace("nostr:", "");
      try {
        const pubkey = nip19.decode(npub).data as string;
        const profile = from(queryStore.createQuery(ProfileQuery, pubkey));

        replaceableLoader.next({
          pubkey,
          kind: 0,
        });

        // Store the profile in our map
        setNpubProfiles((prev) => new Map(prev).set(npub, profile()));
      } catch (error) {
        console.error(error);
      }
    }
  });

  const formatedContent = createMemo(() => {
    return props.note.content.replace(/nostr:npub1[a-zA-Z0-9]+/g, (match) => {
      const npub = match.replace("nostr:", "");
      const profile = npubProfiles().get(npub);
      const displayName =
        profile?.display_name || profile?.name || truncatedNpub(npub);

      return `<a href="https://njump.me/${npub}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline">${displayName}</a>`;
    });
  });

  return (
    <div class="flex flex-col border border-gray-200 rounded-md p-3 bg-white max-w-sm w-full">
      <div class="flex flex-row items-center mb-2">
        <ProfilePicture profile={profile} pubkey={props.pubkey} />
        <span class="mr-2">{profileName(profile(), props.pubkey)}</span>
        <Show when={profile()?.nip05}>
          <span class="text-sm text-muted-foreground">{profile().nip05}</span>
        </Show>
      </div>
      <div innerHTML={formatedContent()}></div>
    </div>
  );
}
