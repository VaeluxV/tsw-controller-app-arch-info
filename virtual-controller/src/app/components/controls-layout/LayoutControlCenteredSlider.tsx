import { CSSProperties, useRef } from "react";
import {
  motion,
  PanInfo,
  Point,
  useMotionValue,
  useTransform,
} from "motion/react";
import { controlColorCssVariables } from "../../config/controlColors";
import { TLayoutConfigCenteredSliderSchema } from "../../config/layoutConfigSchema";
import { t } from "../../utils/t";
import { snapNumber } from "../../utils/snapNumber";

type Props = {
  control: TLayoutConfigCenteredSliderSchema;
  value: number;
  onUpdateValue: (
    control: TLayoutConfigCenteredSliderSchema,
    value: number,
    interacting: boolean
  ) => void;
};

export const LayoutControlCenteredSlider = ({
  control,
  value,
  onUpdateValue,
}: Props) => {
  const { options } = control;
  const y = useMotionValue(0);
  const progress = useMotionValue(value);
  const top = useTransform(progress, (v) => `${((1 - v) / 2) * 100}%`);
  const dragHandleRef = useRef<HTMLButtonElement>(null);
  const dragTrackRef = useRef<HTMLDivElement>(null);

  const calculateProgressFromPoint = (point: Point) => {
    if (!dragHandleRef.current || !dragTrackRef.current) return 0;
    const trackRect = dragTrackRef.current.getBoundingClientRect();
    const rawprogress = ((point.y - trackRect.top) / trackRect.height) * -2 + 1;
    const snappedprogress = options.snap
      ? snapNumber(rawprogress, options.snap)
      : rawprogress;
    const progress = Math.min(
      1,
      Math.max(-1, Math.round(snappedprogress * 1000) / 1000)
    );
    const shouldSnapToCenter = progress > -0.05 && progress < 0.05;
    if (shouldSnapToCenter) return 0;
    return progress;
  };

  const handleDrag = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const pvalue = calculateProgressFromPoint(info.point);
    y.set(0);
    progress.set(pvalue);
    onUpdateValue(control, pvalue, true);
  };

  const handleDragEnd = (
    _: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    const pvalue = calculateProgressFromPoint(info.point);
    y.set(0);
    progress.set(pvalue);
    onUpdateValue(control, pvalue, false);
  };

  return (
    <div
      className="isolate h-[calc(100dvh-10rem)] w-24 py-8 bg-base-300 rounded-full"
      style={{
        boxShadow: "inset 0 0 1rem var(--color-base-100)",
      }}
    >
      <div ref={dragTrackRef} className="relative w-full h-full">
        <motion.button
          ref={dragHandleRef}
          drag="y"
          aria-label={t("Drag")}
          dragConstraints={dragTrackRef}
          dragMomentum={false}
          dragElastic={0}
          className="absolute left-0 h-0 grid grid-cols-1 grid-rows-1 items-center w-full"
          style={{ y, top }}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
        >
          <div
            role="presentation"
            className="btn btn-xl btn-primary rounded-full h-16 p-0 w-full"
            style={
              {
                "--btn-color": `var(${controlColorCssVariables[options.color]})`,
              } as CSSProperties
            }
          >
            <motion.span>{progress}</motion.span>
          </div>
        </motion.button>
      </div>
    </div>
  );
};
