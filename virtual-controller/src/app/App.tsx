import { useEffect, useMemo, useState } from "react";
import { t } from "./utils/t";
import { configStore } from "./config/configStore";
import {
  TAddControlsLayoutFormValues,
  AddControlsLayoutForm,
  ControlsLayout,
} from "./components/controls-layout";
import { TLayoutConfigSchema } from "./config/layoutConfigSchema";
import clsx from "clsx";
import { DotsThreeOutlineVerticalIcon } from "@phosphor-icons/react";
import { tswAppConnector } from "./connector/TSWAppConnector";
import { useDevice } from "./hooks/useDevice";
import { CapacitorBarcodeScanner } from "@capacitor/barcode-scanner";

const App = () => {
  const [deviceId, deviceInfo] = useDevice();
  const [layouts, setLayouts] = useState<TLayoutConfigSchema[] | null>(null);
  const [currentLayout, setCurrentLayout] = useState<string | null>(null);
  const [addLayoutFormOpen, setAddLayoutFormOpen] = useState(false);
  const [connection, connectionState] = tswAppConnector.useConnection();

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
      setCurrentLayout(layouts?.[0]?.name ?? null);
    }
  };

  const handleUpdateControlValue = (
    control: TLayoutConfigSchema["controls"][number],
    value: number
  ) => {
    if (!deviceId || !deviceInfo) return;
    const deviceName = `${deviceInfo.operatingSystem}/${deviceInfo.osVersion}`;
    switch (control.type) {
      case "button":
        connection?.send(
          `virtual_device_button_value,unique_id=${deviceId},device_id=${deviceId},device_name=${deviceName},value=${value}`
        );
        break;
      case "slider":
        connection?.send(
          `virtual_device_axis_value,unique_id=${deviceId},device_id=${deviceId},device_name=${deviceName},value=${value}`
        );
        break;
      case "slider_centered":
        connection?.send(
          `virtual_device_axis_value,unique_id=${deviceId},device_id=${deviceId},device_name=${deviceName},value=${value}`
        );
        break;
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
    if (!connection || !deviceId || !deviceInfo) return;
    const openIfReady = () => {
      if (connection.readyState !== WebSocket.OPEN) return;
      const devicename = `${deviceInfo.operatingSystem}/${deviceInfo.osVersion}`;
      connection.send(
        `virtual_device_connected,unique_id=${deviceId},device_id=${deviceId},device_name=${devicename}`
      );
    };
    const close = () => {
      connection.send(`virtual_device_disconnected,unique_id=${deviceId}`);
    };
    connection.addEventListener("open", openIfReady);
    connection.addEventListener("close", close);
    connection.addEventListener("error", close);
    return () => {
      connection.removeEventListener("open", openIfReady);
      connection.removeEventListener("close", close);
      connection.removeEventListener("error", close);
    };
  }, [connection, deviceId, deviceInfo]);

  useEffect(() => {
    if (Array.isArray(layouts)) {
      configStore.layouts.save(layouts);
    }
  }, [layouts]);

  useEffect(() => {
    configStore.layouts.get().then((layouts) => {
      setLayouts(layouts);
      setCurrentLayout(layouts?.[0]?.name ?? null);
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

        <div role="presentation" className="ml-auto" />
        <button
          role="tab"
          className="tab"
          onClick={() => {
            CapacitorBarcodeScanner.scanBarcode({
              hint: 0,
              scanInstructions: t("Scan QR code from TSW App"),
            }).then(({ ScanResult }) => {
              try {
                const value = JSON.parse(ScanResult) as {
                  device: { ip: string };
                  port: number;
                };
                tswAppConnector.connect(`ws://${value.device.ip}:${value.port}`);
              } catch {}
            });
          }}
        >
          {t("Connect")}
        </button>
        <div className="flex items-center px-2">
          {(connectionState === null ||
            connectionState === WebSocket.CLOSED ||
            connectionState === WebSocket.CLOSING) && (
            <div className="tooltip tooltip-left" data-tip={t("Disconnected")}>
              <div
                aria-label={t("Disconnected")}
                className="status status-error"
              />
            </div>
          )}

          {connectionState === WebSocket.CONNECTING && (
            <div className="tooltip tooltip-left" data-tip={t("Connecting...")}>
              <div
                aria-label={t("Connecting...")}
                className="status status-warning"
              />
            </div>
          )}

          {connectionState === WebSocket.OPEN && (
            <div className="tooltip tooltip-left" data-tip={t("Connected")}>
              <div
                aria-label={t("Connected")}
                className="status status-success"
              />
            </div>
          )}
        </div>
      </div>
      {layout && (
        <ControlsLayout
          key={layout.name}
          layout={layout}
          onUpdateLayout={updateLayout}
          onUpdateControlValue={handleUpdateControlValue}
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
