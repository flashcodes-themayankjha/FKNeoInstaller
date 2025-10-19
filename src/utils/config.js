import Conf from "conf";

const config = new Conf({
  projectName: "fkneo-cli",
  defaults: {
    "github.username": null,
    "github.token": null,
    "user.name": null,
    "user.email": null,
  },
});

export function getConfig(key) {
  return config.get(key);
}

export function setConfig(key, value) {
  config.set(key, value);
}

export function clearConfig() {
  config.clear();
}
