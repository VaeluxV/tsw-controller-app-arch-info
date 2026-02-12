import useSWR from "swr";
import { GetCabControlState } from "../../wailsjs/go/main/App";

export const useCabControlState = () => {
  return useSWR(
    ["system", "cabControlState"],
    async () => GetCabControlState(),
    { suspense: true, revalidateOnMount: true },
  );
};
