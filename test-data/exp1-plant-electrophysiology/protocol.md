# Plant Electrophysiology Recording Protocol

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
