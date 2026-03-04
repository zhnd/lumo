import type { RestPreferences } from "./types";

export const DEFAULT_REST_PREFERENCES: RestPreferences = {
  headsUpMinutes: 60,
  breakMinutes: 120,
};

export const REST_PREFERENCES_KEY = "lumo:rest-preferences";

export const CONTINUOUS_GAP_THRESHOLD_MIN = 15;
