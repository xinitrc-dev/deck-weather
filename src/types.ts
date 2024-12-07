/**
 * User-provided settings for {@link DisplayWeather}.
 */
type WeatherSettings = {
	openweatherApiKey: string;
	latLong: string;
	refreshTime: number;
};

type WeatherActionSettings = {
  intervalId?: number;
  debounceStart?:number;
}

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

type Memo = {
  get: Function,
  set: Function,
  isEmpty:Function
}

export { WeatherSettings, WeatherActionSettings, WeatherData, OpenWeatherResponse, Memo };