import { LucideSearch } from "lucide-solid";
import { createEffect, onCleanup } from "solid-js";
import { TextField, TextFieldInput } from "~/components/ui/text-field";

export default function NpubInput(props: {
  npub: string;
  onChange: (value: string) => void;
}) {
  let debounceTimer: NodeJS.Timeout;

  createEffect(() => {
    if (props.npub === "") {
      clearTimeout(debounceTimer);
    }
  });

  const handleChange = (value: string) => {
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
      props.onChange(value);
    }, 500);
  };

  onCleanup(() => {
    clearTimeout(debounceTimer);
  });

  return (
    <TextField class="relative flex items-center flex-row w-full max-w-sm">
      <LucideSearch class="w-4 h-4 absolute left-3 text-gray-400" />
      <TextFieldInput
        type="text"
        id="npub"
        placeholder="npub1..."
        class="bg-white pl-9"
        value={props.npub}
        onChange={(e) => handleChange(e.target.value)}
        onInput={(e) => handleChange((e.target as HTMLInputElement).value)}
      />
    </TextField>
  );
}
