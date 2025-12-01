import { useEffect, useRef } from "react";
import { EventsOn } from "../../../wailsjs/runtime/runtime";
import { events } from "../../events";
import { logs } from "../../logs";
import { SaveLogs } from "../../../wailsjs/go/main/App";
import { alert } from "../../utils/alert";

export const LogsTab = () => {
  const logsRef = useRef<HTMLDivElement | null>(null);

  const handleSave = () => {
    SaveLogs(logs).catch((err) => alert(String(err), "error"));
  };

  useEffect(() => {
    /* add initial logs once */
    if (logsRef.current && logs.length) {
      const logsSlice = logs.slice(-1000)
      const textNode = document.createTextNode(logsSlice.join("\n") + "\n");
      logsRef.current.appendChild(textNode);
    }
  }, []);

  useEffect(() => {
    return EventsOn(events.log, (msg: string) => {
      /* add new logs as they come in */
      requestAnimationFrame(() => {
        if (logsRef.current) {
          const textNode = document.createTextNode(msg + "\n");
          logsRef.current.appendChild(textNode);
          document.documentElement.scrollTop =
            document.documentElement.scrollHeight;
        }
      });
    });
  }, []);

  return (
    <div>
      <div
        ref={logsRef}
        key="logs"
        className="whitespace-pre-wrap text-xs font-mono w-full overflow-hidden peer"
      />
      <div className="sticky bottom-0 left-0 right-0 py-3 bg-[var(--root-bg,var(--color-base-100))] border-t border-t-base-100 peer-empty:hidden">
        <button className="btn btn-primary btn-xs" onClick={handleSave}>
          Save logs
        </button>
      </div>
    </div>
  );
};
