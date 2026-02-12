import { MutableRefObject, useRef } from "react";
import { main } from "../../../wailsjs/go/models";
import { CalibrationModalForm } from "./CalibrationModalForm";

type Props = {
  dialogRef: MutableRefObject<HTMLDialogElement | null>;
  controller: main.Interop_GenericController | null;
};

export const CalibrationModal = ({ dialogRef, controller }: Props) => {
  const ref = useRef<HTMLDialogElement | null>(null);

  const handleRef = (d: HTMLDialogElement | null) => {
    ref.current = d;
    dialogRef.current = d;
  };

  const handleClose = () => {
    ref.current?.close();
  };

  return (
    <dialog ref={handleRef} className="modal modal-s">
      <div className="modal-box w-11/12 max-w-5xl">
        {!!controller && (
          <CalibrationModalForm
            key={controller.UniqueID}
            controller={controller}
            onClose={handleClose}
          />
        )}
      </div>
    </dialog>
  );
};
