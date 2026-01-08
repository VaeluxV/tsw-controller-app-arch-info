import { motion, useDragControls, useMotionValue } from "motion/react";
import { RefObject, useRef } from "react";
import {
  TLayoutConfigBaseControlOptionsSchema,
  TLayoutConfigSchema,
} from "../../config/layoutConfigSchema";
import { t } from "../../utils/t";
import { LayoutControlButton } from "./LayoutControlButton";
import { LayoutControlSlider } from "./LayoutControlSlider";
import { LayoutControlCenteredSlider } from "./LayoutControlCenteredSlider";
import { ArrowsOutCardinalIcon, TrashIcon } from "@phosphor-icons/react";

type Props = {
  dragConstraintsRef: RefObject<HTMLDivElement | null>;
  control: TLayoutConfigSchema["controls"][number];
  value: number;
  onUpdateValue: (
    control: TLayoutConfigSchema["controls"][number],
    value: number,
    interacting: boolean
  ) => void;
  onMove: (
    control: string,
    position: TLayoutConfigBaseControlOptionsSchema["position"]
  ) => void;
  onDelete: (control: string) => void;
};

export const LayoutControl = ({
  dragConstraintsRef,
  control,
  value,
  onMove,
  onUpdateValue,
  onDelete,
}: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const dragControls = useDragControls();
  const { name, options } = control;

  const handleDragEnd = () => {
    if (!ref.current || !dragConstraintsRef.current) return;
    const constraintsRect = dragConstraintsRef.current.getBoundingClientRect();
    const controlRect = ref.current.getBoundingClientRect();
    const top =
      (controlRect.top - constraintsRect.top + controlRect.height / 2) /
      constraintsRect.height;
    const left =
      (controlRect.left - constraintsRect.left + controlRect.width / 2) /
      constraintsRect.width;
    x.set(0);
    y.set(0);
    onMove(control.name, { y: top, x: left });
  };

  return (
    <motion.div
      ref={ref}
      className="absolute -translate-1/2"
      style={{
        x,
        y,
        left: `${options.position.x * 100}%`,
        top: `${options.position.y * 100}%`,
      }}
      drag
      dragControls={dragControls}
      dragConstraints={dragConstraintsRef}
      dragMomentum={false}
      dragElastic={0}
      dragListener={false}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col justify-center items-center gap-1">
        <div className="tooltip" data-tip={name}>
          {control.type === "button" && (
            <LayoutControlButton
              control={control}
              value={value}
              onUpdateValue={onUpdateValue}
            />
          )}
          {control.type === "slider" && (
            <LayoutControlSlider
              control={control}
              value={value}
              onUpdateValue={onUpdateValue}
            />
          )}
          {control.type === "slider_centered" && (
            <LayoutControlCenteredSlider
              control={control}
              value={value}
              onUpdateValue={onUpdateValue}
            />
          )}
        </div>
        <div>
          <button
            aria-label={t("Drag to move control")}
            className="btn btn-sm rounded-l-full"
            onPointerDown={(e) => dragControls.start(e)}
          >
            <ArrowsOutCardinalIcon />
          </button>
          <button
            aria-label={t("Delete control")}
            className="btn btn-sm rounded-r-full"
            onPointerDown={() => onDelete(control.name)}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
