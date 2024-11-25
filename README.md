# Local Weather StreamDeck Plugin
Displays the weather conditions at a location of your choosing. Press the button and/or set an update interval to get the latest conditions.

## Configuring for Use
1. *OpenWeather API key (required).* Go to https://openweathermap.org/, create an account, and generate a key.
2. *Latitude/Longitude (required).* The coordinates of the location you LocalWeather to display.
    - The easiest way to get these is by right-clicking on the desired location in Google Maps. The first item in the context menu that appears are the location's coordinates, click it to copy them to your clipboard. You can then paste it right into the plugin's setting.
3. *Update Interval (optional).* The interval, in minutes, that Local Weather should automatically fetch new weather information.

The plugin will "hot reload" weather conditions when you make a change to the configuration.

## Developing
First, install the StreamDeck CLI tools:
```
npm install -g @elgato/cli
```

Start the plugin locally to test behavior pre-build:
```
npm run watch
```

If the plugin is not picking up code changes, you may need to uninstall the plugin, kill and restart the `watch` process, and re-add the plugin in your Deck device. You may also need to relink the plugin to your StreamDeck instance using `streamdeck link com.luke-abel.local-weather.sdPlugin`.

To package the plugin:
```
streamdeck pack com.luke-abel.local-weather.sdPlugin -f
```
