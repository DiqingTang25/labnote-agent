"""
Test Data Preparation Script for LabNote Agent
Downloads real open-source multimodal scientific data for pipeline testing.
Covers all required formats: MD, TXT, CSV, PDF, DOCX, XLSX, PNG, JPG, MP4, WAV, M4A

Experiments:
  1. Plant Electrophysiology (WAV, M4A, CSV, TXT, MD)
  2. T Cell Migration (MP4, CSV, XLSX, PDF, PNG)
  3. Spatial Transcriptomics (CSV, PNG, JPG, TXT, PDF)
  4. Materials Characterization (DOCX, XLSX, PNG, JPG, MD)
"""

import os
import sys
import json
import csv
import time
import shutil
import hashlib
import urllib.request
import urllib.error
from pathlib import Path
from io import BytesIO

BASE = Path(r"D:\labnote\labnote-vault-main\test-data")
OUTPUT = Path(r"D:\labnote\labnote-vault-main\test-harness\experiments.json")

# Proxy settings
PROXY = "http://127.0.0.1:7897"
os.environ["HTTP_PROXY"] = PROXY
os.environ["HTTPS_PROXY"] = PROXY

def setup_proxy():
    """Configure urllib proxy."""
    proxy_handler = urllib.request.ProxyHandler({
        "http": PROXY,
        "https": PROXY,
    })
    opener = urllib.request.build_opener(proxy_handler)
    urllib.request.install_opener(opener)

def download(url, dest, description="", max_retries=3):
    """Download a file with retries."""
    dest = Path(dest)
    if dest.exists() and dest.stat().st_size > 0:
        print(f"  [SKIP] {dest.name} — already exists ({dest.stat().st_size} bytes)")
        return True
    print(f"  [DOWNLOAD] {description or dest.name} ...")
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "LabNote-TestHarness/1.0"})
            with urllib.request.urlopen(req, timeout=120) as resp:
                data = resp.read()
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(data)
            print(f"  [OK] {dest.name} — {len(data)} bytes")
            return True
        except Exception as e:
            print(f"  [RETRY {attempt+1}/{max_retries}] {e}")
            time.sleep(3)
    print(f"  [FAIL] Could not download {url}")
    return False

def create_md(path, content):
    """Create a Markdown file."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(content, encoding="utf-8")
    print(f"  [CREATE] {Path(path).name}")

def create_txt(path, content):
    """Create a text file."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    Path(path).write_text(content, encoding="utf-8")
    print(f"  [CREATE] {Path(path).name}")

def create_csv(path, headers, rows):
    """Create a CSV file."""
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(headers)
        w.writerows(rows)
    print(f"  [CREATE] {Path(path).name} — {len(rows)} rows")

def create_xlsx(path):
    """Create a minimal XLSX (ZIP of XML). Real xlsx from openpyxl not available — use manual XML."""
    # Use a pre-built minimal xlsx approach
    import zipfile
    Path(path).parent.mkdir(parents=True, exist_ok=True)

    # Minimal XLSX content
    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>"""

    rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>"""

    wb_rels = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>"""

    workbook = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Sheet1" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>"""

    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("xl/workbook.xml", workbook)
        zf.writestr("xl/_rels/workbook.xml.rels", wb_rels)
        zf.writestr("xl/styles.xml", """<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>""")
        zf.writestr("xl/sharedStrings.xml", """<?xml version="1.0" encoding="UTF-8"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="0" uniqueCount="0"/>""")

    print(f"  [CREATE] {Path(path).name} (minimal XLSX)")

def create_docx(path, content_title, content_body):
    """Create a minimal DOCX (ZIP of XML)."""
    import zipfile
    Path(path).parent.mkdir(parents=True, exist_ok=True)

    content_types = """<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>"""

    rels = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>"""

    # Escape XML special chars in content
    def esc(s):
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

    paragraphs = ""
    # Title
    paragraphs += f"""<w:p><w:r><w:rPr><w:b/><w:sz w:val="32"/></w:rPr><w:t>{esc(content_title)}</w:t></w:r></w:p>"""
    # Body paragraphs
    for para in content_body.strip().split("\n\n"):
        para = para.strip()
        if para:
            paragraphs += f"""<w:p><w:r><w:t>{esc(para)}</w:t></w:r></w:p>"""

    document = f"""<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>{paragraphs}</w:body>
</w:document>"""

    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("word/document.xml", document)

    print(f"  [CREATE] {Path(path).name} (minimal DOCX)")


# ========== EXPERIMENT 1: Plant Electrophysiology ==========
def prepare_experiment_1():
    """Download plant electrophysiology data from TAMC-PLANTS (Zenodo)."""
    print("\n" + "="*70)
    print("EXPERIMENT 1: Plant Electrophysiology (植物电生理)")
    print("Data types: WAV, M4A, CSV, TXT, MD")
    print("Source: TAMC-PLANTS / Madariaga et al. 2024")
    print("="*70)

    d = BASE / "exp1-plant-electrophysiology"
    d.mkdir(parents=True, exist_ok=True)

    # 1. Download real plant electrophysiology WAV from Zenodo
    # TAMC-PLANTS companion dataset: 10.5281/zenodo.20577639
    # We'll try to download a sample WAV file
    wav_downloaded = download(
        "https://zenodo.org/records/20577639/files/dionaea_1_electrophysiology.wav?download=1",
        d / "dionaea_electrophysiology.wav",
        "Venus flytrap electrophysiology recording"
    )

    # Fallback: if Zenodo fails, try raw GitHub mirror or create metadata
    if not wav_downloaded:
        # Try alternative source — Buzsaki lab sample or create placeholder WAV
        print("  [INFO] Zenodo download failed, trying alternative...")
        # Create a minimal valid WAV header + synthetic signal for pipeline test
        create_synthetic_wav(d / "plant_electrical_recording.wav", duration_sec=3.0, sample_rate=44100)

    # 2. Create M4A from WAV using ffmpeg if available
    wav_src = d / "dionaea_electrophysiology.wav"
    if not wav_src.exists():
        wav_src = d / "plant_electrical_recording.wav"

    m4a_dest = d / "plant_recording.m4a"
    if wav_src.exists() and not m4a_dest.exists():
        m4a_created = convert_to_m4a(wav_src, m4a_dest)
        if not m4a_created:
            # Fallback: rename copy as M4A (the pipeline will still process it)
            print("  [WARN] ffmpeg not available for M4A conversion, copying WAV as M4A")
            shutil.copy(wav_src, m4a_dest)

    # 3. Create electrophysiological features CSV
    create_csv(d / "electrophysiology_features.csv",
        ["time_ms", "potential_mV", "spike_detected", "frequency_Hz", "amplitude_uV", "noise_floor_uV"],
        [
            ["0.0", "-62.3", "0", "0.0", "0.0", "12.5"],
            ["100.0", "-63.1", "0", "0.0", "0.0", "11.8"],
            ["200.0", "-58.7", "0", "0.0", "0.0", "12.1"],
            ["250.0", "-45.2", "1", "4.2", "8450.3", "11.9"],
            ["300.0", "-71.5", "0", "0.0", "0.0", "12.3"],
            ["400.0", "-64.8", "0", "0.0", "0.0", "12.0"],
            ["500.0", "-55.1", "1", "3.8", "7920.1", "11.7"],
            ["550.0", "-69.9", "0", "0.0", "0.0", "12.4"],
            ["650.0", "-61.2", "0", "0.0", "0.0", "12.2"],
            ["750.0", "-47.3", "1", "4.5", "9100.8", "11.6"],
            ["800.0", "-73.2", "0", "0.0", "0.0", "12.1"],
        ]
    )

    # 4. Create lab notes TXT
    create_txt(d / "lab_notes.txt", """=== Plant Electrophysiology Recording Log ===
Date: 2024-06-15
Operator: Dr. J. Chen
Species: Dionaea muscipula (Venus flytrap)
Specimen ID: DION-2024-015
Age: 3 months post-germination

Setup:
- Faraday cage: Custom-built copper mesh
- Amplifier: Axon Instruments Axopatch 200B
- Electrode: Ag/AgCl glass micropipette (resistance 5-8 MΩ)
- Recording solution: Standard plant Ringer's (pH 6.5)
- Sampling rate: 44.1 kHz
- Low-pass filter: 10 kHz Bessel
- High-pass filter: 0.1 Hz

Protocol:
1. Plant acclimated in recording chamber for 30 min
2. Microelectrode inserted into mesophyll cell layer
3. Baseline recording: 5 min resting potential
4. Mechanical stimulation: gentle touch to trigger hair with glass probe
5. Action potential recording: 30 sec post-stimulus
6. Recovery: 5 min post-stimulus

Observations:
- Clear action potentials detected after mechanical stimulation
- AP amplitude: 85-95 mV (typical for Dionaea)
- AP duration: ~1.5 sec (half-width)
- Refractory period: ~8 sec between successive APs
- Resting potential stable at -62 ± 3 mV

Data Quality Assessment:
- Signal-to-noise ratio: 28.5 dB (excellent)
- 60 Hz line noise: filtered successfully
- Electrode drift: <2 mV over 15 min recording
- No movement artifacts detected

References:
- Madariaga et al. (2024) "A library of electrophysiological responses in plants"
  DOI: 10.1038/s41597-024-03152-3
- Volkov et al. (2019) "Electrophysiology of the Venus flytrap"
  Bioelectrochemistry 125: 25-32
""")

    # 5. Create experimental protocol MD
    create_md(d / "protocol.md", """# Plant Electrophysiology Recording Protocol

## Objective
Record and characterize action potentials in *Dionaea muscipula* (Venus flytrap)
in response to mechanical stimulation of trigger hairs.

## Materials
- **Plant specimens**: 3-month-old Dionaea muscipula (n=5)
- **Recording amplifier**: Axopatch 200B (Molecular Devices)
- **Digitizer**: Digidata 1550B (Molecular Devices)
- **Software**: pCLAMP 11 (Molecular Devices)
- **Electrodes**: Ag/AgCl micropipettes, 5-8 MΩ tip resistance
- **Micromanipulator**: Sutter MP-285

## Methods

### 1. Plant Preparation
- Maintain plants in growth chamber: 25°C, 70% RH, 16:8 light:dark
- Transfer single plant to Faraday cage 30 min before recording
- Secure pot with non-conductive clamp
- Select healthy, fully-expanded trap leaf

### 2. Electrode Placement
- Fill micropipette with 3M KCl
- Position electrode above mesophyll region using micromanipulator
- Advance in 2 μm steps until impedance drop indicates cell penetration
- Establish stable resting potential (-60 to -70 mV) for ≥2 min

### 3. Stimulation Protocol
- Use glass probe attached to piezoelectric actuator
- Apply gentle touch (displacement ~50 μm, duration ~100 ms) to trigger hair
- Record 30 sec pre-stimulus baseline + 60 sec post-stimulus
- Inter-stimulus interval: ≥10 sec to allow full AP recovery
- Repeat 5 stimuli per trap, 3 traps per plant

### 4. Data Analysis
- Extract AP parameters: amplitude, duration, rise time, decay time
- Calculate firing rate and interspike intervals
- Compare across individual plants and leaves
- Statistical analysis: one-way ANOVA with Tukey post-hoc

## Expected Results
- AP amplitude: 80-100 mV
- AP half-width: 1.0-2.0 sec
- Refractory period: 5-10 sec
- No spontaneous firing in unstimulated traps

## Data Files
- `dionaea_electrophysiology.wav` — raw recording (44.1 kHz, 16-bit)
- `plant_recording.m4a` — compressed audio version
- `electrophysiology_features.csv` — extracted AP features
""")

    return {
        "dir": str(d),
        "files": [f.name for f in d.glob("*") if f.is_file()],
        "name": "Venus Flytrap Action Potential Recording",
        "discipline": "植物电生理学",
        "purpose": "Characterize action potentials in Dionaea muscipula triggered by mechanical stimulation of sensory hairs",
        "operator": "Dr. J. Chen",
        "device": {"name": "Axopatch 200B", "model": "200B", "vendor": "Molecular Devices"},
        "sample": {"id": "DION-2024-015", "batch": "2024-Q2", "source": "Greenhouse A"},
        "type": "plant electrophysiology"
    }


# ========== EXPERIMENT 2: T Cell Migration ==========
def prepare_experiment_2():
    """Download T cell migration data from CellTracksColab (Zenodo)."""
    print("\n" + "="*70)
    print("EXPERIMENT 2: T Cell Migration Assay (T细胞迁移实验)")
    print("Data types: MP4, CSV, XLSX, PDF, PNG")
    print("Source: CellTracksColab / Gómez-de-Mariscal et al. 2024")
    print("="*70)

    d = BASE / "exp2-tcell-migration"
    d.mkdir(parents=True, exist_ok=True)

    # 1. Download sample video from CellTracksColab
    # Dataset: 10.5281/zenodo.11286110
    # Try to get a small sample TIFF/MP4
    video_ok = download(
        "https://zenodo.org/records/11286110/files/README.md?download=1",
        d / "dataset_readme.md",
        "CellTracksColab dataset README"
    )

    # Download tracking CSV
    csv_ok = download(
        "https://zenodo.org/records/11286110/files/track_data.csv?download=1",
        d / "cell_tracking_data.csv",
        "T cell tracking data"
    )

    # 2. Create or download a representative MP4
    # Since the full videos are large, create a representative synthetic video or download small sample
    create_synthetic_mp4_instruction = False
    if not (d / "tcell_migration.mp4").exists():
        # Try to generate using ffmpeg
        mp4_created = create_synthetic_mp4(d / "tcell_migration.mp4")
        if not mp4_created:
            print("  [WARN] Could not create MP4 — will be handled as binary in pipeline")
            # Create minimal MP4
            create_minimal_mp4(d / "tcell_migration.mp4")

    # 3. Create tracking data CSV if download failed
    if not csv_ok:
        create_csv(d / "cell_tracking_data.csv",
            ["track_id", "frame", "x_um", "y_um", "speed_um_min", "direction_deg", "area_um2", "circularity"],
            [
                ["1", "1", "12.5", "45.2", "0.0", "0.0", "85.3", "0.92"],
                ["1", "2", "14.8", "47.1", "2.7", "42.5", "84.1", "0.91"],
                ["1", "3", "17.2", "49.5", "2.9", "40.1", "83.8", "0.90"],
                ["1", "4", "19.9", "52.3", "3.2", "38.7", "83.2", "0.89"],
                ["1", "5", "22.5", "54.8", "3.4", "41.2", "82.5", "0.88"],
                ["2", "1", "88.3", "120.7", "0.0", "0.0", "92.1", "0.87"],
                ["2", "2", "85.1", "118.9", "3.5", "210.5", "91.8", "0.86"],
                ["2", "3", "82.4", "116.2", "3.1", "215.3", "90.5", "0.85"],
                ["3", "1", "156.2", "78.5", "0.0", "0.0", "78.4", "0.94"],
                ["3", "2", "153.8", "76.1", "3.0", "225.0", "77.9", "0.93"],
                ["3", "3", "150.5", "74.3", "3.2", "210.8", "77.2", "0.93"],
            ]
        )

    # 4. Create analysis XLSX
    create_xlsx(d / "migration_analysis.xlsx")
    # Overwrite with actual data by creating proper XLSX
    create_proper_xlsx(d / "migration_analysis.xlsx",
        sheet_name="Migration Metrics",
        headers=["Condition", "Mean_Speed_um_min", "Mean_Displacement_um", "Chemotactic_Index",
                 "Persistence_Time_min", "n_Cells", "p_value"],
        rows=[
            ["ICAM-1 Control", "4.8", "125.3", "0.12", "8.5", "152", "0.042"],
            ["VCAM-1 Control", "5.2", "142.7", "0.09", "7.2", "148", "0.038"],
            ["ICAM-1 + SDF1α", "8.9", "235.6", "0.45", "15.3", "165", "0.001"],
            ["VCAM-1 + SDF1α", "9.5", "258.1", "0.52", "18.1", "159", "0.001"],
            ["ICAM-1 + CCL21", "7.8", "198.4", "0.38", "12.7", "143", "0.005"],
            ["VCAM-1 + CCL21", "8.2", "210.2", "0.41", "14.2", "151", "0.003"],
            ["ICAM-1 + LatrunculinA", "1.2", "32.5", "0.02", "0.8", "98", "0.001"],
            ["No coating (negative)", "2.1", "55.8", "0.05", "3.2", "112", "—"],
        ]
    )

    # 5. Download open-access PDF
    pdf_ok = download(
        "https://journals.plos.org/plosbiology/article/file?id=10.1371/journal.pbio.3002740.pdf",
        d / "celltrackscolab_methods.pdf",
        "CellTracksColab PLoS Biology paper"
    )
    if not pdf_ok:
        # Fallback: create a TXT placeholder and note it
        print("  [INFO] PDF download failed, will try alternative source")
        download(
            "https://www.biorxiv.org/content/10.1101/2023.10.09.561355v1.full.pdf",
            d / "celltrackscolab_methods.pdf",
            "CellTracksColab bioRxiv preprint"
        )

    # 6. Extract frame as PNG (or create representative image)
    if not (d / "tcell_microscopy_frame.png").exists():
        create_representative_png(d / "tcell_microscopy_frame.png", "T Cell Migration")

    return {
        "dir": str(d),
        "files": [f.name for f in d.glob("*") if f.is_file()],
        "name": "CD4+ T Cell Migration on ICAM-1/VCAM-1 Substrates",
        "discipline": "免疫细胞生物学",
        "purpose": "Quantify chemokine-induced T cell migration dynamics on adhesion molecule substrates",
        "operator": "Dr. M. Liu",
        "device": {"name": "Zeiss Axiovert 200M", "model": "Axiovert 200M", "vendor": "Zeiss"},
        "sample": {"id": "TCELL-2025-042", "batch": "Mouse-CD4-2025", "source": "C57BL/6 spleen"},
        "type": "cell migration"
    }


# ========== EXPERIMENT 3: Spatial Transcriptomics ==========
def prepare_experiment_3():
    """Download spatial transcriptomics data from STimage-1K4M."""
    print("\n" + "="*70)
    print("EXPERIMENT 3: Spatial Transcriptomics (空间转录组学)")
    print("Data types: CSV, PNG, JPG, TXT, PDF")
    print("Source: STimage-1K4M / Jiawen Chen et al. 2024")
    print("="*70)

    d = BASE / "exp3-spatial-transcriptomics"
    d.mkdir(parents=True, exist_ok=True)

    # 1. Download gene expression CSV from HuggingFace
    csv_ok = download(
        "https://huggingface.co/datasets/jiawennnn/STimage-1K4M/resolve/main/sample_gene_expression.csv",
        d / "gene_expression_matrix.csv",
        "Gene expression data (sample)"
    )

    # If HF download fails, create representative data
    if not csv_ok:
        create_csv(d / "gene_expression_matrix.csv",
            ["spot_id", "x_coord", "y_coord", "MALAT1", "GAPDH", "MUC1", "KRT19", "EPCAM", "VIM", "CDH1", "TP53", "EGFR"],
            [
                ["SPOT_001", "100", "100", "452.3", "1205.7", "89.2", "34.5", "567.8", "12.3", "234.5", "45.6", "78.9"],
                ["SPOT_002", "100", "200", "389.1", "1102.5", "156.7", "45.2", "489.2", "15.7", "198.3", "52.1", "65.4"],
                ["SPOT_003", "100", "300", "421.7", "1156.2", "45.3", "23.8", "612.3", "9.8", "267.8", "38.9", "82.1"],
                ["SPOT_004", "200", "100", "398.5", "1089.4", "234.5", "67.8", "534.2", "18.9", "178.9", "61.2", "55.7"],
                ["SPOT_005", "200", "200", "445.2", "1234.6", "67.8", "29.1", "498.7", "11.2", "223.4", "42.8", "71.3"],
                ["SPOT_006", "200", "300", "376.9", "987.3", "189.3", "52.4", "456.9", "14.6", "312.5", "55.7", "68.9"],
                ["SPOT_007", "300", "100", "412.8", "1145.8", "56.7", "38.9", "589.1", "10.5", "189.7", "47.3", "74.5"],
                ["SPOT_008", "300", "200", "389.4", "1021.3", "123.4", "41.2", "523.6", "13.8", "245.6", "49.8", "69.8"],
                ["SPOT_009", "300", "300", "435.6", "1198.7", "78.9", "35.6", "478.9", "11.9", "198.7", "51.4", "77.2"],
                ["SPOT_010", "400", "100", "367.8", "956.4", "267.8", "72.3", "412.5", "17.2", "289.3", "58.9", "63.4"],
            ]
        )

    # Also create gene metadata
    create_csv(d / "gene_metadata.csv",
        ["gene_symbol", "ensembl_id", "chromosome", "gene_type", "mean_expression", "detection_rate"],
        [
            ["MALAT1", "ENSG00000251562", "11q13.1", "lncRNA", "412.5", "0.98"],
            ["GAPDH", "ENSG00000111640", "12p13.31", "protein_coding", "1089.3", "0.99"],
            ["MUC1", "ENSG00000185499", "1q22", "protein_coding", "145.7", "0.85"],
            ["KRT19", "ENSG00000171345", "17q21.2", "protein_coding", "38.2", "0.72"],
            ["EPCAM", "ENSG00000119888", "2p21", "protein_coding", "534.6", "0.95"],
            ["VIM", "ENSG00000026025", "10p13", "protein_coding", "15.2", "0.45"],
            ["CDH1", "ENSG00000039068", "16q22.1", "protein_coding", "245.3", "0.91"],
            ["TP53", "ENSG00000141510", "17p13.1", "protein_coding", "48.9", "0.78"],
            ["EGFR", "ENSG00000146648", "7p11.2", "protein_coding", "72.5", "0.82"],
        ]
    )

    # 2. Download tissue image (H&E PNG)
    png_ok = download(
        "https://huggingface.co/datasets/jiawennnn/STimage-1K4M/resolve/main/sample_tissue_he.png",
        d / "breast_tissue_HE.png",
        "H&E stained tissue section"
    )
    if not png_ok:
        create_representative_png(d / "breast_tissue_HE.png", "H&E Tissue Section")

    # 3. JPG version
    if not (d / "tissue_macro.jpg").exists():
        create_representative_jpg(d / "tissue_macro.jpg", "Tissue Macro")

    # 4. Lab notes TXT
    create_txt(d / "sample_preparation.txt", """=== Tissue Sample Preparation Log ===
Date: 2025-01-22
Sample ID: BC-2025-089
Patient: De-identified, female, 58yr
Diagnosis: Invasive ductal carcinoma, Grade II
Tissue: Breast, fresh-frozen

Processing:
1. Tissue embedded in OCT compound, flash-frozen in liquid nitrogen
2. Cryosectioned at 10 μm thickness (-20°C)
3. Sections mounted on Visium Spatial Gene Expression slides
4. H&E staining performed per Visium protocol
5. Bright-field imaging at 40× (NanoZoomer S60 scanner)
6. Tissue permeabilization: 12 min (optimal from time-course)
7. cDNA synthesis and library preparation per 10x Genomics Visium v2 protocol
8. Sequencing: Illumina NovaSeq 6000, 2×150 bp, 50k read pairs/spot

Quality Control:
- RNA Integrity Number (RIN): 8.2 (high quality)
- Tissue coverage: 85% of capture area
- Mean reads per spot: 52,341
- Mean genes per spot: 3,245
- Mitochondrial read fraction: 4.2% (acceptable)
- Spots passing QC: 2,458 / 2,500 (98.3%)

Spatial clusters identified:
- Cluster 1 (n=452): Tumor core — high EPCAM, KRT19, MUC1
- Cluster 2 (n=312): Tumor invasive front — co-expression epithelial + mesenchymal
- Cluster 3 (n=198): Stroma — high VIM, COL1A1, FN1
- Cluster 4 (n=156): Immune infiltrate — high CD3E, CD8A, CD68
- Cluster 5 (n=89): Normal adjacent tissue

References:
- STimage-1K4M: https://huggingface.co/datasets/jiawennnn/STimage-1K4M
- 10x Visium protocol: CG000239 Rev L
""")

    # 5. Download PDF methods paper
    pdf_ok = download(
        "https://arxiv.org/pdf/2406.06393.pdf",
        d / "stimage_dataset_paper.pdf",
        "STimage-1K4M dataset paper"
    )

    return {
        "dir": str(d),
        "files": [f.name for f in d.glob("*") if f.is_file()],
        "name": "Breast Cancer Spatial Transcriptomics Profiling",
        "discipline": "空间转录组学",
        "purpose": "Map tumor microenvironment spatial heterogeneity using Visium spatial gene expression",
        "operator": "Dr. S. Wang",
        "device": {"name": "10x Genomics Visium", "model": "Visium v2", "vendor": "10x Genomics"},
        "sample": {"id": "BC-2025-089", "batch": "HER2-BC-Cohort", "source": "Surgical resection"},
        "type": "spatial transcriptomics"
    }


# ========== EXPERIMENT 4: Materials Characterization ==========
def prepare_experiment_4():
    """Materials characterization with SEM/TEM/XRD data."""
    print("\n" + "="*70)
    print("EXPERIMENT 4: Materials Characterization (纳米材料表征)")
    print("Data types: DOCX, XLSX, PNG, JPG, MD")
    print("Source: Real open data + generated")
    print("="*70)

    d = BASE / "exp4-materials-characterization"
    d.mkdir(parents=True, exist_ok=True)

    # 1. Download real SEM image of nanoparticles from public repository
    # Using a known open-access nanoparticle SEM image
    png_ok = download(
        "https://upload.wikimedia.org/wikipedia/commons/thumb/1/1e/Gold_nanoparticles_SEM.jpg/800px-Gold_nanoparticles_SEM.jpg",
        d / "sem_gold_nanoparticles.jpg",
        "SEM image of gold nanoparticles"
    )

    # 2. Download XRD pattern if available
    png2_ok = download(
        "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/XRD_pattern_of_TiO2_nanoparticles.png/800px-XRD_pattern_of_TiO2_nanoparticles.png",
        d / "xrd_tio2_pattern.png",
        "XRD pattern of TiO2 nanoparticles"
    )

    # 3. Create measurement XLSX
    create_proper_xlsx(d / "nanoparticle_characterization.xlsx",
        sheet_name="NP Characterization",
        headers=["Sample", "Synthesis_Method", "TEM_Size_nm", "DLS_Size_nm", "Zeta_mV",
                 "BET_m2_g", "XRD_Phase", "Bandgap_eV", "PL_Peak_nm"],
        rows=[
            ["AuNP-Citrate", "Turkevich", "15.2 ± 2.1", "18.5 ± 3.2", "-35.2", "—", "FCC", "—", "—"],
            ["AuNP-CTAB", "Seed-mediated", "28.7 ± 3.5", "32.1 ± 4.8", "+28.5", "—", "FCC", "—", "520"],
            ["TiO2-Anatase", "Sol-gel", "12.5 ± 1.8", "25.3 ± 5.1", "-22.8", "185.3", "Anatase", "3.2", "—"],
            ["TiO2-Rutile", "Hydrothermal", "45.2 ± 6.3", "52.7 ± 8.2", "-18.9", "78.5", "Rutile", "3.0", "—"],
            ["ZnO-NP", "Precipitation", "22.1 ± 3.2", "28.9 ± 4.5", "-15.7", "52.3", "Wurtzite", "3.3", "380"],
            ["Fe3O4-NP", "Co-precipitation", "10.8 ± 1.5", "35.6 ± 6.2", "-28.1", "210.7", "Magnetite", "—", "—"],
            ["AgNP", "Green synthesis", "18.9 ± 2.8", "22.4 ± 3.9", "-32.5", "—", "FCC", "—", "425"],
            ["CdSe-QD", "Hot-injection", "5.2 ± 0.5", "8.1 ± 1.2", "-12.3", "—", "Zinc blende", "2.1", "610"],
        ]
    )

    # 4. Create experimental protocol DOCX
    create_docx(d / "nanoparticle_synthesis_protocol.docx",
        "Gold Nanoparticle Synthesis via Turkevich Method — Experimental Protocol",
        """Objective: Synthesize monodisperse gold nanoparticles (AuNPs) with controlled size via citrate reduction of HAuCl4.

Materials:
- Hydrogen tetrachloroaurate(III) trihydrate (HAuCl4·3H2O, ≥99.9%)
- Trisodium citrate dihydrate (Na3C6H5O7·2H2O, ≥99%)
- Ultrapure water (18.2 MΩ·cm, Milli-Q)
- Round-bottom flask (250 mL), condenser, magnetic stir bar
- Hot plate with magnetic stirring
- UV-Vis spectrophotometer (Shimadzu UV-2600)
- Transmission electron microscope (JEOL JEM-2100F, 200 kV)
- Dynamic light scattering (Malvern Zetasizer Nano ZS)

Procedure:
1. Prepare 50 mL of 0.25 mM HAuCl4 solution in a 250 mL round-bottom flask
2. Heat the solution to boiling (100°C) under reflux with vigorous stirring (600 rpm)
3. Rapidly inject 2.5 mL of 1% (w/v) sodium citrate solution
4. Observe color change: pale yellow → colorless → dark blue → deep red (within ~2 min)
5. Continue boiling and stirring for additional 15 min
6. Remove from heat and allow to cool to room temperature
7. Store at 4°C in amber glass vials, protected from light

Characterization:
- UV-Vis: Record spectrum 400-800 nm (SPR peak ~520 nm for 15 nm AuNPs)
- TEM: Drop-cast 5 μL on carbon-coated Cu grid, dry overnight, image at 200 kV
- DLS/Zeta: Measure size distribution and zeta potential in triplicate
- Size analysis: Count ≥200 particles per sample using ImageJ

Safety Notes:
- HAuCl4 is corrosive; wear appropriate PPE
- Hot plate and boiling solution present burn hazard
- Nanoparticles should be handled in fume hood when in powder form

Expected Results:
- TEM diameter: 13-17 nm (uniform, spherical)
- DLS hydrodynamic diameter: 16-22 nm (slightly larger than TEM due to citrate layer)
- SPR peak: 518-525 nm (sharp, indicating monodispersity)
- Zeta potential: -30 to -40 mV (stable colloidal dispersion)
- Polydispersity index (PDI): <0.2
""")

    # 5. Create analysis notes MD
    create_md(d / "characterization_analysis.md", """# Nanoparticle Characterization Analysis

## SEM Analysis
- **Instrument**: JEOL JSM-7800F FESEM
- **Accelerating voltage**: 5 kV
- **Working distance**: 4.5 mm
- **Detector**: SE (secondary electron)
- **Magnification**: 50,000×
- **Observations**: Spherical particles, uniform size distribution, minimal aggregation

## XRD Analysis
- **Instrument**: Rigaku SmartLab (Cu Kα, λ = 1.5406 Å)
- **Scan range**: 20°–80° 2θ
- **Step size**: 0.02°
- **Scan speed**: 2°/min

### Peak Assignments (TiO2 Anatase):
| 2θ (°) | d (Å) | hkl | Intensity |
|--------|-------|-----|-----------|
| 25.28 | 3.52 | (101) | 100 |
| 37.80 | 2.38 | (004) | 20 |
| 48.05 | 1.89 | (200) | 35 |
| 53.89 | 1.70 | (105) | 20 |
| 55.06 | 1.67 | (211) | 20 |
| 62.69 | 1.48 | (204) | 14 |

### Crystallite Size (Scherrer equation):
- D = Kλ / (β cos θ)
- Using (101) peak: D = 12.8 nm
- Consistent with TEM measurements

## UV-Vis Analysis
- AuNP SPR peak: 522 nm
- Peak width (FWHM): 48 nm
- Absorbance ratio (A522/A450): 3.2
- Indicates: monodisperse, ~15 nm spherical gold nanoparticles

## Conclusions
1. Successful synthesis of monodisperse AuNPs via Turkevich method
2. TiO2 sample confirmed as pure anatase phase with 12.8 nm crystallite size
3. All characterization methods show good agreement on particle sizes
4. Zeta potential values indicate excellent colloidal stability (> |30| mV)
""")

    return {
        "dir": str(d),
        "files": [f.name for f in d.glob("*") if f.is_file()],
        "name": "Gold Nanoparticle Synthesis and Multi-Method Characterization",
        "discipline": "纳米材料科学",
        "purpose": "Synthesize and characterize monodisperse gold nanoparticles using Turkevich method with SEM/XRD/UV-Vis/DLS",
        "operator": "Dr. Y. Zhang",
        "device": {"name": "JEOL JSM-7800F", "model": "JSM-7800F FESEM", "vendor": "JEOL"},
        "sample": {"id": "AuNP-2025-012", "batch": "NP-Batch-A", "source": "Wet chemistry lab"},
        "type": "materials characterization"
    }


# ========== HELPER FUNCTIONS ==========

def create_synthetic_wav(path, duration_sec=3.0, sample_rate=44100):
    """Create a minimal valid WAV file with a sine wave signal."""
    import struct
    import math

    num_samples = int(sample_rate * duration_sec)
    # Generate 10 Hz + 50 Hz mixed sine wave (simulating biological signal)
    samples = []
    for i in range(num_samples):
        t = i / sample_rate
        # Simulate action potential: baseline + occasional spikes
        phase = (t * 2.5) % 1.0  # spike every 0.4 sec
        if phase < 0.02:  # 20ms spike
            val = 0.8 * math.sin(phase * math.pi / 0.02 * 50)
        else:
            val = 0.05 * math.sin(2 * math.pi * 10 * t) + 0.03 * math.sin(2 * math.pi * 50 * t)
        # Add noise
        val += 0.02 * (hash((i, 1)) % 1000 / 1000.0 - 0.5)
        val = max(-1.0, min(1.0, val))
        samples.append(int(val * 32767 * 0.3))  # 30% amplitude

    # Write WAV
    data_size = num_samples * 2
    with open(path, "wb") as f:
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + data_size))
        f.write(b"WAVE")
        f.write(b"fmt ")
        f.write(struct.pack("<I", 16))  # chunk size
        f.write(struct.pack("<H", 1))   # PCM
        f.write(struct.pack("<H", 1))   # mono
        f.write(struct.pack("<I", sample_rate))
        f.write(struct.pack("<I", sample_rate * 2))  # byte rate
        f.write(struct.pack("<H", 2))   # block align
        f.write(struct.pack("<H", 16))  # bits per sample
        f.write(b"data")
        f.write(struct.pack("<I", data_size))
        for s in samples:
            f.write(struct.pack("<h", s))

    print(f"  [CREATE] {Path(path).name} — {duration_sec}s synthetic WAV")


def convert_to_m4a(wav_path, m4a_path):
    """Convert WAV to M4A using ffmpeg."""
    import subprocess
    try:
        subprocess.run([
            "ffmpeg", "-y", "-i", str(wav_path),
            "-c:a", "aac", "-b:a", "128k",
            str(m4a_path)
        ], check=True, capture_output=True, timeout=30)
        print(f"  [CREATE] {m4a_path.name} — converted from WAV")
        return True
    except Exception as e:
        print(f"  [WARN] ffmpeg M4A conversion failed: {e}")
        return False


def create_synthetic_mp4(path):
    """Create a minimal synthetic MP4 video using ffmpeg."""
    import subprocess
    try:
        # Generate 5 sec test pattern simulating cell migration
        subprocess.run([
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", "color=c=0x1a1a2e:s=640x480:d=5",
            "-f", "lavfi", "-i", "cellshape=size=640x480:rate=10:seed=42",
            "-filter_complex", "[1]format=rgba,colorchannelmixer=aa=0.5[over];[0][over]overlay",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(path)
        ], check=True, capture_output=True, timeout=30)
        print(f"  [CREATE] {path.name} — synthetic MP4 video")
        return True
    except Exception:
        return False


def create_minimal_mp4(path):
    """Create a minimal valid MP4 file (from a static black frame)."""
    import subprocess
    try:
        subprocess.run([
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", "testsrc=duration=3:size=320x240:rate=10",
            "-c:v", "libx264", "-pix_fmt", "yuv420p",
            "-movflags", "+faststart",
            str(path)
        ], check=True, capture_output=True, timeout=30)
        print(f"  [CREATE] {path.name} — minimal test MP4")
        return True
    except Exception:
        print(f"  [WARN] ffmpeg not available for MP4 creation")
        # Create a tiny placeholder
        Path(path).write_bytes(b"\x00\x00\x00\x1cftypmp42\x00\x00\x00\x00mp42mp41\x00\x00\x00\x08free")
        return False


def create_representative_png(path, label):
    """Create a simple PNG image with text label (fallback)."""
    import struct
    import zlib

    width, height = 400, 300
    # Create RGB pixel data
    pixels = []
    for y in range(height):
        row = b"\x00"  # filter byte
        for x in range(width):
            # Simple gradient based on position
            r = int(30 + 40 * (x / width))
            g = int(20 + 80 * (y / height))
            b = int(50 + 30 * ((x + y) / (width + height)))
            # Add some structure (grid lines like scale bars)
            if x % 50 < 2 or y % 50 < 2:
                r, g, b = 200, 200, 200
            row += bytes([r, g, b])
        pixels.append(row)

    raw = b"".join(pixels)
    compressed = zlib.compress(raw)

    def chunk(ctype, data):
        c = ctype + data
        return struct.pack(">I", len(data)) + c + struct.pack(">I", zlib.crc32(c) & 0xFFFFFFFF)

    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n")
        f.write(chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)))
        f.write(chunk(b"IDAT", compressed))
        f.write(chunk(b"IEND", b""))

    print(f"  [CREATE] {Path(path).name} — synthetic PNG image")


def create_representative_jpg(path, label):
    """Create a very simple JPG using ffmpeg or fallback to PNG."""
    import subprocess
    try:
        subprocess.run([
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", "color=c=0x2d1b69:s=400x300:d=0.01",
            "-frames:v", "1",
            str(path)
        ], check=True, capture_output=True, timeout=15)
        print(f"  [CREATE] {Path(path).name} — synthetic JPG image")
    except Exception:
        # Fallback: just create a PNG and rename
        create_representative_png(path, label)


def create_proper_xlsx(path, sheet_name, headers, rows):
    """Create a proper XLSX file with data using Python zipfile + XML."""
    import zipfile

    # Build shared strings
    strings = []
    string_map = {}

    def get_si(text):
        text = str(text)
        if text not in string_map:
            string_map[text] = len(strings)
            strings.append(text)
        return string_map[text]

    # Build sheet data
    sheet_rows_xml = ""
    for row_data in [headers] + rows:
        cells_xml = ""
        for col_idx, val in enumerate(row_data):
            si_idx = get_si(val)
            col_letter = chr(65 + col_idx) if col_idx < 26 else "A" + chr(65 + col_idx - 26)
            cell_ref = f"{col_letter}"
            cells_xml += f"""<c r="{cell_ref}" t="s"><v>{si_idx}</v></c>"""
        sheet_rows_xml += f"<row>{cells_xml}</row>"

    # Build shared strings XML
    sst_xml = '<?xml version="1.0" encoding="UTF-8"?>'
    sst_xml += f'<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="{len(strings)}" uniqueCount="{len(strings)}">'
    for s in strings:
        # Escape XML
        esc = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")
        sst_xml += f"<si><t>{esc}</t></si>"
    sst_xml += "</sst>"

    # Package XMLs
    content_types = """<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>
</Types>"""

    rels = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>"""

    wb_rels = """<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="r2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>
</Relationships>"""

    workbook_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="{sheet_name}" sheetId="1" r:id="r1"/></sheets>
</workbook>"""

    sheet_xml = f"""<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>{sheet_rows_xml}</sheetData>
</worksheet>"""

    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("[Content_Types].xml", content_types)
        zf.writestr("_rels/.rels", rels)
        zf.writestr("xl/workbook.xml", workbook_xml)
        zf.writestr("xl/_rels/workbook.xml.rels", wb_rels)
        zf.writestr("xl/worksheets/sheet1.xml", sheet_xml)
        zf.writestr("xl/sharedStrings.xml", sst_xml)

    print(f"  [CREATE] {Path(path).name} — XLSX with {len(rows)} data rows")


# ========== MAIN ==========
def main():
    print("=" * 70)
    print("LabNote Agent — Test Data Preparation")
    print("Downloading real open-source multimodal scientific data")
    print("=" * 70)

    setup_proxy()

    experiments = []

    # Prepare all experiments
    experiments.append(prepare_experiment_1())
    experiments.append(prepare_experiment_2())
    experiments.append(prepare_experiment_3())
    experiments.append(prepare_experiment_4())

    # Write experiment manifest
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(experiments, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 70)
    print("DONE! All experiments prepared.")
    print(f"Manifest written to: {OUTPUT}")
    print(f"Data directory: {BASE}")
    print()
    for exp in experiments:
        print(f"  {exp['name']}: {len(exp['files'])} files in {exp['dir']}")
        for file in sorted(exp['files']):
            print(f"    - {file}")
        print()
    print("=" * 70)


if __name__ == "__main__":
    main()
