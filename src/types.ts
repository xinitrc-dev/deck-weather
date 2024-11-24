/**
 * User-provided settings for {@link DisplayWeather}.
 */
type LocalWeatherSettings = {
	openweatherApiKey: string;
	latLong: string;
	refreshTime: number;
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

type Store = {
  get: Function,
  set: Function
}

export { LocalWeatherSettings, WeatherData, OpenWeatherResponse, Store };