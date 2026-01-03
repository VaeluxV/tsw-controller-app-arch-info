import { useEffect, useRef, useState } from "react";
import { main } from "../../../wailsjs/go/models";
import useSWR from "swr";
import { GetControllers } from "../../../wailsjs/go/main/App";
import { CalibrationModal } from "./CalibrationModal";
import { EventsOn } from "../../../wailsjs/runtime/runtime";
import { events } from "../../events";

export const CalibrationTab = () => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [currentlyCalibratingController, setCurrentlyCalibratingController] =
    useState<main.Interop_GenericController | null>(null);
  const { data: controllers, mutate: refetchControllers } = useSWR(
    "controllers",
    () => GetControllers(),
    { revalidateOnMount: true },
  );

  const handleConfigure = (c: main.Interop_GenericController) => {
    setCurrentlyCalibratingController(c);
    dialogRef.current?.showModal();
  };

  useEffect(() => {
    return EventsOn(events.joydevices_updated, () => {
      refetchControllers();
    });
  }, []);

  return (
    <div>
      <ul className="list bg-base-100 rounded-box shadow-md">
        {controllers
          ?.filter((c) => !c.IsVirtual)
          .map((c) => (
            <li key={c.Name} className="list-row">
              <div className="list-col-grow">
                <div>{c.Name}</div>
              </div>
              <div>
                {c.IsConfigured && (
                  <div
                    className="tooltip tooltip-bottom"
                    data-tip="Re-configure"
                  >
                    <button
                      className="btn btn-success btn-soft btn-xs"
                      onClick={() => handleConfigure(c)}
                    >
                      Configured
                    </button>
                  </div>
                )}
                {!c.IsConfigured && (
                  <div
                    className="tooltip tooltip-bottom"
                    data-tip="Configure now"
                  >
                    <button
                      className="btn btn-error btn-soft btn-xs"
                      onClick={() => handleConfigure(c)}
                    >
                      Unconfigured
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
      </ul>

      <CalibrationModal
        dialogRef={dialogRef}
        controller={currentlyCalibratingController}
      />
    </div>
  );
};
