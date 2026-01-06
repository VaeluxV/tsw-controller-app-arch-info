import { motion } from "motion/react";
import { useRef, useState } from "react";
import {
  AddButtonControlForm,
  AddCenteredSliderControlForm,
  AddSliderControlForm,
  TAddButtonControlFormValues,
  TAddCenteredSliderControlFormValues,
  TAddSliderControlFormValues,
} from "./components/control-forms";
import { t } from "./utils/t";
import {
  TLayoutConfigBaseControlOptionsSchema,
  TLayoutConfigSchema,
} from "./config/layoutConfigSchema";
import { LayoutControl } from "./components/controls-layout";
import { useForm } from "react-hook-form";
import { ConnectModal } from "./components/connector";

function App() {
  const dragConstraintsRef = useRef<HTMLDivElement>(null);

  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [addButtonFormOpen, setAddButtonFormOpen] = useState(false);
  const [addSliderFormOpen, setAddSliderFormOpen] = useState(false);
  const [addCenteredSliderFormOpen, setAddCenteredSliderFormOpen] =
    useState(false);

  const valuesForm = useForm<Record<string, number>>();
  const valuesFormValues = valuesForm.watch();

  const [layout, setLayout] = useState<TLayoutConfigSchema>({
    name: "Default",
    controls: [],
  });

  const handleMoveControl = (
    control: string,
    position: TLayoutConfigBaseControlOptionsSchema["position"],
  ) => {
    const indexOf = layout.controls.findIndex((c) => c.name === control);
    if (indexOf === -1) return;
    setLayout((layout) => {
      layout.controls[indexOf].options.position = position;
      return { ...layout };
    });
  };

  const handleDeleteControl = (control: string) => {
    const indexOf = layout.controls.findIndex((c) => c.name === control);
    if (indexOf === -1) return;
    setLayout((layout) => {
      layout.controls.splice(indexOf, 1);
      return { ...layout };
    });
  };

  const handleOpenAddButtonForm = () => setAddButtonFormOpen(true);
  const handleCloseAddButtonForm = () => setAddButtonFormOpen(false);
  const handleAddButtonControl = (values: TAddButtonControlFormValues) => {
    setLayout((layout) => ({
      name: layout.name,
      controls: [
        ...layout.controls,
        {
          type: "button",
          name: values.name,
          options: {
            position: { x: 0.5, y: 0.5 },
            color: values.color,
          },
        },
      ],
    }));
  };

  const handleOpenAddSliderForm = () => setAddSliderFormOpen(true);
  const handleCloseAddSliderForm = () => setAddSliderFormOpen(false);
  const handleAddSliderControl = (values: TAddSliderControlFormValues) => {
    setLayout((layout) => ({
      name: layout.name,
      controls: [
        ...layout.controls,
        {
          type: "slider",
          name: values.name,
          options: {
            position: { x: 0.5, y: 0.5 },
            color: values.color,
            snap: values.snap ? values.snap : null,
          },
        },
      ],
    }));
  };

  const handleOpenAddCenteredSliderForm = () =>
    setAddCenteredSliderFormOpen(true);
  const handleCloseAddCenteredSliderForm = () =>
    setAddCenteredSliderFormOpen(false);
  const handleAddCenteredSliderControl = (
    values: TAddCenteredSliderControlFormValues,
  ) => {
    setLayout((layout) => ({
      name: layout.name,
      controls: [
        ...layout.controls,
        {
          type: "slider_centered",
          name: values.name,
          options: {
            position: { x: 0.5, y: 0.5 },
            color: values.color,
            snap: values.snap ? values.snap : null,
          },
        },
      ],
    }));
  };

  return (
    <main className="p-3 h-dvh grid gap-3 grid-cols-1 grid-rows-[max-content_minmax(0,1fr)]">
      <div role="tablist" className="tabs tabs-sm tabs-box">
        <button role="tab" className="tab tab-active">
          {t("Default Layout")}
        </button>
        <button role="tab" className="tab">
          {t("+ New layout")}
        </button>
        <button
          role="tab"
          className="tab ml-auto"
          onClick={() => setConnectModalOpen(true)}
        >
          {t("Connect")}
        </button>
      </div>

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
            onMove={handleMoveControl}
            onDelete={handleDeleteControl}
            onUpdateValue={(control, value) => {
              valuesForm.setValue(control, value);
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

      <ConnectModal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
      />
    </main>
  );
}

export default App;
