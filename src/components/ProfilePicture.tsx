import { ProfileContent } from "applesauce-core/helpers";
import { Accessor } from "solid-js";

type ProfilePictureProps = {
  profile: Accessor<ProfileContent>;
  pubkey: string;
};

function fallbackImage(pubkey: string) {
  return "https://robohash.org/" + pubkey;
}

export default function ProfilePicture(props: ProfilePictureProps) {
  return (
    <div class="h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
      <img
        src={props.profile()?.picture || fallbackImage(props.pubkey)}
        class="h-full w-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).src = fallbackImage(props.pubkey);
        }}
      />
    </div>
  );
}
