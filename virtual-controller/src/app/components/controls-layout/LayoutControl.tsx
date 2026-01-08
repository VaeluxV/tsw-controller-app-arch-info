import {
  motion,
  PanInfo,
  useDragControls,
  useMotionValue,
  useTransform,
} from "motion/react";
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
  const { name, options } = control;
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const posX = useMotionValue(options.position.x);
  const posY = useMotionValue(options.position.y);
  const top = useTransform(posY, (y) => `${y * 100}%`);
  const left = useTransform(posX, (x) => `${x * 100}%`);
  const dragControls = useDragControls();
  const dragBoundsRef = useRef({ x: [0, 0], y: [0, 0] });

  const calculatePositionFromRefs = () => {
    if (!ref.current || !dragConstraintsRef.current) {
      throw new Error("Impossible");
    }

    const constraintsRect = dragConstraintsRef.current.getBoundingClientRect();
    const controlRect = ref.current.getBoundingClientRect();
    const minTop = controlRect.height / 2 / constraintsRect.height;
    const minLeft = controlRect.width / 2 / constraintsRect.width;
    const maxTop = 1 - minTop;
    const maxLeft = 1 - minLeft;
    const top =
      (controlRect.top - constraintsRect.top + controlRect.height / 2) /
      constraintsRect.height;
    const left =
      (controlRect.left - constraintsRect.left + controlRect.width / 2) /
      constraintsRect.width;
    const clampedTop = Math.max(minTop, Math.min(maxTop, top));
    const clampedLeft = Math.max(minLeft, Math.min(maxLeft, left));
    return [clampedTop, clampedLeft] as const;
  };

  const handleDragStart = () => {
    if (!ref.current || !dragConstraintsRef.current) {
      throw new Error("Impossible");
    }
    const constraintsRect = dragConstraintsRef.current.getBoundingClientRect();
    const controlRect = ref.current.getBoundingClientRect();
    const maxNegDeltaX = constraintsRect.left - controlRect.left;
    const maxPosDeltaX = constraintsRect.right - controlRect.right;
    const maxNegDeltaY = constraintsRect.top - controlRect.top;
    const maxPosDeltaY = constraintsRect.bottom - controlRect.bottom
    dragBoundsRef.current = { x: [maxNegDeltaX, maxPosDeltaX], y: [maxNegDeltaY, maxPosDeltaY] };
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    const vx = Math.max(
      dragBoundsRef.current.x[0],
      Math.min(dragBoundsRef.current.x[1], info.offset.x)
    );
    const vy = Math.max(
      dragBoundsRef.current.y[0],
      Math.min(dragBoundsRef.current.y[1], info.offset.y)
    );
    x.set(vx);
    y.set(vy);
  };

  const handleDragEnd = () => {
    const [top, left] = calculatePositionFromRefs();
    x.set(0);
    y.set(0);
    posX.set(left);
    posY.set(top);
    onMove(control.name, { y: top, x: left });
  };

  return (
    <motion.div
      ref={ref}
      className="absolute -translate-1/2"
      style={{ x, y, left, top }}
      drag
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      dragListener={false}
      onDrag={handleDrag}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col justify-center items-center gap-2">
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
        <div className="flex flex-col gap-2 w-full">
          <button
            aria-label={t("Drag to move control")}
            className="btn rounded-full"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              dragControls.start(e);
            }}
          >
            <ArrowsOutCardinalIcon />
          </button>
          <button
            aria-label={t("Delete control")}
            className="btn btn-soft btn-error rounded-full"
            onPointerDown={() => onDelete(control.name)}
          >
            <TrashIcon />
          </button>
        </div>
      </div>
    </motion.div>
  );
};
