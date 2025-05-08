import { Swap } from "~/queries/swap";
import ProfilePicture from "./ProfilePicture";
import { formatContent, formatDate, profileName } from "~/lib/utils";
import { createEffect, createMemo, from, Show } from "solid-js";
import { replaceableLoader } from "~/lib/loaders";
import { queryStore } from "~/stores/queryStore";
import { ProfileQuery } from "applesauce-core/queries";
import { nip19 } from "nostr-tools";
import { LucideExternalLink } from "lucide-solid";

type SwapSideProps = {
  pubkey: string;
  swap: Swap;
};

export function SwapSide(props: SwapSideProps) {
  const content = JSON.parse(props.swap.proposal.content);
  const template =
    props.swap.proposer === props.pubkey
      ? content["give"].template
      : content["take"].template;

  const profile = from(queryStore.createQuery(ProfileQuery, props.pubkey));

  createEffect(() => {
    replaceableLoader.next({
      pubkey: props.pubkey,
      kind: 0,
    });
  });

  const event = createMemo(() => {
    return props.pubkey === props.swap.proposer
      ? props.swap.given
      : props.swap.taken;
  });

  return (
    <div class="flex flex-col w-full">
      <div class="flex flex-col w-full py-3 px-3">
        <div class="flex flex-row items-center mb-2">
          <div class="h-5 w-5 rounded-full overflow-hidden flex-shrink-0">
            <ProfilePicture profile={profile} pubkey={props.pubkey} />
          </div>
          <span class="flex-grow ml-2 truncate">
            {profileName(profile(), props.pubkey)}
          </span>
          <Show when={event()}>
            <a
              href={
                "https://njump.me/" + nip19.neventEncode({ id: event().id })
              }
              class="flex text-primary items-center text-xs"
              target="_blank"
            >
              <LucideExternalLink class="w-4 h-4" />
            </a>
          </Show>
        </div>
        <div innerHTML={formatContent(template.content)} />
        <div class="text-[10px] text-gray-400 mt-1">
          {formatDate(template.created_at)}
        </div>
      </div>
    </div>
  );
}
