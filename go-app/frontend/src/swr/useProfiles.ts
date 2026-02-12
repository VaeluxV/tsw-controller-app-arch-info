import useSWR from "swr";
import { GetProfiles } from "../../wailsjs/go/main/App";

export const useProfiles = () => {
  return useSWR(["system", "profiles"], async () => GetProfiles(), {
    suspense: true,
    revalidateOnMount: true,
  });
};
