import https from "https";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fontsDir = path.join(__dirname, "../public/fonts");

const fonts = [
  {
    name: "NotoSansDevanagari-Regular.ttf",
    url: "https://raw.githubusercontent.com/notofonts/noto-fonts/master/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf",
  },
  {
    name: "NotoSansDevanagari-Bold.ttf",
    url: "https://raw.githubusercontent.com/notofonts/noto-fonts/master/hinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Bold.ttf",
  },
];

if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
        return;
      }
      response.pipe(file);
      file.on("finish", () => {
        file.close(resolve);
      });
    }).on("error", (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
}

async function main() {
  console.log("Downloading Noto Sans Devanagari fonts to local public/fonts directory...");
  for (const font of fonts) {
    const dest = path.join(fontsDir, font.name);
    console.log(`Downloading ${font.name}...`);
    try {
      await downloadFile(font.url, dest);
      console.log(`Successfully downloaded ${font.name} to ${dest}`);
    } catch (err) {
      console.error(`Error downloading ${font.name}:`, err.message);
    }
  }
}

main();
