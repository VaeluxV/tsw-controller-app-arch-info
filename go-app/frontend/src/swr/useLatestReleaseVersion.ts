import useSWR from "swr";
import { GetLatestReleaseVersion } from "../../wailsjs/go/main/App";

export const useLatestReleaseVersion = () => {
  return useSWR(
    ["system", "version", "latest"],
    async () => GetLatestReleaseVersion(),
    { suspense: true, revalidateOnMount: true },
  );
};
