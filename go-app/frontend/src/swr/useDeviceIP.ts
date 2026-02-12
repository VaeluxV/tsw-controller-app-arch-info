import useSWR from "swr";
import { GetDeviceIP } from "../../wailsjs/go/main/App";

export const useDeviceIP = () => {
  return useSWR(["system", "deviceIP"], async () => GetDeviceIP(), {
    suspense: true,
    revalidateOnMount: true,
  });
};
