import { CSSProperties } from "react";
import { controlColorCssVariables } from "../../config/controlColors";
import { TLayoutConfigButtonSchema } from "../../config/layoutConfigSchema";

type Props = {
  control: TLayoutConfigButtonSchema;
  value: number;
  onUpdateValue: (
    control: TLayoutConfigButtonSchema,
    value: number,
    interacting: boolean
  ) => void;
};

export const LayoutControlButton = ({
  control,
  value,
  onUpdateValue,
}: Props) => {
  const { options } = control;

  const handlePointerDown = () => onUpdateValue(control, 1, false);
  const handlePointerUpOrLeave = () => onUpdateValue(control, 0, false);

  return (
    <button
      className="btn btn-xl btn-primary p-0 w-16 h-16"
      style={
        {
          "--btn-color": `var(${controlColorCssVariables[options.color]})`,
        } as CSSProperties
      }
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUpOrLeave}
      onPointerLeave={handlePointerUpOrLeave}
    >
      {value}
    </button>
  );
};
