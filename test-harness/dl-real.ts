/**
 * Download REAL open-access media files using undici ProxyAgent
 */
import { ProxyAgent, fetch } from "undici";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, "..", "public", "media");
const proxyAgent = new ProxyAgent("http://127.0.0.1:7897");

async function dl(url: string, filename: string, desc: string) {
  const dest = path.join(OUT, filename);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 5000) {
    console.log(`  SKIP ${filename} (exists, ${(fs.statSync(dest).size/1024).toFixed(1)}KB)`);
    return true;
  }
  console.log(`  GET ${desc}...`);
  try {
    const resp = await fetch(url, { dispatcher: proxyAgent, headers: { "User-Agent": "LabNote/1.0" } });
    if (!resp.ok) { console.log(`  FAIL ${resp.status}`); return false; }
    const buf = Buffer.from(await resp.arrayBuffer());
    fs.writeFileSync(dest, buf);
    console.log(`  OK ${filename} (${(buf.length/1024).toFixed(1)}KB)`);
    return true;
  } catch (e: any) { console.log(`  FAIL ${e.message}`); return false; }
}

async function main() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });
  console.log("Downloading REAL open-access scientific media...\n");

  // 1. SEM gold nanoparticles — direct from Wikimedia (real image)
  await dl(
    "https://upload.wikimedia.org/wikipedia/commons/0/0d/Gold_nanoparticle_SEM.jpg",
    "gold-nanoparticles.jpg", "Gold NP SEM (Wikimedia)"
  );

  // 2. HeLa cells — direct from NIH via Wikimedia (real image)
  await dl(
    "https://upload.wikimedia.org/wikipedia/commons/3/3e/HeLa_cells_stained_with_Hoechst_33258.jpg",
    "hela-cells.jpg", "HeLa cells fluorescence (Wikimedia)"
  );

  // 3. Cell migration video — PMC/NIH Journal of Cell Biology (CC BY 4.0)
  await dl(
    "https://movie.rupress.org/media/by_doi/10.1083/jcb.202010154.v2.mp4/source",
    "cell-migration.mp4", "Cell migration JCB video"
  );

  // 4. Normal heartbeat audio — PhysioNet Challenge 2016 via PhysioNet archive
  await dl(
    "https://physionet.org/files/challenge-2016/1.0.0/training/a0001.wav?download=1",
    "heartbeat.wav", "Heart sound PhysioNet"
  );

  // 5. Chest X-ray image — NIH Clinical Center (CC BY 4.0)
  await dl(
    "https://upload.wikimedia.org/wikipedia/commons/1/1d/Chest_X-ray_in_influenza_and_Haemophilus_influenzae.jpg",
    "chest-xray.jpg", "Chest X-ray (Wikimedia/NIH)"
  );

  console.log("\nDone. Files:");
  for (const f of fs.readdirSync(OUT).sort()) {
    const sz = fs.statSync(path.join(OUT, f)).size;
    console.log(`  ${f} (${(sz/1024).toFixed(1)}KB)`);
  }
}

main();
