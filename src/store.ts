import { LocalWeatherSettings } from './types'

function createSettingsStore() {
  let settings = {
    openweatherApiKey: '',
    latLong: '',
    refreshTime: 0
  };

  let version = 0;

  return {
    get: function (): LocalWeatherSettings {
      return settings;
    },
    set: function (newSettings: LocalWeatherSettings) {
      version++;
      settings = newSettings;
    },
    getVersion: function () {
      return version;
    },
  };
}

// TODO: create interval store?

export { createSettingsStore };