import { action, streamDeck, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
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

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<LocalWeatherSettings>): Promise<void> {
		streamDeck.logger.info('----------DIDRECEIVE');
		return beginInterval(ev, true);
	}

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
		return beginInterval(ev, false);
	}
}

/**
 * If configured, wraps setKeyInfo in an interval. Otherwise, simply passes-through to setKeyInfo.
 */
async function beginInterval(ev: DidReceiveSettingsEvent|WillAppearEvent|KeyDownEvent, refreshInterval: boolean) {
	const { interval, intervalId } = await streamDeck.settings.getGlobalSettings() as LocalWeatherSettings;	
	const ms = await getIntervalMs(ev);

	if (refreshInterval) {
		clearInterval(intervalId);
	}

	if (ms > 0 && !intervalId) {
		const clampedMs = Math.min(Math.max(ms, 36000000), 6000);
		streamDeck.logger.info('----------USEINTERVAL');
		const intervalId = setInterval(setKeyInfo, clampedMs, ev, true)[Symbol.toPrimitive]();		;
		streamDeck.logger.info(`----------INTERVALID ${intervalId}`);
		ev.action.setSettings({ intervalId })
	}
	streamDeck.logger.info('----------NOINTERVAL');
	return setKeyInfo(ev, false)
}

/**
 * Retrieve the user's provided interval setting, parsing the value,
 * clamping it between 0 and 60, and converting to milliseconds.
 */
async function getIntervalMs(ev: DidReceiveSettingsEvent|WillAppearEvent|KeyDownEvent): Promise<number> {
	const { interval } = await streamDeck.settings.getGlobalSettings() as LocalWeatherSettings;	
	const sec = parseInt(interval, 10);
	streamDeck.logger.info(`----------INTERVAL ${sec}`);

	if (sec > 0) {
		return Math.min(Math.max(sec, 0), 60) * 60 * 1000;
	}

	return 0;
}

/**
 * Set the image and title of the key based on current weather information.
 */
async function setKeyInfo(ev: DidReceiveSettingsEvent|WillAppearEvent|KeyDownEvent, fromInterval: boolean): Promise<void> {
	if (fromInterval) {
		const { interval } = await streamDeck.settings.getGlobalSettings() as LocalWeatherSettings;	
		streamDeck.logger.info(`----------FROMINTERVAL ${interval}`);
	}

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

/**
 * User-provided settings for {@link DisplayWeather}.
 */
type LocalWeatherSettings = {
	openweatherApiKey: string;
	latLong: string;
	interval: string;
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