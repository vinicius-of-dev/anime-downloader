"use strict";

/**
 * @author Vinicius de Oliveira Fonseca <dev.vinicius.oliveirafonseca@gmail.com>
 */

const logs = {};

function log() {
  console.clear();

  if (Object.entries.length > 0) {
    Object.entries(logs).forEach((pair) => {
      const [name, progress] = pair;
      console.log(downloadIndicator({ name, progress }));
    });
  } else console.log("Esperando registros...");
}

/**
 * @param {Object} properties
 * @param {string} properties.name Name of file that are downloading.
 * @param {number} properties.progress Progress number (0-1).
 */

function downloadIndicator({ name, progress }) {
  const percentage = (progress * 100).toFixed();
  const times = Math.floor((progress * 100) / 10);

  return `${name} - <${"=".repeat(times)}> - ${percentage}%`;
}

/**
 * @param {Object} properties
 * @param {string} properties.name Name of file that are downloading.
 * @param {number} properties.progress Progress number (0-1).
 * @description It controls the state of the logs. To add a new log, pass down a object containing the name<string> as key and progress<any> to work receive a log.
 */

function addLog({ name, progress }) {
  if (progress === 1) {
    delete logs[name];
    return true;
  }

  logs[name] = progress;
}

module.exports = { log, addLog };
