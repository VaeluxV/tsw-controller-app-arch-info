import { lt } from "semver";
import { BrowserOpenURL } from "../wailsjs/runtime/runtime";
import { useLatestReleaseVersion, useVersion } from "./swr";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";

const SelfUpdateBannerContent = () => {
  const { data: version } = useVersion();
  const { data: latestVersion } = useLatestReleaseVersion();

  const handleUpdate = () => {
    BrowserOpenURL(
      `https://github.com/LiamMartens/tsw-controller-app/releases/tag/v${latestVersion}`,
    );
  };

  if (lt(version, latestVersion)) {
    return (
      <div className="flex flex-row gap-2 items-center p-2">
        <div className="inline-grid *:[grid-area:1/1]">
          <div className="status status-info"></div>
          <div className="status status-info"></div>
        </div>{" "}
        <p className="text-xs">
          A new version is available
          {` ${version} → ${latestVersion} `}
          <button className="link" onClick={handleUpdate}>
            Update now
          </button>
        </p>
      </div>
    );
  }

  return null;
};

export const SelfUpdateBanner = () => {
  return (
    <ErrorBoundary fallback={null}>
      <Suspense>
        <SelfUpdateBannerContent />
      </Suspense>
    </ErrorBoundary>
  );
};
