import useSWR from "swr";
import { GetSharedProfiles } from "../../wailsjs/go/main/App";

export const useSharedProfiles = () => {
  return useSWR(
    ["external", "github", "sharedProfiles"],
    async () =>
      GetSharedProfiles().then((profiles) =>
        profiles.toSorted((a, b) => a.Name.localeCompare(b.Name)),
      ),
    {
      suspense: true,
      revalidateOnMount: true,
    },
  );
};
