import { PreviewCard } from "./PreviewCard";
import { LucideArrowRightLeft, LucideArrowUpDown } from "lucide-solid";
import { createMemo } from "solid-js";
import { SwapProposal } from "~/actions/proposeSwap";

export default function ProposalPreview(props: { proposal: SwapProposal }) {
  const recipient = createMemo(() => {
    if (props.proposal.give.type !== "nostr") return null;
    return props.proposal.give.template.tags.find((t) => t[0] === "p")?.[1];
  });

  const proposer = createMemo(() => {
    if (props.proposal.take.type !== "nostr") return null;
    return props.proposal.take.template.tags.find((t) => t[0] === "p")?.[1];
  });

  return props.proposal.take.type !== "nostr" ||
    props.proposal.give.type !== "nostr" ? (
    <div>Invalid proposal</div>
  ) : (
    <div class="flex flex-col xl:flex-row gap-2 w-full justify-center items-center">
      <PreviewCard note={props.proposal.take.template} pubkey={recipient()} />
      <div class="flex items-center justify-center">
        <LucideArrowUpDown class="w-5 h-5 xl:hidden" />
        <LucideArrowRightLeft class="w-5 h-5 hidden xl:block" />
      </div>
      <PreviewCard note={props.proposal.give.template} pubkey={proposer()} />
    </div>
  );
}
