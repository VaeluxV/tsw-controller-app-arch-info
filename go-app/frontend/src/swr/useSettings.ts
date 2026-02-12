import useSWR from "swr";
import {
  GetAlwaysOnTop,
  GetPreferredControlMode,
  GetTheme,
  GetTSWAPIKeyLocation,
} from "../../wailsjs/go/main/App";

export const useSettings = () => {
  return useSWR(
    ["system", "settings"],
    async () => ({
      tswApiKeyLocation: await GetTSWAPIKeyLocation(),
      preferredControlMode: (await GetPreferredControlMode()) as
        | "direct_control"
        | "sync_control"
        | "api_control",
      alwaysOnTop: await GetAlwaysOnTop(),
      theme: (await GetTheme()) as "system" | "light" | "dark",
    }),
    { suspense: true, revalidateOnMount: true },
  );
};
