import { DIM_SUM_DISHES, DIM_SUM_IMAGE_BASE } from './dim-sum-catalog';

// The dim sum surprise: roughly 1 in 10 page loads after sign-in shows one dish. It cannot
// be turned off, fires at most once per page load, never steals focus, and is skipped on
// pages where the user is in the middle of something (setup, errors, an open dialog).

export const DIM_SUM_CHANCE = 0.1;

export function dishAt(index) {
  const row = DIM_SUM_DISHES[index % DIM_SUM_DISHES.length];
  const [id, en, zh, file, altEn, altYue] = row;
  return { id, en, zh, image: `${DIM_SUM_IMAGE_BASE}${file}`, altEn, altYue };
}

export function rollDimSum({ random = Math.random, blocked = false } = {}) {
  if (blocked) return null;
  if (random() >= DIM_SUM_CHANCE) return null;
  return dishAt(Math.floor(random() * DIM_SUM_DISHES.length));
}

export const dimSumCount = () => DIM_SUM_DISHES.length;
