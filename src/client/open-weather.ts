import { streamDeck } from "@elgato/streamdeck";
import * as https from 'https';
import { WeatherData } from '../types'

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

export { openweatherData }