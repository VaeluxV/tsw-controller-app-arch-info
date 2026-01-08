import { MutableRefObject, useRef } from "react";
import useSWR from "swr";
import QRCode from "react-qr-code";
import { GetDeviceIP } from "../../../../wailsjs/go/main/App";
import { BrowserOpenURL } from "../../../../wailsjs/runtime/runtime";

type Props = {
  dialogRef: MutableRefObject<HTMLDialogElement | null>;
};

export const ConnectRemoteControllerModal = ({ dialogRef }: Props) => {
  const ref = useRef<HTMLDialogElement | null>(null);
  const {
    isLoading: isLoadingDeviceIP,
    data: deviceIP,
    error: deviceIPError,
  } = useSWR("device-ip", () => GetDeviceIP());

  const handleRef = (d: HTMLDialogElement | null) => {
    ref.current = d;
    dialogRef.current = d;
  };

  const handleOpenAppLink = () => {
    BrowserOpenURL(
      "https://github.com/LiamMartens/tsw-controller-app/releases",
    );
  };

  return (
    <dialog ref={handleRef} className="modal modal-s">
      <div className="modal-box w-11/12 max-w-5xl">
        <form method="dialog">
          <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">
            ✕
          </button>
        </form>

        <div>
          <div className="flex justify-center">
            {!isLoadingDeviceIP && deviceIP && (
              <div className="p-4 bg-white rounded-md">
                <QRCode
                  value={JSON.stringify({
                    connection: {
                      ip: deviceIP,
                      port: 63241,
                    },
                  })}
                />
              </div>
            )}
          </div>
          <div className="alert mt-2">
            <span>
              Use the{" "}
              <button className="link" onClick={handleOpenAppLink}>
                TSW Virtual Controller app
              </button>{" "}
              to scan the QR code and connect your android device.
            </span>
          </div>
          {!!deviceIPError && (
            <div className="alert alert-error">{String(deviceIPError)}</div>
          )}
        </div>
      </div>
    </dialog>
  );
};
