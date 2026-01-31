import useSWR from "swr";
import { GetLastInstalledModVersion } from "../../wailsjs/go/main/App";

export const useLastInstalledModVersion = () => {
  return useSWR(
    ["system", "modVersion", "installed"],
    async () => GetLastInstalledModVersion(),
    {
      suspense: true,
      revalidateOnMount: true,
    },
  );
};
