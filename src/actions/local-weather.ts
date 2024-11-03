import { action, streamDeck, KeyDownEvent, SingletonAction, WillAppearEvent, SendToPluginEvent } from "@elgato/streamdeck";
import { clear } from "console";
import * as https from 'https';

// These icons are part of the current OpenWeather API specification.
const VALID_ICONS = [
	'01d', '01n', '02d', '02n', '03d', '03n',
	'04d', '04n', '09d', '09n', '10d', '10n',
	'11d', '11n', '13d', '13n', '50d', '50n',
];

/**
 * An action class that displays current weather information when the current button is pressed.
 */
@action({ UUID: "com.luke-abel.local-weather.display-weather" })
export class DisplayWeather extends SingletonAction<LocalWeatherSettings> {

	// override async onSendToPlugin(ev: SendToPluginEvent<LocalWeatherSettings, LocalWeatherSettings>): Promise<void> {
	// 	streamDeck.logger.info('----------SENDTOPLUGIN');
	// 	return beginInterval(ev, true);
	// }

	/**
	 * The {@link SingletonAction.onWillAppear} event is useful for setting the
	 * visual representation of an action when it becomes visible.
	 * This could be due to the Stream Deck first starting up, or the user navigating between pages / folders etc.
	 */
	override async onWillAppear(ev: WillAppearEvent<LocalWeatherSettings>): Promise<void> {
		streamDeck.logger.info('----------ONWILLAPPEAR');
		return beginInterval(ev, false);
	}

	/**
	 * Listens for the {@link SingletonAction.onKeyDown} event,
	 * which is emitted by Stream Deck when an action is pressed.
	 */
	override async onKeyDown(ev: KeyDownEvent<LocalWeatherSettings>): Promise<void> {
		streamDeck.logger.info('----------ONKEYDOWN');
		return beginInterval(ev, true);
	}
}

/**
 * If configured, wraps setKeyInfo in an interval. Otherwise, simply passes-through to setKeyInfo.
 */
async function beginInterval(ev: WillAppearEvent|KeyDownEvent, clearRefresh: boolean) {
	const { refreshTime } = await streamDeck.settings.getGlobalSettings() as LocalWeatherSettings;	
	let { intervalId } = await ev.action.getSettings() as LocalWeatherSettings;	
	const ms = await getRefreshTimeMs(ev);

	// Clear the auto-refresh, likely because the user has provided a new refreshTime.
	if (intervalId && clearRefresh) {
		streamDeck.logger.info(`----------CLEARINTERVAL ${intervalId}`);
		clearInterval(intervalId);
		intervalId = undefined;
	}

	// If refreshTime has been set and no interval has, start the interval with the refreshTime.
	if (ms > 0 && !intervalId) {
		streamDeck.logger.info('----------USEINTERVAL');
		streamDeck.logger.info(`----------MS ${ms}`);
		const clampedMs = clamp(ms, 300000, 36000000);
		streamDeck.logger.info(`----------CLAMPEDMS ${clampedMs}`);
		const intervalId = setInterval(setKeyInfo, clampedMs, ev, true)[Symbol.toPrimitive]();		;
		streamDeck.logger.info(`----------INTERVALID ${intervalId}`);
		ev.action.setSettings({ intervalId })
	}

	// Always update the weather. Even if the user has auto-refresh set, they can update the weather manually.
	streamDeck.logger.info('----------NOINTERVAL');
	return setKeyInfo(ev, false)
}

/**
 * Retrieve the user's provided interval setting, parsing the value.
 * If it is 0 or blank, return 0.
 * If between 5 and 60, and converting to milliseconds.
 */
async function getRefreshTimeMs(ev: WillAppearEvent|KeyDownEvent): Promise<number> {
	const { refreshTime } = await streamDeck.settings.getGlobalSettings() as LocalWeatherSettings;	
	streamDeck.logger.info(`----------SEC ${refreshTime}`);

	if (refreshTime > 4) {
		return clamp(refreshTime, 5, 60) * 60 * 1000;
	}

	return 0;
}

/**
 * Set the image and title of the key based on current weather information.
 */
async function setKeyInfo(ev: WillAppearEvent|KeyDownEvent, fromInterval: boolean): Promise<void> {
	if (fromInterval) {
		const { refreshTime } = await streamDeck.settings.getGlobalSettings() as LocalWeatherSettings;	
		streamDeck.logger.info(`----------FROMINTERVAL ${refreshTime}`);
	}

	// streamDeck.logger.info(`----------PSUEDOFETCH`);
	// return ev.action.setTitle('PSUEDO');
	const { temperature, humidity, windspeed, icon } = await fetchWeather();
	if (VALID_ICONS.includes(icon)) {
		// TODO: add unknown icon
		ev.action.setImage(`imgs/actions/display-weather/${icon}`);
	}
	return ev.action.setTitle(generateTitle(temperature, humidity, windspeed));
}

/**
 * Gather weather information from API fetch.
 */
async function fetchWeather(): Promise<WeatherData> {
	const { openweatherApiKey, latLong } = await streamDeck.settings.getGlobalSettings() as LocalWeatherSettings;	
	return await openweatherData(openweatherApiKey, latLong);
}

/**
 * Generate formatted title containing weather information.
 */
function generateTitle(temp: number, humidity: number, windspeed: number): string {
	const roundedTemp = Math.round((temp || 0) * 10) / 10
	const roundedWind = Math.round((windspeed || 0) * 10) / 10
	return `${roundedTemp}°, ${humidity}%\n\n\n\n${roundedWind} mph`
}

/**
 * Request weather information from OpenWeather and format the response.
 */
async function openweatherData(apiKey: string, latLong: string) {
	const { latitude, longitude } = splitLatLong(latLong)
    return new Promise<WeatherData>((resolve, reject) => {
        const options = {
            hostname: 'api.openweathermap.org',
            port: 443,
            path: `/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=imperial`,
            method: 'GET',
			headers: {
				'Content-Type': 'application/json',
			}
        };

		streamDeck.logger.info('----------REQUEST');
		streamDeck.logger.info(options);

        const req = https.request(options, (res) => {
            let data = '';

            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);

					streamDeck.logger.info('----------RESPONSE');
					streamDeck.logger.info(jsonData);

                    // Extract relevant weather information
                    const temperature = jsonData.main.temp;
                    const humidity = jsonData.main.humidity;
                    const windspeed = jsonData.wind.speed;
                    const description = jsonData.weather[0].description;
                    const icon = jsonData.weather[0].icon;

                    resolve({ temperature, humidity, windspeed, description, icon } as WeatherData);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

/**
 * Convert user-provided latitude and longitude into values that can be used with the OpenWeather API.
 */
function splitLatLong(latLong: string) {
	const parts = latLong.split(",");

	const processCoordinate = (coord: string) => {
		// Remove excess whitespace
        coord = coord.trim();
		// Remove W/S and add negative sign
        if (coord.endsWith("W") || coord.endsWith("S")) {
            coord = "-" + coord.slice(0, -1);
        }
		// Remove degree symbol
        coord = coord.replace("°", "");
        return coord;
    };

	// Extract latitude and longitude, removing any extra spaces
	const latitude = processCoordinate(parts[0]);
	const longitude = processCoordinate(parts[1]);
  
	// Return the latitude and longitude as separate strings
	return { latitude, longitude } as { latitude: string, longitude: string};
}

function clamp(value: number, min: number, max: number) {
	return Math.max(Math.min(value, max), min);
}

/**
 * User-provided settings for {@link DisplayWeather}.
 */
type LocalWeatherSettings = {
	openweatherApiKey: string;
	latLong: string;
	refreshTime: number;
	intervalId?: number;
};

type WeatherActionSettings = {
};

/**
 * Data fetched from the OpenWeatherAPI.
 */
type WeatherData = {
    temperature: number;
		humidity: number;
		windspeed: number;
    description: string;
    icon: string
}

/**
 * Shape of the OpenWeather API response.
 */
type OpenWeatherResponse = {
	weather: {
        description: string;
        icon: string;
    }[];
    main: {
        temp: number;
		humidity: number;
    };
	wind: {
		speed: number;
	};
	name: string;
};