# Deck Weather, a StreamDeck Plugin
Displays the weather conditions at a location of your choosing. Press the button and/or set an update interval to get the latest conditions. Requires a free [OpenWeather](https://openweathermap.org/) account.

## Configuring
1. *OpenWeather API key (required).* Go to https://openweathermap.org/, create an account, and generate a key.
2. *Latitude/Longitude (required).* The coordinates of the location you Deck Weather to display.
    - The easiest way to get these is by right-clicking on the desired location in Google Maps. The first item in the context menu that appears are the location's coordinates, click it to copy them to your clipboard. You can then paste it right into the plugin's setting.
3. *Update Interval (optional).* The interval, in minutes, that Deck Weather should automatically fetch new weather information.

The plugin will automatically update weather conditions when you make a change to the configuration.

## Developing
First, install the StreamDeck CLI tools:
```
npm install -g @elgato/cli
```

After cloning the branch, start the plugin locally to test behavior pre-build:
```
npm run watch
```

If the plugin is not picking up code changes, try escalating through these troubleshooting steps:
- Kill and restart the `watch` process.
- Uninstall the plugin from the Stream Deck app and "reinstall" by running `streamdeck link com.luke-abel.deck-weather.sdPlugin`
- Quit and restart the Stream Deck app.

To package your changes:
```
streamdeck pack com.luke-abel.deck-weather.sdPlugin -f
```

## Other Stuff
"Grid Over Cloud" and "Cloud" icons were made using free icons from [Freepik](https://www.freepik.com/).