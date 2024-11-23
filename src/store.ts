import { LocalWeatherSettings } from './types'

function createSettingsStore() {
  let settings = {};
  let version = 0;

  return {
    get: function () {
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