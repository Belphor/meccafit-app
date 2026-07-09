import { TEST_EXERCISE_CATALOG } from "@/lib/exercise-catalog";
import {
  CARDIO_CHECK_IN_WINDOW_MS,
  CARDIO_DEFAULT_GOAL_MS,
} from "@/lib/cardio-voo-cinzas";

const CARDIO_TEST_MODE =
  process.env.NODE_ENV !== "production" &&
  (process.env.NEXT_PUBLIC_CARDIO_TEST_MODE === "1" ||
    process.env.NEXT_PUBLIC_CARDIO_TEST_MODE === "true");

export function isCardioTestMode(): boolean {
  return CARDIO_TEST_MODE;
}

export function resolveCardioGoalMs(overrideMs?: number): number {
  if (typeof overrideMs === "number" && overrideMs > 0) return overrideMs;
  if (CARDIO_TEST_MODE) return TEST_EXERCISE_CATALOG.cardio.testGoalMs;
  return CARDIO_DEFAULT_GOAL_MS;
}

export function resolveCardioCheckInWindowMs(): number {
  if (CARDIO_TEST_MODE) return TEST_EXERCISE_CATALOG.cardio.testCheckInWindowMs;
  return CARDIO_CHECK_IN_WINDOW_MS;
}
