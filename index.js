"use strict";

/**
 * @author Vinicius de Oliveira Fonseca <dev.vinicius.oliveirafonseca@gmail.com>
 */

const WebTorrent = require("webtorrent");
const fs = require("fs");
const config = require("./config.json");
const puppeteer = require("puppeteer");
const { log, addLog } = require("./modules/logger");
const { limitMagnetics } = require("./functions");

const {
  animes,
  urlBase,
  quality,
  webTorrentConfigs,
  clientConfigs,
  output,
  limitPerPage,
} = config;

console.log(
  "Configurações dos config.json, por favor, verifique antes de seguir com as ações..."
);
Object.entries(config).forEach((pair) => console.log(`${pair[0]}: ${pair[1]}`));

const client = new WebTorrent(webTorrentConfigs);

client.on("error", (err) => {
  console.error(err);
  process.exit(1);
});

client.on("torrent", (torrent) => {
  torrent.on("error", (err) => {
    console.error(`Error - ${torrent.name}`);
    console.log(err);
  });

  torrent.on("ready", () => {
    console.log("File ready to download: ", torrent.name);
  });
});

animes.map(async (name) => {
  try {
    const browser = await puppeteer.launch({ slowMo: 500 });
    const page = await browser.newPage();
    await page.goto(`${urlBase}/${name}`, {
      waitUntil: "networkidle2",
    });

    /**
     * @description Getting all magnetic links from the chosen provider.
     * @type {Array<string>}
     */
    const divDownload = await page.$$eval(
      ".show-release-item a",
      (result, [quality]) => {
        return result.map((element, i) => {
          if (
            element.innerText === "Magnet" &&
            String(element.href).match(String(quality).toLocaleLowerCase())
          ) {
            return element.href;
          }
        });
      },
      [quality]
    );

    // Getting all the titles. NOT IN USE.
    // const titles = await page.$$eval("label.episode-title", (elements) =>
    //   elements.map((element) => element.innerText)
    // );

    await browser.close();

    // Filtering the null values from divDownload
    const filteredMagneticLinks = limitMagnetics(divDownload, limitPerPage);
    // const numbers = numberOfEpisode(titles); NOT IN USE.

    const logInterval = setInterval(log, 5000);

    await filteredMagneticLinks.forEach((magnet) => {
      client.add(
        magnet,
        { ...clientConfigs, path: `${output}/${name}` },
        (torrent) => {
          const files = torrent.files;
          files.forEach((file) => {
            if (fs.existsSync(`${output}/${name}/${file.name}`)) {
              torrent.destroy();
              return;
            }

            const addLogInterval = setInterval(
              () => addLog({ name: file.name, progress: file.progress }),
              5000
            );

            // const interval = setInterval(() => {
            //   console.log(file.name + " => " + file.progress * 100 + "%");
            // }, 5000);

            const source = file.createReadStream();
            const destination = fs.createWriteStream(
              `${output}/${name}/${file.name}`
            );

            source
              .on("end", () => {
                console.log("Download Completed! ==> ", file.name);
              })
              .pipe(destination);
          });
        }
      );
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
});
