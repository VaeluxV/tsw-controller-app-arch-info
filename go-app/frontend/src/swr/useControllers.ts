import useSWR from "swr";
import { GetControllers } from "../../wailsjs/go/main/App";

export const useControllers = () => {
  return useSWR(["system", "controllers"], async () => GetControllers(), {
    suspense: true,
    revalidateOnMount: true,
  });
};
