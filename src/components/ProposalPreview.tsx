import { PreviewCard } from "./PreviewCard";
import { LucideArrowRightLeft, LucideArrowUpDown } from "lucide-solid";
import { Proposal } from "~/lib/actions";

export default function ProposalPreview(props: { proposal: Proposal }) {
  if (
    props.proposal.request.type !== "nostr" ||
    props.proposal.offer.type !== "nostr"
  ) {
    return <div>Invalid proposal</div>;
  }

  const recipient = props.proposal.offer.template.tags.find(
    (t) => t[0] === "p"
  )?.[1];
  const proposer = props.proposal.request.template.tags.find(
    (t) => t[0] === "p"
  )?.[1];

  return (
    <div class="flex flex-col xl:flex-row gap-2 w-full justify-center items-center">
      <PreviewCard note={props.proposal.request.template} pubkey={recipient} />
      <div class="flex items-center justify-center">
        <LucideArrowUpDown class="w-5 h-5 xl:hidden" />
        <LucideArrowRightLeft class="w-5 h-5 hidden xl:block" />
      </div>
      <PreviewCard note={props.proposal.offer.template} pubkey={proposer} />
    </div>
  );
}
