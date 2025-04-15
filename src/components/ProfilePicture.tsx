import { ProfileContent } from "applesauce-core/helpers";
import { Accessor } from "solid-js";

type ProfilePictureProps = {
  profile: Accessor<ProfileContent>;
  pubkey: string;
};

export default function ProfilePicture(props: ProfilePictureProps) {
  return (
    <img
      src={props.profile()?.picture || "https://robohash.org/" + props.pubkey}
      class="h-8 w-8 rounded-full mr-2 object-cover"
    />
  );
}
