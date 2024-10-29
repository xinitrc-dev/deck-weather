import { action, streamDeck, DidReceiveSettingsEvent, KeyDownEvent, SingletonAction, WillAppearEvent } from "@elgato/streamdeck";
import * as https from 'https';

/**
 * An action class that displays the current temperature when the current button is pressed.
 */
@action({ UUID: "com.luke-abel.local-weather.display-weather" })
export class DisplayWeather extends SingletonAction<LocalWeatherSettings> {

	override onDidReceiveSettings(ev: DidReceiveSettingsEvent<LocalWeatherSettings>): void {
		// Handle the settings changing in the property inspector (UI).
		// streamDeck.logger.info('----------DEBUGGING didreceive');
		// streamDeck.logger.info(ev);
		// fetchWeather(ev);
	}

	/**
	 * The {@link SingletonAction.onWillAppear} event is useful for setting the visual representation of an action when it becomes visible. This could be due to the Stream Deck first
	 * starting up, or the user navigating between pages / folders etc.. There is also an inverse of this event in the form of {@link streamDeck.client.onWillDisappear}.
	 */
	override async onWillAppear(ev: WillAppearEvent<LocalWeatherSettings>): Promise<void> {
		streamDeck.logger.info('----------ONWILLAPPEAR');
		const settings = await fetchWeather(ev);
		return ev.action.setTitle(generateTitle(settings.temperature, settings.humidity, settings.windspeed));
	}

	/**
	 * Listens for the {@link SingletonAction.onKeyDown} event which is emitted by Stream Deck when an action is pressed. Stream Deck provides various events for tracking interaction
	 * with devices including key down/up, dial rotations, and device connectivity, etc. When triggered, {@link ev} object contains information about the event including any payloads
	 * and action information where applicable.
	 */
	override async onKeyDown(ev: KeyDownEvent<LocalWeatherSettings>): Promise<void> {
		streamDeck.logger.info('----------ONKEYDOWN');
		const settings = await fetchWeather(ev);
		ev.action.setImage('imgs/actions/01n@2x')
		return ev.action.setTitle(generateTitle(settings.temperature, settings.humidity, settings.windspeed));
	}
}

/**
 * Set weather information to the action settings.
 */
async function fetchWeather(ev: DidReceiveSettingsEvent|WillAppearEvent|KeyDownEvent) {
	const settings = ev.payload.settings as LocalWeatherSettings;
	const weather: WeatherData = await openweatherData(settings.openweatherApiKey, settings.latitude, settings.longitude);
	return {
		temperature: weather.temperature,
		humidity: weather.humidity,
		windspeed: weather.windspeed,
		description: weather.description,
		icon: weather.icon
	} as DisplayWeatherSettings;
}

function generateTitle(temp: number, humidity: number, windspeed: number) {
	const roundedTemp = Math.round((temp || 0) * 10) / 10
	const roundedWind = Math.round((windspeed || 0) * 10) / 10
	// return `${roundedTemp}°\n${humidity}%\n${roundedWind}mph`
	return `${humidity}%\n${roundedWind}mph`
}

async function openweatherData(apiKey: string, lat: string, lon: string) {
    return new Promise<WeatherData>((resolve, reject) => {
        const options = {
            hostname: 'api.openweathermap.org',
            port: 443,
            path: `/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`,
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
 * Settings for {@link DisplayWeather}.
 */
type LocalWeatherSettings = {
	// user-provided settings
	openweatherApiKey: string;
	latitude: string;
	longitude: string;
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