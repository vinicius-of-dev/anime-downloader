function addMagnets(
  { client, magnet, name },
  clientConfigs,
  output = "./downloads"
) {
  client.add(
    magnet,
    { ...clientConfigs, path: `${output}/${name}` },
    (torrent) => {
      torrent.on("done", () => {
        console.log("Finished file: ", name);
      });
      torrent.on("error", (err) => {
        console.error(`Error - ${name}\n`);
        console.log(err);
      });
      torrent.on("ready", () => {
        console.log("File ready to download: ", name);
      });
      const files = torrent.files;
      let length = files.length;
      console.log("Number of files: ", length);
      files.forEach((file) => {
        const source = file.createReadStream();
        const destination = fs.createWriteStream(file.name);
        source
          .on("end", () => {
            console.log("File: ", file.name);
            length -= 1;
            if (length === 0) process.exit();
          })
          .pipe(destination);
      });
    }
  );
}

/**
 * @param {Array<string>} titles
 * @returns {Array<string>} Array
 */

function numberOfEpisode(titles) {
  return titles.map((title) => {
    return title.slice(title.indexOf("—") + 1).trim();
  });
}

/**
 * @param {Array<string>} links
 */

function limitMagnetics(links, limit) {
  const filteredLinks = links.filter((el) => el !== nul).reverse();

  if (limit) {
    const limitedLinks = filteredLinks.splice(-limit);
    return limitedLinks;
  }

  return filteredLinks;
}

module.exports = { addMagnets, numberOfEpisode, limitMagnetics };
