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

    await browser.close();

    // Filtering the null values from divDownload
    const filteredMagneticLinks = limitMagnetics(divDownload, limitPerPage);

    const logInterval = setInterval(log, 5000);

    let downloadNumbers = filteredMagneticLinks.length;

    filteredMagneticLinks.forEach((magnet) => {
      client.add(
        magnet,
        { ...clientConfigs, path: `${output}/${name}` },
        (torrent) => {
          const files = torrent.files;
          files.forEach((file) => {
            if (fs.existsSync(`${output}/${name}/${file.name}`)) {
              downloadNumbers -= 1;
              torrent.destroy();
              return;
            }

            setInterval(
              () => addLog({ name: file.name, progress: file.progress }),
              5000
            );

            const source = file.createReadStream();
            const destination = fs.createWriteStream(
              `${output}/${name}/${file.name}`
            );

            source
              .on("end", () => {
                console.log("Download Completed! ==> ", file.name);
                if (downloadNumbers === 0) {
                  console.log("Finished Download!");
                  process.exit(0);
                }

                downloadNumbers -= 1;
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
