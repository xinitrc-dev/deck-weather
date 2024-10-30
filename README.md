# Local Weather StreamDeck Plugin
Displays the weather conditions at a location of your choosing. Press the button and/or set an update interval to get the latest conditions.

## Configuring for use:
1. *OpenWeather API key (required).* Go to https://openweathermap.org/, create an account, and generate a key.
2. *Latitude/Longitude (required).* The coordinates of the location you LocalWeather to display.
    - The easiest way to get these is by right-clicking on the desired location in Google Maps. The first item in the context menu that appears are the location's coordinates, click it to copy them to your clipboard. You can then paste it right into the plugin's setting.
3. *Update Interval (optional).* The interval, in minutes, that Local Weather should automatically fetch new weather information. Must be an integer. If 0, some non-integer value (e.g. '4.5'), or left blank, Local Weather will not do any automatic fetching.

## Developing
First, install the StreamDeck CLI tools:
```
npm install -g @elgato/cli
```

To package the plugin:
```
streamdeck pack com.luke-abel.local-weather.sdPlugin -f
```
