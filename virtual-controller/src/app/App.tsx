import { useEffect, useMemo, useState } from "react";
import { t } from "./utils/t";
import { CapacitorBarcodeScanner } from "@capacitor/barcode-scanner";
import { configStore } from "./config/configStore";
import {
  TAddControlsLayoutFormValues,
  AddControlsLayoutForm,
  ControlsLayout,
} from "./components/controls-layout";
import { TLayoutConfigSchema } from "./config/layoutConfigSchema";
import clsx from "clsx";
import { DotsThreeOutlineVerticalIcon } from "@phosphor-icons/react";

const App = () => {
  const [layouts, setLayouts] = useState<TLayoutConfigSchema[] | null>(null);
  const [currentLayout, setCurrentLayout] = useState<string | null>(null);
  const [addLayoutFormOpen, setAddLayoutFormOpen] = useState(false);

  const layout = useMemo(() => {
    if (!currentLayout || !layouts?.length) return null;
    for (const layout of layouts) {
      if (layout.name === currentLayout) {
        return layout;
      }
    }
    return null;
  }, [currentLayout, layouts]);

  const updateLayout = (layout: TLayoutConfigSchema) => {
    const actuallayouts = layouts ?? [];
    const indexOf = actuallayouts?.findIndex((l) => l.name === layout.name);
    actuallayouts.splice(indexOf, 1, layout);
    setLayouts([...actuallayouts]);
  };

  const deleteLayout = (layout: TLayoutConfigSchema) => {
    const actuallayouts = layouts ?? [];
    setLayouts(actuallayouts.filter((l) => l.name !== layout.name));
    if (currentLayout === layout.name) {
      setCurrentLayout(layouts?.[0].name ?? null);
    }
  };

  const handleCloseAddLayoutForm = () => setAddLayoutFormOpen(false);
  const handleOpenAddLayoutForm = () => setAddLayoutFormOpen(true);
  const handleAddLayout = (values: TAddControlsLayoutFormValues) => {
    const actuallayouts = layouts ?? [];
    for (const layout of actuallayouts) {
      if (layout.name === values.name) {
        throw new Error(`Layout already exists: ${layout.name}`);
      }
    }
    setLayouts([...actuallayouts, { name: values.name, controls: [] }]);
    if (!currentLayout) setCurrentLayout(values.name);
  };

  useEffect(() => {
    if (Array.isArray(layouts)) {
      configStore.layouts.save(layouts);
    }
  }, [layouts]);

  useEffect(() => {
    configStore.layouts.get().then((layouts) => {
      setLayouts(layouts);
      setCurrentLayout(layouts?.[0].name ?? null);
    });
  }, []);

  return (
    <main className="p-3 h-dvh grid gap-3 grid-cols-1 grid-rows-[max-content_minmax(0,1fr)]">
      <div role="tablist" className="tabs tabs-sm tabs-box">
        {layouts?.map((layout) => (
          <div
            key={layout.name}
            role="tab"
            className={clsx(
              "tab flex gap-2 items-center cursor-default",
              layout.name === currentLayout && "tab-active"
            )}
          >
            <button
              className="cursor-pointer"
              onClick={() => setCurrentLayout(layout.name)}
            >
              {layout.name}
            </button>
            <div className="dropdown dropdown-bottom h-[1.1em]">
              <button tabIndex={0} className="text-sm cursor-pointer">
                <DotsThreeOutlineVerticalIcon />
              </button>
              <ul
                tabIndex={-1}
                className="dropdown-content menu bg-base-200 rounded-box z-1 w-52 p-2 shadow-sm"
              >
                <li>
                  <button
                    className="text-error"
                    onClick={() => deleteLayout(layout)}
                  >
                    {t("Delete layout")}
                  </button>
                </li>
              </ul>
            </div>
          </div>
        ))}
        <button role="tab" className="tab" onClick={handleOpenAddLayoutForm}>
          {t("+ New layout")}
        </button>
        <button
          role="tab"
          className="tab ml-auto"
          onClick={() => {
            CapacitorBarcodeScanner.scanBarcode({
              hint: 0,
              scanInstructions: t("Scan QR code from TSW App"),
            });
          }}
        >
          {t("Connect")}
        </button>
      </div>
      {layout && (
        <ControlsLayout
          key={layout.name}
          layout={layout}
          onUpdateLayout={updateLayout}
        />
      )}

      <AddControlsLayoutForm
        open={addLayoutFormOpen}
        onSubmit={handleAddLayout}
        onClose={handleCloseAddLayoutForm}
      />
    </main>
  );
};

export default App;
