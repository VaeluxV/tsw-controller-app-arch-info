import useSWR from "swr";
import { GetVersion } from "../../wailsjs/go/main/App";

export const useVersion = () => {
  return useSWR(["system", "version", "current"], async () => GetVersion(), {
    suspense: true,
    revalidateOnMount: true,
  });
};
