import { streamDeck } from "@elgato/streamdeck";
import { LocalWeatherSettings, Memo } from '../types'

/**
 * A closure around a value, in this case a LocalWeatherSettings instance.
 * Allows for recurring access to the value within the scope of an action.
 * @returns Object with .get() and .set()
 */
function createSettingsMemo(): Memo {
  streamDeck.logger.info('Creating settings memo');
  let settings = {
    openweatherApiKey: '',
    latLong: '',
    refreshTime: 0
  };

  return {
    get: function (): LocalWeatherSettings {
      return settings;
    },
    set: function (newSettings: LocalWeatherSettings) {
      settings = newSettings;
    }
  };
}

/**
 * Rules for whether to memoize a value.
 * @returns Boolean value on whether memoization occurred.
 */
function memoizeSettings(memo: Memo, newSettings: LocalWeatherSettings): Boolean {
  streamDeck.logger.info(`Memoizing settings: ${newSettings.refreshTime || 0}min`);
	const currentSettings = memo.get();
	const hasNewValue = currentSettings.refreshTime !== newSettings.refreshTime
		|| currentSettings.openweatherApiKey !== newSettings.openweatherApiKey
		|| currentSettings.latLong !== newSettings.latLong;

	if (hasNewValue) {
		streamDeck.logger.info('New settings detected');
		memo.set(newSettings);
		return true;
	}

  streamDeck.logger.info('Existing settings detected');
	return false;
}

export { createSettingsMemo, memoizeSettings };