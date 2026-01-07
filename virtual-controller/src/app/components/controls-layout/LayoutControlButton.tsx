import { CSSProperties } from "react";
import { controlColorCssVariables } from "../../config/controlColors";
import { TLayoutConfigButtonSchema } from "../../config/layoutConfigSchema";

type Props = {
  control: TLayoutConfigButtonSchema;
  value: number;
  onUpdateValue: (control: string, value: number) => void;
};

export const LayoutControlButton = ({
  control,
  value,
  onUpdateValue,
}: Props) => {
  const { name, options } = control;

  const handlePointerDown = () => onUpdateValue(name, 1);
  const handlePointerUpOrLeave = () => onUpdateValue(name, 0);

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
