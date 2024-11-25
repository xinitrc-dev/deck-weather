import { streamDeck } from "@elgato/streamdeck";
import { LocalWeatherSettings, Memo } from '../types'

const DEBOUNCE_MS = 1000;

const debounceLogger = streamDeck.logger.createScope("Debounce")

/**
 * A closure around a value, in this case a debounce in epoch time.
 * Allows for recurring access to the value within the scope of an action.
 * @returns Object with .get() and .set()
 */
function createDebounceMemo(): Memo {
  streamDeck.logger.info('Creating debounce memo');
  let debounceTime = 0;

  return {
    get: function (): number {
      return debounceTime;
    },
    set: function (newDebounceTime: number) {
      debounceTime = newDebounceTime;
    }
  };
}

/**
 * Rules for whether to memoize a value.
 * @returns Boolean value on whether memoization occurred.
 */
function memoizeDebounce(memo: Memo, newDebounceTime: number): Boolean {
  streamDeck.logger.info(`Memoizing debounce: ${newDebounceTime}s`);

	const debounceTime = memo.get();
  if (debounceTime === 0) {
    memo.set(newDebounceTime)
    return true;
  }

  const elapsed = newDebounceTime - debounceTime;
	if (elapsed > DEBOUNCE_MS) {
		debounceLogger.info(`Elapsed ${elapsed}, resetting`);
		memo.set(newDebounceTime);
		return true;
	}

  debounceLogger.info(`Elapsed ${elapsed}, debouncing`);
	return false;
}

export { createDebounceMemo, memoizeDebounce };