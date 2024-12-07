import { streamDeck } from "@elgato/streamdeck";
import { WeatherSettings, Memo } from '../types'

/**
 * A closure around a value, in this case a WeatherSettings instance.
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
    get: function (): WeatherSettings {
      return settings;
    },
    set: function (newSettings: WeatherSettings) {
      settings = newSettings;
    },
    isEmpty: function (): Boolean {
      if (!!settings.openweatherApiKey) {
        return true;
      }
      return false;
    }
  };
}

/**
 * Rules for whether to memoize a value.
 * @returns Boolean value on whether memoization occurred.
 */
function memoizeSettings(memo: Memo, newSettings: WeatherSettings): Boolean {
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