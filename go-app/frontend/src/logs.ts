import { EventsOn } from "../wailsjs/runtime/runtime";
import { events } from "./events";

export const logs: string[] = [];

EventsOn(events.log, (msg: string) => {
  logs.push(msg);
});
