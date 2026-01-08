import { Device, DeviceInfo } from "@capacitor/device";
import { useStore } from "@nanostores/react";
import { atom } from "nanostores";

const deviceId = atom<string | null>(null)
const deviceInfo = atom<DeviceInfo | null>(null)

Promise.all([Device.getId(), Device.getInfo()]).then(([{ identifier }, info]) => {
  deviceId.set(`virtual:${identifier}`)
  deviceInfo.set(info)
})

export const useDevice = () => {
  return [
    useStore(deviceId),
    useStore(deviceInfo)
  ] as const
}