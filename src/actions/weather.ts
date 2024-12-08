import {
	DialAction,
	DidReceiveGlobalSettingsEvent,
	KeyAction,
	KeyDownEvent,
	SingletonAction,
	WillAppearEvent,
	action,
	streamDeck,
} from "@elgato/streamdeck";
import { clear } from "console";
import {
	createDebounceMemo,
	memoizeDebounce,
} from '../memo/debounce'
import {
	createSettingsMemo,
	memoizeSettings,
} from '../memo/weather-settings'
import { openweatherData } from '../client/openweather'
import { WeatherSettings, WeatherActionSettings, WeatherData } from '../types'
import { createWeatherDataMemo, memoizeWeatherData } from "../memo/weather-data";

const UUID = "com.luke-abel.deck-weather.weather";

// These values clamp the refresh interval, to prevent excess API requests.
const REFRESH_MIN_SEC = 3;
const REFRESH_MAX_SEC = 60;
const MS_IN_SEC = 60000;
const DEBOUNCE_MS = 1000;

// These icons are part of the current OpenWeather API specification.
const VALID_ICONS = [
	'01d', '01n', '02d', '02n', '03d', '03n',
	'04d', '04n', '09d', '09n', '10d', '10n',
	'11d', '11n', '13d', '13n', '50d', '50n',
];

const settingsMemo = createSettingsMemo();
const debounceMemo = createDebounceMemo();
const weatherDataMemo = createWeatherDataMemo();

/**
 * An action class that displays current weather information when the current button is pressed.
 */
@action({ UUID })
export class Weather extends SingletonAction<WeatherSettings> {
	/**
	 * The {@link SingletonAction.onWillAppear} event is useful for setting the
	 * visual representation of an action when it becomes visible.
	 * This could be due to the Stream Deck first starting up, or the user navigating between pages / folders etc.
	 */
	override async onWillAppear(ev: WillAppearEvent<WeatherSettings>): Promise<void> {
		const settings = await streamDeck.settings.getGlobalSettings() as WeatherSettings;	
		memoizeSettings(settingsMemo, settings);
		return beginInterval(ev.action, settingsMemo.get().refreshTime);
	}

	/**
	 * Listens for the {@link SingletonAction.onKeyDown} event,
	 * which is emitted by Stream Deck when an action is pressed.
	 */
	override async onKeyDown(ev: KeyDownEvent<WeatherSettings>): Promise<void> {
		const settings = await streamDeck.settings.getGlobalSettings() as WeatherSettings;	
		memoizeSettings(settingsMemo, settings);
		return beginInterval(ev.action, settingsMemo.get().refreshTime);
	}
}

/**
 * This hook provides "hot reloading" of the plugin when settings are changed.
 */
streamDeck.settings.onDidReceiveGlobalSettings((ev: DidReceiveGlobalSettingsEvent<WeatherSettings>) => {
	streamDeck.logger.info(`Detected global settings event (refreshTime: ${ev.settings.refreshTime || 0}min)`);
	const settingsDidChange = memoizeSettings(settingsMemo, ev.settings);
	if (settingsDidChange) {
		streamDeck.logger.info('Detected settings change, triggering interval');
		const action = streamDeck.actions.find((a) => a.manifestId === UUID);
		if (action) {
			return beginInterval(action, settingsMemo.get().refreshTime);
		}
	}
});

/**
 * If provided with refreshTime, wraps setKeyInfo in an interval. Otherwise,
 * simply passes-through to setKeyInfo. If indicated to clearRefresh, will
 * clear the current refresh interval (and set a new one if refreshTime).
 */
async function beginInterval(action: DialAction|KeyAction, refreshTime: number) {
	await endInterval(action);
	const ms = getRefreshTimeMs(refreshTime);

	// If refreshTime has been set and no interval has, start the interval with the refreshTime.
	if (ms > 0) {
		const clampedMs = clamp(ms, 300000, 36000000);
		streamDeck.logger.info(`Creating inverval with ${clampedMs}ms`);
		let intervalId = setInterval(setKeyInfo, clampedMs, action, true)[Symbol.toPrimitive]();		;
		streamDeck.logger.info(`Interval ${intervalId} created`);
		action.setSettings({ intervalId })
	}

	// Always update the weather. Even if the user has auto-refresh set, they can update the weather manually.
	return setKeyInfo(action, false);
}

/**
 * End the interval saved to the action.
 * If an interval is cleared, return true.
 * @param action 
 * @returns 
 */
async function endInterval(action: DialAction|KeyAction) {
	let { intervalId } = await action.getSettings() as WeatherActionSettings;
	if (intervalId) {
		streamDeck.logger.info(`Clearing interval ${intervalId}`);
		clearInterval(intervalId);
		action.setSettings({ intervalId: undefined })
	}
}

/**
 * Retrieve the user's provided interval setting, parsing the value.
 * If it is 0 or blank, return 0.
 * If between 3 and 60, and converting to milliseconds.
 */
function getRefreshTimeMs(refreshTime: number): number {
	if (refreshTime >= REFRESH_MIN_SEC && refreshTime <= REFRESH_MAX_SEC) {
		return clamp(refreshTime, REFRESH_MIN_SEC, REFRESH_MAX_SEC) * MS_IN_SEC;
	}
	return 0;
}

/**
 * Set the image and title of the key based on current weather information.
 */
async function setKeyInfo(action: DialAction|KeyAction, fromInterval: boolean): Promise<void> {
	streamDeck.logger.info(`Setting keyInfo ${fromInterval ? 'from interval' : 'not from interval'}`);

	const { openweatherApiKey, latLong } = settingsMemo.get() as WeatherSettings;

	if (!openweatherApiKey) {
		action.setImage(`imgs/actions/weather/unknown`);
		return action.setTitle(generateErrorTitle("API Key?"));
	}

	if (!latLong) {
		action.setImage(`imgs/actions/weather/unknown`);
		return action.setTitle(generateErrorTitle("Lat/Long?"));
	}

	try {
		const { temperature, humidity, windspeed, icon } = await fetchWeather();
		if (VALID_ICONS.includes(icon)) {
			action.setImage(`imgs/actions/weather/${icon}`);
		} else {
			action.setImage(`imgs/actions/weather/unknown`);
		}
		return action.setTitle(generateTitle(temperature, humidity, windspeed));
	} catch(e) {
		action.setImage(`imgs/actions/weather/unknown`);
		return action.setTitle(generateErrorTitle("Error!"));
	}
}

/**
 * Gather weather information from API fetch.
 * Because 
 */
async function fetchWeather(): Promise<WeatherData> {
	streamDeck.logger.info('Fetching weather data');
	const now = Date.now();

	// If a new debounce time can be memoized, the debounce period has elapsed
	// and we can fetch+memoize new data.
	// If weatherData is empty, also make sure to fetch it.
	//
	// Bypassing debounce can lead to multiple requests (~3) when init-ing the plugin.
	// Currently OpenWeather allows for 1000 requests/day for free. At max refresh of 3min,
	// that is 480 possible requests/day. Shouldn't be an issue for most users.
	if (memoizeDebounce(debounceMemo, Date.now()) || weatherDataMemo.isEmpty()) {
		const { openweatherApiKey, latLong } = settingsMemo.get() as WeatherSettings;
		const weatherData = await openweatherData(openweatherApiKey, latLong);
		memoizeWeatherData(weatherDataMemo, weatherData);
		return weatherData;
	}

	// Otherwise, return memoized data.
	return weatherDataMemo.get();
}

/**
 * Generate formatted title containing weather information.
 */
function generateTitle(temp: number, humidity: number, windspeed: number): string {
	const roundedTemp = Math.round((temp || 0) * 10) / 10
	const roundedWind = Math.round((windspeed || 0) * 10) / 10
	return `${roundedTemp}°, ${humidity}%\n\n\n\n${roundedWind} mph`
}

function generateErrorTitle(message: string): string {
	return `\n\n\n\n${message}`
}

function clamp(value: number, min: number, max: number) {
	return Math.max(Math.min(value, max), min);
}