/**
 * Vercel build-time media downloader
 * Vercel's build environment has unrestricted internet access
 */
import { writeFileSync, mkdirSync, existsSync } from "fs";

const OUT = "public/media";
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

const FILES = [
  // Real cell migration time-lapse from JCB (CC BY 4.0)
  {
    url: "https://movie.rupress.org/media/by_doi/10.1083/jcb.202010154.v2.mp4/source",
    name: "cell-migration.mp4",
  },
  // HeLa cells fluorescence microscopy (CC BY, Wikimedia)
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/3/3e/HeLa_cells_stained_with_Hoechst_33258.jpg",
    name: "hela-cells.jpg",
  },
  // Gold nanoparticles SEM (CC BY, Wikimedia)
  {
    url: "https://upload.wikimedia.org/wikipedia/commons/0/0d/Gold_nanoparticle_SEM.jpg",
    name: "gold-nanoparticles.jpg",
  },
  // Normal heartbeat audio - PhysioNet Challenge 2016 (CC BY 4.0)
  {
    url: "https://physionet.org/files/challenge-2016/1.0.0/training/a0001.wav?download=1",
    name: "heartbeat.wav",
  },
  // arXiv paper (CC BY)
  {
    url: "https://arxiv.org/pdf/2406.06393.pdf",
    name: "paper.pdf",
  },
];

for (const { url, name } of FILES) {
  const dest = `${OUT}/${name}`;
  if (existsSync(dest)) {
    console.log(`SKIP ${name} (exists)`);
    continue;
  }
  console.log(`GET ${name} ...`);
  try {
    const resp = await fetch(url, {
      headers: { "User-Agent": "LabNote/1.0 (scientific data collection)" },
      signal: AbortSignal.timeout(60000),
    });
    if (!resp.ok) {
      console.log(`  FAIL ${resp.status}`);
      continue;
    }
    const buf = Buffer.from(await resp.arrayBuffer());
    writeFileSync(dest, buf);
    console.log(`  OK ${name} (${(buf.length / 1024).toFixed(0)} KB)`);
  } catch (e) {
    console.log(`  ERR ${name}: ${e.message}`);
  }
}

console.log("Done.");
