import { createEffect, createSignal, onMount } from "solid-js";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import QRCode from "~/components/QRCode";
import { Button } from "~/components/ui/button";
import { TextField, TextFieldInput } from "~/components/ui/text-field";
import { NIP46_RELAY } from "~/lib/nostr";
import { LucideLoader, LucideClipboardCopy } from "lucide-solid";
import { useAuth } from "~/contexts/authContext";
import { generateSecretKey, nip19 } from "nostr-tools";

interface RemoteSignerDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export default function RemoteSignerDialog(props: RemoteSignerDialogProps) {
  const [bunkerUri, setBunkerUri] = createSignal("");
  const [relayUrl, setRelayUrl] = createSignal(NIP46_RELAY);
  const [bunkerIsLoading, setBunkerIsLoading] = createSignal(false);
  const nsec = nip19.nsecEncode(generateSecretKey());

  const {
    signIn,
    nostrConnectUri,
    setOnSignInSuccess,
    closeNip46Signer,
    remoteSignerRelay,
    setRemoteSignerRelay,
    connectWithBunker,
  } = useAuth();

  const handleBunkerConnect = () => {
    if (bunkerUri()) {
      connectWithBunker(bunkerUri());
      setBunkerIsLoading(true);
    }
  };

  const handleRelayChange = (newRelay: string) => {
    setRemoteSignerRelay(newRelay);
    closeNip46Signer();
    signIn("nip46", nsec, undefined, remoteSignerRelay());
  };

  onMount(() => {
    setOnSignInSuccess(() => {
      setBunkerIsLoading(false);
      setBunkerUri("");
      props.onOpenChange(false);
    });
  });

  createEffect(() => {
    if (props.isOpen) signIn("nip46", nsec, undefined, remoteSignerRelay());
  });

  return (
    <Dialog
      open={props.isOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          closeNip46Signer();
          setBunkerIsLoading(false);
        }
        props.onOpenChange(isOpen);
      }}
    >
      <DialogContent class="sm:max-w-lg bg-white">
        <div class="flex flex-col items-center justify-center">
          <h3 class="text-xl sm:text-2xl font-bold mb-4">
            Connect to Remote Signer
          </h3>
          <p class="mb-4 text-center">
            Scan this QR code with your NIP-46 remote signer.
          </p>

          <div class="bg-white rounded-lg shadow-md">
            <QRCode data={nostrConnectUri() || ""} width={240} height={240} />
            <div class="flex flex-row w-[240px] pt-0 p-2 gap-2">
              <TextField class="flex w-full">
                <TextFieldInput
                  type="text"
                  class=" bg-white text-gray-600 h-8"
                  placeholder="wss://relay.example.com/"
                  value={relayUrl()}
                  autocomplete="off"
                  onInput={(e) =>
                    setRelayUrl((e.target as HTMLInputElement).value)
                  }
                />
              </TextField>
              <Button
                class="flex p-3 h-8"
                variant="outline"
                onClick={() => handleRelayChange(relayUrl())}
                disabled={relayUrl() === remoteSignerRelay()}
              >
                Set
              </Button>
            </div>
          </div>
          <div class="mt-4 text-xs text-gray-500 break-all max-w-full overflow-hidden flex items-center gap-2">
            <span class="flex-1">{nostrConnectUri()}</span>
            <button
              class="p-1.5 hover:bg-gray-100 rounded-md transition-colors"
              onClick={() => {
                if (nostrConnectUri()) {
                  navigator.clipboard.writeText(nostrConnectUri());
                }
              }}
              title="Copy to clipboard"
            >
              <LucideClipboardCopy class="w-4 h-4" />
            </button>
          </div>

          <div class="flex items-center w-full my-4">
            <div class="flex-grow h-px bg-gray-300"></div>
            <span class="mx-4 text-gray-500 text-sm">OR</span>
            <div class="flex-grow h-px bg-gray-300"></div>
          </div>

          <p class="mb-4 text-center">
            Paste a bunker URI from your remote signer.
          </p>
          <div class="flex gap-2 w-full">
            <TextField class="w-full">
              <TextFieldInput
                type="text"
                class="bg-white"
                placeholder="bunker://..."
                value={bunkerUri()}
                autocomplete="off"
                onInput={(e) =>
                  setBunkerUri((e.target as HTMLInputElement).value)
                }
              />
            </TextField>
            <Button
              onClick={handleBunkerConnect}
              disabled={
                !bunkerUri().trim().startsWith("bunker://") || bunkerIsLoading()
              }
            >
              {bunkerIsLoading() ? (
                <LucideLoader class="animate-spin" />
              ) : (
                "Connect"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
