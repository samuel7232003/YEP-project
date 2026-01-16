/**
 * List of tracking parameters from social media platforms and ad networks
 * that should be removed from URLs
 */
const TRACKING_PARAMS = [
  // Facebook
  "fbclid",
  "ref",
  // Twitter
  "twclid",
  // Google
  "gclid",
  "gclsrc",
  "dclid",
  // Instagram
  "igshid",
  "igsh",
  // TikTok
  "ttclid",
  // LinkedIn
  "li_fat_id",
  "trk",
  "trkInfo",
  // Pinterest
  "pin_id",
  // Snapchat
  "scid",
  // Microsoft
  "msclkid",
  // Yahoo
  "yclid",
  // Generic UTM parameters (optional - you might want to keep these)
  // "utm_source",
  // "utm_medium",
  // "utm_campaign",
  // "utm_term",
  // "utm_content",
  // Other tracking params
  "mc_cid",
  "mc_eid",
  "_ga",
  "_gl",
  "campaign_id",
  "ad_id",
];

/**
 * Removes tracking parameters from the current URL and updates the browser history
 * without triggering a page reload
 */
export const cleanUrlParams = (): void => {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  let hasChanges = false;

  // Remove tracking parameters
  TRACKING_PARAMS.forEach((param) => {
    if (url.searchParams.has(param)) {
      url.searchParams.delete(param);
      hasChanges = true;
    }
  });

  // Only update URL if there were changes
  if (hasChanges) {
    const cleanUrl = url.pathname + url.search + url.hash;
    // Replace current history entry without reload
    window.history.replaceState({}, "", cleanUrl);
  }
};

/**
 * Hook to clean URL params on component mount
 * Can be used in React components
 */
export const useCleanUrlParams = (): void => {
  if (typeof window === "undefined") return;

  // Clean on mount
  cleanUrlParams();

  // Also clean on popstate (back/forward navigation)
  const handlePopState = () => {
    cleanUrlParams();
  };

  window.addEventListener("popstate", handlePopState);

  // Cleanup listener on unmount (though this utility doesn't return cleanup)
  // The component using it should handle cleanup if needed
};

