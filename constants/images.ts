/**
 * Logo and image sources. Use getLogoSource(isDark) for theme-aware logo.
 * Ensure assets/images/Scribit Logo-Dark.png exists for dark mode; otherwise add the file or use LogoLight for both.
 */
export const LogoLight = require('../assets/images/Scribit Logo.png');
// Dark mode logo – add Scribit Logo-Dark.png to assets/images/ or the app may fail to bundle
export const LogoDark = require('../assets/images/Scribit Logo-Dark.png');

export function getLogoSource(isDark: boolean) {
  return isDark ? LogoDark : LogoLight;
}
