import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pub = join(__dirname, "..", "public");

const icon = (size, rx) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${rx}" fill="#f6d94e"/>
  <rect x="${size*0.25}" y="${size*0.2}" width="${size*0.5}" height="${size*0.07}" rx="${size*0.02}" fill="#16140a"/>
  <rect x="${size*0.25}" y="${size*0.33}" width="${size*0.35}" height="${size*0.07}" rx="${size*0.02}" fill="#16140a"/>
  <rect x="${size*0.25}" y="${size*0.46}" width="${size*0.4}" height="${size*0.07}" rx="${size*0.02}" fill="#16140a"/>
  <rect x="${size*0.25}" y="${size*0.59}" width="${size*0.3}" height="${size*0.07}" rx="${size*0.02}" fill="#16140a"/>
</svg>`;

writeFileSync(join(pub, "icon-192.svg"), icon(192, 40));
writeFileSync(join(pub, "icon-512.svg"), icon(512, 100));
// Also write as .png reference — browsers will use SVG fallback
writeFileSync(join(pub, "icon-192.png.svg"), icon(192, 40)); // rename handled below
console.log("Icons written to public/");
