import { Show } from "solid-js";
import { Dialog, DialogContent } from "~/components/ui/dialog";
import QRCode from "~/components/QRCode";

interface NostrConnectDialogProps {
  uri?: string;
  onClose: () => void;
}

export default function NostrConnectDialog(props: NostrConnectDialogProps) {
  return (
    <Show when={props.uri}>
      <Dialog open={!!props.uri} onOpenChange={() => props.onClose()}>
        <DialogContent class="sm:max-w-md bg-white">
          <div class="flex flex-col items-center justify-center p-6">
            <h3 class="text-2xl font-bold mb-4">Connect to Remote Signer</h3>
            <p class="mb-6 text-center">
              Scan this QR code with your NIP-46 remote signer to connect.
            </p>
            <div class="p-2 bg-white rounded-lg shadow-md">
              <QRCode data={props.uri || ""} width={240} height={240} />
            </div>
            <div class="mt-4 text-sm text-gray-500 break-all max-w-full overflow-hidden">
              {props.uri}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Show>
  );
}
