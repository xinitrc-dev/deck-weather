import { streamDeck } from "@elgato/streamdeck";
import { LocalWeatherSettings, Store } from './types'

function createSettingsStore(): Store {
  let settings = {
    openweatherApiKey: '',
    latLong: '',
    refreshTime: 0
  };

  return {
    get: function (): LocalWeatherSettings {
      return settings;
    },
    set: function (newSettings: LocalWeatherSettings) {
      settings = newSettings;
    }
  };
}

function upsertSettings(store: Store, newSettings: LocalWeatherSettings): Boolean {
	const currentSettings = store.get();
	const hasNewValue = currentSettings.refreshTime !== newSettings.refreshTime
		|| currentSettings.openweatherApiKey !== newSettings.openweatherApiKey
		|| currentSettings.latLong !== newSettings.latLong;

	if (hasNewValue) {
		streamDeck.logger.info(`----------HASNEWVALUE ${newSettings.refreshTime}`);
		store.set(newSettings);
		return true;
	}

	streamDeck.logger.info(`----------HASCURRENTVALUE ${currentSettings.refreshTime}`);
	return false;
}


function createIntervalIdStore(): Store {
  let intervalId = 0;

  return {
    get: function (): Number {
      return intervalId;
    },
    set: function (newIntervalId: Number) {
      newIntervalId = intervalId;
    }
  };
}

function upsertIntervalId(store: Store, newIntervalId: Number): Boolean {
	const currentIntervalId = store.get();
	const hasNewValue = currentIntervalId !== newIntervalId;

	if (hasNewValue) {
		streamDeck.logger.info(`----------HASNEWINTERVALID ${newIntervalId}`);
		store.set(newIntervalId);
		return true;
	}

  return false;
}

// TODO: create interval store?
export { createSettingsStore, upsertSettings, createIntervalIdStore, upsertIntervalId };