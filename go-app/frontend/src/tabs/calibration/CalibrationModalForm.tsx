import { useEffect, useState } from "react";
import { main } from "../../../wailsjs/go/models";
import {
  SaveCalibration,
  UnsubscribeRaw,
  SubscribeRaw,
  GetControllerConfiguration,
  LoadConfiguration,
} from "../../../wailsjs/go/main/App";
import {
  CalibrationStateControl,
  Kind,
  useCalibrationForm,
} from "./useCalibrationForm";
import { CalibrationModalFormControl } from "./CalibrationModalFormControl";
import { alert } from "../../utils/alert";

type Props = {
  controller: main.Interop_GenericController;
  onClose: () => void;
};

export const CalibrationModalForm = ({ controller, onClose }: Props) => {
  const [isRunning, setIsRunning] = useState(false);
  const form = useCalibrationForm();
  const controls = form.watch("controls");

  const handleStart = () => {
    if (controller) {
      SubscribeRaw(controller.UniqueID).then(() => {
        setIsRunning(true);
      });
    }
  };

  const handleCancel = () => {
    UnsubscribeRaw().then(() => {
      setIsRunning(false);
      form.reset();
      onClose();
    });
  };

  const handleStopAndSave = () => {
    if (!controller) {
      throw new Error("No controller");
    }

    UnsubscribeRaw().then(() => {
      form.handleSubmit((values) => {
        const data = new main.Interop_ControllerCalibration();
        data.Name = values.name;
        data.UsbId = controller.UsbID;
        data.Controls = values.controls.map((control) => ({
          Kind: control.kind,
          Index: control.index,
          Name: control.name,
          Min: control.min,
          Max: control.max,
          Idle: control.idle,
          Deadzone: control.deadzone,
          Invert: control.invert,
          EasingCurve: control.easingCurve,
        }));
        SaveCalibration(data)
          .then(() => LoadConfiguration())
          .catch((err) => {
            alert(String(err), "error");
          })
          .finally(() => {
            setIsRunning(false);
            form.reset();
            onClose();
          });
      })();
    });
  };

  useEffect(() => {
    GetControllerConfiguration(controller.UniqueID).then((configuration) => {
      form.reset({
        name: configuration.Calibration.Name,
        controls: configuration.Calibration.Controls.map(
          (control): CalibrationStateControl => ({
            kind: control.Kind as Kind,
            index: control.Index,
            name: control.Name,
            min: control.Min,
            max: control.Max,
            idle: control.Idle,
            deadzone: control.Deadzone,
            invert: control.Invert,
            value: control.Idle,
            easingCurve: control.EasingCurve,
            override: false,
          }),
        ).toSorted((a, b) =>
          `${a.kind}_${a.index}`.localeCompare(`${b.kind}_${b.index}`),
        ),
      });
    });
  }, [controller]);

  return (
    <div>
      <h3 className="font-bold text-base">Configuring {controller?.Name}</h3>
      <div className="py-4 grid grid-cols-1 grid-flow-row auto-rows-max gap-2">
        <div>
          <label className="input input-xs">
            Controller Name
            <input
              type="text"
              className="grow"
              {...form.register(`name`, { required: true })}
            />
          </label>
        </div>

        <div>
          {controls.map((control, index) => (
            <div key={`${control.kind}_${control.index}`}>
              <CalibrationModalFormControl
                form={form}
                index={index}
                field={control}
                isRunning={isRunning}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="modal-action sticky bottom-0 bg-base-100">
        <button className="btn btn-sm" onClick={handleCancel}>
          Cancel
        </button>
        {!isRunning && (
          <button className="btn btn-sm" onClick={handleStart}>
            Start
          </button>
        )}
        {isRunning && (
          <button
            className="btn btn-sm"
            disabled={!controller}
            onClick={handleStopAndSave}
          >
            Stop & Save
          </button>
        )}
      </div>
    </div>
  );
};
