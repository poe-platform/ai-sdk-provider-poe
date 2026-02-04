export type ReleaseStage = "stable" | "beta" | "alpha";

declare const __RELEASE_STAGE__: ReleaseStage;
declare const process: undefined | { env: Record<string, string | undefined> };

export const RELEASE_STAGE: ReleaseStage =
  typeof __RELEASE_STAGE__ !== "undefined"
    ? __RELEASE_STAGE__
    : (process?.env.RELEASE_STAGE as ReleaseStage) ?? "stable";

const levels: Record<ReleaseStage, number> = { stable: 0, beta: 1, alpha: 2 };

const isAtLeast = (min: ReleaseStage): boolean =>
  levels[RELEASE_STAGE] >= levels[min];

export const isAlphaStage = (): boolean => isAtLeast("alpha");
export const isBetaStage = (): boolean => isAtLeast("beta");
