export type InstallPlatform = 'IOS' | 'ANDROID' | 'IN_APP_BROWSER' | 'OTHER';

export interface PlatformNavigator {
  readonly userAgent: string;
  readonly platform: string;
  readonly maxTouchPoints: number;
  readonly standalone?: boolean;
}

export function isIosDevice(navigatorLike: PlatformNavigator): boolean {
  return (
    /iPad|iPhone|iPod/iu.test(navigatorLike.userAgent) ||
    (navigatorLike.platform === 'MacIntel' && navigatorLike.maxTouchPoints > 1)
  );
}

export function detectInstallPlatform(navigatorLike: PlatformNavigator): InstallPlatform {
  if (/FBAN|FBAV|Instagram|Line|Messenger|Zalo|; wv\)/iu.test(navigatorLike.userAgent))
    return 'IN_APP_BROWSER';
  if (isIosDevice(navigatorLike)) return 'IOS';
  if (/Android/iu.test(navigatorLike.userAgent)) return 'ANDROID';
  return 'OTHER';
}

export function isStandaloneDisplay(
  displayModeStandalone: boolean,
  navigatorLike: PlatformNavigator,
): boolean {
  return displayModeStandalone || navigatorLike.standalone === true;
}

export function browserNavigator(): PlatformNavigator {
  const navigatorWithStandalone = navigator as Navigator & { readonly standalone?: boolean };
  return {
    userAgent: navigatorWithStandalone.userAgent,
    platform: navigatorWithStandalone.platform,
    maxTouchPoints: navigatorWithStandalone.maxTouchPoints,
    ...(navigatorWithStandalone.standalone === undefined
      ? {}
      : { standalone: navigatorWithStandalone.standalone }),
  };
}
