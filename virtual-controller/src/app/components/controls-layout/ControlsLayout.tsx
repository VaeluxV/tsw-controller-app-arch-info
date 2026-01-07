import { useRef, useState } from "react";
import { motion } from "motion/react";
import {
  TLayoutConfigBaseControlOptionsSchema,
  TLayoutConfigSchema,
} from "../../config/layoutConfigSchema";
import { t } from "../../utils/t";
import { useForm } from "react-hook-form";
import {
  AddButtonControlForm,
  AddCenteredSliderControlForm,
  AddSliderControlForm,
  TAddButtonControlFormValues,
  TAddCenteredSliderControlFormValues,
  TAddSliderControlFormValues,
} from "../control-forms";
import { LayoutControl } from "./LayoutControl";

type Props = {
  layout: TLayoutConfigSchema;
  onUpdateLayout: (layout: TLayoutConfigSchema) => void;
  onUpdateControlValue: (
    control: TLayoutConfigSchema["controls"][number],
    value: number
  ) => void;
};

export const ControlsLayout = ({
  layout,
  onUpdateLayout,
  onUpdateControlValue,
}: Props) => {
  const dragConstraintsRef = useRef<HTMLDivElement>(null);

  const [addButtonFormOpen, setAddButtonFormOpen] = useState(false);
  const [addSliderFormOpen, setAddSliderFormOpen] = useState(false);
  const [addCenteredSliderFormOpen, setAddCenteredSliderFormOpen] =
    useState(false);

  const valuesForm = useForm<Record<string, number>>();
  const valuesFormValues = valuesForm.watch();

  const moveControlByName = (
    control: string,
    position: TLayoutConfigBaseControlOptionsSchema["position"]
  ) => {
    const indexOf = layout.controls.findIndex((c) => c.name === control);
    if (indexOf === -1) return;
    layout.controls[indexOf].options.position = position;
    onUpdateLayout({ ...layout });
  };

  const deleteControlByName = (control: string) => {
    const indexOf = layout.controls.findIndex((c) => c.name === control);
    if (indexOf === -1) return;
    layout.controls.splice(indexOf, 1);
    onUpdateLayout({ ...layout });
  };

  const addControl = (control: TLayoutConfigSchema["controls"][number]) => {
    for (const c of layout.controls) {
      if (c.name === control.name) {
        throw new Error(`Control already exists (${control.name})`);
      }
    }
    onUpdateLayout({
      name: layout.name,
      controls: [...layout.controls, control],
    });
  };

  const handleOpenAddButtonForm = () => setAddButtonFormOpen(true);
  const handleCloseAddButtonForm = () => setAddButtonFormOpen(false);
  const handleAddButtonControl = (values: TAddButtonControlFormValues) => {
    addControl({
      type: "button",
      name: values.name,
      options: { position: { x: 0.5, y: 0.5 }, color: values.color },
    });
  };

  const handleOpenAddSliderForm = () => setAddSliderFormOpen(true);
  const handleCloseAddSliderForm = () => setAddSliderFormOpen(false);
  const handleAddSliderControl = (values: TAddSliderControlFormValues) => {
    addControl({
      type: "slider",
      name: values.name,
      options: {
        position: { x: 0.5, y: 0.5 },
        color: values.color,
        snap: values.snap ? values.snap : null,
      },
    });
  };

  const handleOpenAddCenteredSliderForm = () =>
    setAddCenteredSliderFormOpen(true);
  const handleCloseAddCenteredSliderForm = () =>
    setAddCenteredSliderFormOpen(false);
  const handleAddCenteredSliderControl = (
    values: TAddCenteredSliderControlFormValues
  ) => {
    addControl({
      type: "slider_centered",
      name: values.name,
      options: {
        position: { x: 0.5, y: 0.5 },
        color: values.color,
        snap: values.snap ? values.snap : null,
      },
    });
  };

  return (
    <div className="grid grid-cols-1 grid-rows-1">
      <div className="fab">
        <div
          tabIndex={0}
          role="button"
          className="btn btn-lg btn-circle btn-primary"
        >
          {t("+")}
        </div>
        <button
          className="btn btn-md rounded-full"
          onClick={handleOpenAddButtonForm}
        >
          {t("Add button")}
        </button>
        <button
          className="btn btn-md rounded-full"
          onClick={handleOpenAddSliderForm}
        >
          {t("Add slider")}
        </button>
        <button
          className="btn btn-md rounded-full"
          onClick={handleOpenAddCenteredSliderForm}
        >
          {t("Add centered slider")}
        </button>
      </div>

      <motion.div ref={dragConstraintsRef} className="relative">
        {layout.controls.map((control) => (
          <LayoutControl
            key={control.name}
            control={control}
            dragConstraintsRef={dragConstraintsRef}
            value={valuesFormValues[control.name] ?? 0}
            onMove={moveControlByName}
            onDelete={deleteControlByName}
            onUpdateValue={(control, value) => {
              valuesForm.setValue(control, value);
              for (const c of layout.controls) {
                if (c.name === control) {
                  onUpdateControlValue(c, value);
                  return;
                }
              }
            }}
          />
        ))}
      </motion.div>

      <AddButtonControlForm
        open={addButtonFormOpen}
        onClose={handleCloseAddButtonForm}
        onSubmit={handleAddButtonControl}
      />

      <AddSliderControlForm
        open={addSliderFormOpen}
        onClose={handleCloseAddSliderForm}
        onSubmit={handleAddSliderControl}
      />

      <AddCenteredSliderControlForm
        open={addCenteredSliderFormOpen}
        onClose={handleCloseAddCenteredSliderForm}
        onSubmit={handleAddCenteredSliderControl}
      />
    </div>
  );
};
