import { useEffect, useRef } from "react";
import { t } from "../../utils/t";
import QrScanner from "qr-scanner";

type Props = {
  open: boolean;
  onClose: () => void;
};

export const ConnectModal = ({ open, onClose }: Props) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleClose = () => {
    onClose();
  };

  useEffect(() => {
    if (dialogRef.current) {
      if (open && !dialogRef.current.open) {
        dialogRef.current.showModal();
      } else if (!open && dialogRef.current.open) {
        dialogRef.current.close();
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open || !videoRef.current) return;
    // To enforce the use of the new api with detailed scan results, call the constructor with an options object, see below.
    const qrScanner = new QrScanner(
      videoRef.current,
      (result) => console.log("decoded qr code:", result),
      {},
    );
    qrScanner.start().catch(console.log);
    console.log(videoRef.current);
    return () => qrScanner.destroy();
  }, [open]);

  return (
    <dialog ref={dialogRef} className="modal" onClose={handleClose}>
      <div className="modal-box flex flex-col gap-2">
        <h3 className="text-lg font-bold">
          {t("Connect to TSW Controller Utility app")}
        </h3>
        <div>
          <button
            onClick={() => navigator.mediaDevices.getUserMedia({ video: true })}
          >c</button>
          <video ref={videoRef} className="w-full h-60"></video>
        </div>
        <div className="modal-action">
          <form method="dialog">
            <button type="submit" className="btn btn-sm">
              {t("Cancel")}
            </button>
          </form>
        </div>
      </div>
    </dialog>
  );
};
