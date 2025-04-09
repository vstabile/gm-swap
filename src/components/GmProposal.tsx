import { ProfileQuery } from "applesauce-core/queries";
import { NostrEvent } from "nostr-tools";
import { createEffect, from } from "solid-js";
import { replaceableLoader } from "~/lib/loaders";
import { queryStore } from "~/lib/stores";
import { truncatedNpub } from "~/lib/utils";
import { SignatureTemplate } from "~/lib/actions";
import ProposalStatus from "./ProposalStatus";

function isGM(content: string): boolean {
  const gmPattern = /^GM nostr:npub1[a-zA-Z0-9]+!$/;

  return gmPattern.test(content);
}

function signatureType(give: SignatureTemplate) {
  if (give["type"] === "nostr" && isGM(give["template"].content)) {
    return "GM";
  } else if (give["type"] === "nostr") {
    return "Event";
  } else if (give["type"] === "cashu") {
    return "Cashu";
  } else {
    return "?";
  }
}

export default function GmProposal(props: { proposal: NostrEvent }) {
  const proposer = props.proposal.pubkey;
  const counterparty = props.proposal.tags.find((t) => t[0] === "p")?.[1];
  const content = JSON.parse(props.proposal.content);
  const give = content["give"];
  const take = content["take"];

  createEffect(() => {
    // Load proposer profile
    replaceableLoader.next({
      pubkey: proposer,
      kind: 0,
    });

    // Load counterparty profile
    replaceableLoader.next({
      pubkey: counterparty,
      kind: 0,
    });
  });

  const proposerProfile = from(queryStore.createQuery(ProfileQuery, proposer));

  const counterpartyProfile = from(
    queryStore.createQuery(ProfileQuery, counterparty)
  );

  return (
    <div class="flex flex-col bg-white rounded-lg py-3 px-4 border border-gray-200 text-sm">
      <div class=" text-center text-xs text-gray-400 pb-2 w-full">
        {new Date(props.proposal.created_at * 1000).toLocaleString()}
      </div>
      {/* Swap */}
      <div class="flex flex-row justify-between">
        {/* Give */}
        <div class="flex w-full justify-start">
          <div class="flex flex-row items-center">
            <img
              src={
                proposerProfile()?.picture || "https://robohash.org/" + proposer
              }
              class="h-5 w-5 rounded-full mr-2"
            />
            <span class="truncate">
              {proposerProfile()?.display_name ||
                proposerProfile()?.name ||
                truncatedNpub(proposer)}
            </span>
            <span class="text-gray-400 ml-1 ">wants</span>
          </div>
        </div>
        {/* For */}
        <div class="flex flex-col text-center px-2">
          <div class="flex flex-row items-center justify-center">
            <span class="font-bold">{signatureType(give)}</span>
            <span class="text-gray-400 mx-2">for</span>
            <span class="font-bold">{signatureType(take)}</span>
          </div>
        </div>
        {/* Take */}
        <div class="flex w-full justify-end">
          <div class="flex flex-row items-center">
            <span class="text-gray-400 mr-1">from</span>
            <span class="truncate">
              {counterpartyProfile()?.display_name ||
                counterpartyProfile()?.name ||
                truncatedNpub(counterparty)}
            </span>
            <img
              src={
                counterpartyProfile()?.picture ||
                "https://robohash.org/" + counterparty
              }
              class="h-5 w-5 rounded-full ml-2"
            />
          </div>
        </div>
      </div>
      {/* Actions */}
      <div class="flex flex-row w-full mt-4">
        <div class="flex w-full text-center justify-center">
          <ProposalStatus proposal={props.proposal} />
        </div>
      </div>
    </div>
  );
}
