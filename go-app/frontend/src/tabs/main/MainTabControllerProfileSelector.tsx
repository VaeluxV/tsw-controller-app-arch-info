import { Controller, UseFormReturn } from "react-hook-form";
import { main } from "../../../wailsjs/go/models";
import { useCallback, useMemo } from "react";
import { ProfileSelectionListItem } from "./_components/ProfileSelectionListItem";
import { unfocus } from "../../utils/unfocus";
import { ProfileInfo, ProfileSelectionMoreMenu } from "./_components/ProfileSelectionMoreMenu";

type Props = {
  form: UseFormReturn<{
    profiles: Partial<Record<string, main.Interop_SelectedProfileInfo>>;
  }>;
  controller: main.Interop_GenericController;
  profiles: main.Interop_Profile[];
  onReloadConfiguration: () => void;
  onBrowseConfiguration: () => void;
  onCreateProfile: (controller: main.Interop_GenericController | null) => void;
  onSaveProfile: (
    profile: ProfileInfo,
    controller: main.Interop_GenericController | null,
  ) => void;
  onEditProfile: (
    profile: ProfileInfo
  ) => void;
  onDeleteProfileForController: (
    profile: ProfileInfo
  ) => void;
};

export function MainTabControllerProfileSelector({
  form,
  controller,
  profiles,
  onReloadConfiguration,
  onBrowseConfiguration,
  onCreateProfile,
  onSaveProfile,
  onEditProfile,
  onDeleteProfileForController,
}: Props) {
  const { watch, control } = form;
  const selectedProfile = watch(`profiles.${controller.GUID}`);
  const supportedProfiles = useMemo(
    () =>
      profiles?.filter(
        (profile) => !profile.UsbID || profile.UsbID === controller.UsbID,
      ),
    [profiles],
  );
  const unsupportedProfiles = useMemo(
    () =>
      profiles?.filter(
        (profile) => profile.UsbID && profile.UsbID !== controller.UsbID,
      ),
    [profiles],
  );

  return (
    <fieldset className="fieldset w-full">
      <label
        htmlFor={`controller_${controller.GUID}`}
        className="fieldset-legend"
      >
        {controller.Name} ({controller.UsbID})
      </label>

      <div className="flex flex-row gap-2 items-center">
        <Controller
          control={control}
          name={`profiles.${controller.GUID}`}
          render={({ field }) => (
            <div className="grow dropdown dropdown-start">
              <button
                id={`controller_${controller.GUID}`}
                tabIndex={0}
                role="button"
                className="select w-full"
              >
                {selectedProfile?.Name ?? "Auto-Detect"}
              </button>
              <div className="dropdown-content shadow-sm max-h-[50dvh] overflow-auto w-full">
                <ul className="menu w-full bg-base-300 rounded-box p-2">
                  <li key="auto-detect">
                    <button
                      className="grid grid-cols-1 grid-flow-row auto-rows-max gap-2"
                      onClick={() => {
                        field.onChange(undefined);
                        setTimeout(unfocus, 0);
                      }}
                    >
                      <div>Auto-detect</div>
                    </button>
                  </li>
                  {supportedProfiles.map((profile) => (
                    <ProfileSelectionListItem
                      key={profile.Id}
                      profile={profile}
                      onSelect={field.onChange}
                    />
                  ))}
                  {unsupportedProfiles.map((profile) => (
                    <ProfileSelectionListItem
                      key={profile.Id}
                      profile={profile}
                      disabled="Not supported by controller"
                    />
                  ))}
                </ul>
              </div>
            </div>
          )}
        />

        <ProfileSelectionMoreMenu
          controller={controller}
          profile={selectedProfile ?? null}
          onReloadConfiguration={onReloadConfiguration}
          onBrowseConfiguration={onBrowseConfiguration}
          onCreateProfile={onCreateProfile}
          onSavePofile={onSaveProfile}
          onEditProfile={onEditProfile}
          onDeleteProfile={onDeleteProfileForController}
        />
      </div>
    </fieldset>
  );
}
