import type { CustomsVnaccsProfile } from "./types";

export function isVnaccsProfileConfigured(
  profile: CustomsVnaccsProfile | null | undefined
): boolean {
  return Boolean(
    profile &&
      profile.hasUserPassword &&
      profile.hasTerminalAccessKey &&
      profile.userCode?.trim() &&
      profile.terminalId?.trim()
  );
}
