import { streamDeck } from "@elgato/streamdeck";
import { WeatherData, Memo } from '../types'

const DEBOUNCE_MS = 1000;

const debounceLogger = streamDeck.logger.createScope("Debounce")

/**
 * A closure around a value, in this case a debounce in epoch time.
 * Allows for recurring access to the value within the scope of an action.
 * @returns Object with .get() and .set()
 */
function createWeatherDataMemo(): Memo {
  streamDeck.logger.info('Creating weatherData memo');
  let weatherData = {
    temperature: 0,
		humidity: 0,
		windspeed: 0,
    description: '',
    icon: ''
  };

  return {
    get: function (): WeatherData {
      return weatherData;
    },
    set: function (newWeatherData: WeatherData) {
      weatherData = newWeatherData;
    },
    isEmpty: function (): Boolean {
      if (weatherData.temperature === 0 && weatherData.humidity === 0) {
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
function memoizeWeatherData(memo: Memo, newWeatherData: WeatherData): Boolean {
  streamDeck.logger.info(`Memoizing weatherData: ${newWeatherData.temperature}°F`);
  memo.set(newWeatherData)
  return true;
}

export { createWeatherDataMemo, memoizeWeatherData };