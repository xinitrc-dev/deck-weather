import { action, streamDeck, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import * as https from 'https';

const VALID_ICONS = [
	'01d', '01n', '02d', '02n', '03d', '03n',
	'04d', '04n', '09d', '09n', '10d', '10n',
	'11d', '11n', '13d', '13n', '50d', '50n',
];

/**
 * An action class that displays the current temperature when the current button is pressed.
 */
@action({ UUID: "com.luke-abel.local-weather.display-weather" })
export class DisplayWeather extends SingletonAction<LocalWeatherSettings> {

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<LocalWeatherSettings>): Promise<void> {
		streamDeck.logger.info('----------DIDRECEIVE');
		return setKeyInfo(ev);
	}

	/**
	 * The {@link SingletonAction.onWillAppear} event is useful for setting the visual representation of an action when it becomes visible. This could be due to the Stream Deck first
	 * starting up, or the user navigating between pages / folders etc.. There is also an inverse of this event in the form of {@link streamDeck.client.onWillDisappear}.
	 */
	override async onWillAppear(ev: WillAppearEvent<LocalWeatherSettings>): Promise<void> {
		streamDeck.logger.info('----------ONWILLAPPEAR');
		return setKeyInfo(ev);
	}

	/**
	 * Listens for the {@link SingletonAction.onKeyDown} event which is emitted by Stream Deck when an action is pressed. Stream Deck provides various events for tracking interaction
	 * with devices including key down/up, dial rotations, and device connectivity, etc. When triggered, {@link ev} object contains information about the event including any payloads
	 * and action information where applicable.
	 */
	override async onKeyDown(ev: KeyDownEvent<LocalWeatherSettings>): Promise<void> {
		streamDeck.logger.info('----------ONKEYDOWN');
		return setKeyInfo(ev);
	}
}

async function setKeyInfo(ev: DidReceiveSettingsEvent|WillAppearEvent|KeyDownEvent): Promise<void> {
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
async function fetchWeather() {
	const { openweatherApiKey, latLong } = await streamDeck.settings.getGlobalSettings() as LocalWeatherSettings;	
	const weather: WeatherData = await openweatherData(openweatherApiKey, latLong);
	return {
		temperature: weather.temperature,
		humidity: weather.humidity,
		windspeed: weather.windspeed,
		description: weather.description,
		icon: weather.icon
	} as DisplayWeatherSettings;
}

function generateTitle(temp: number, humidity: number, windspeed: number): string {
	const roundedTemp = Math.round((temp || 0) * 10) / 10
	const roundedWind = Math.round((windspeed || 0) * 10) / 10
	return `${roundedTemp}°, ${humidity}%\n\n\n\n${roundedWind} mph`
}

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

function splitLatLong(latLong: string) {
	const parts = latLong.split(",");

	// Extract latitude and longitude, removing any extra spaces
	const latitude = parts[0].trim();
	const longitude = parts[1].trim();
  
	// Return the latitude and longitude as separate strings
	return { latitude, longitude } as { latitude: string, longitude: string};
}

/**
 * Settings for {@link DisplayWeather}.
 */
type LocalWeatherSettings = {
	// user-provided settings
	openweatherApiKey: string;
	latLong: string;
	interval: string;
};

type DisplayWeatherSettings = {
	// data fetched from API
	temperature: number;
	humidity: number;
	windspeed: number;
	description: string;
	icon: string;
};

type WeatherData = {
    temperature: number;
	humidity: number;
	windspeed: number;
    description: string;
    icon: string
}

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