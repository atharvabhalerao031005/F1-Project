# AERO-SPEC // QUADRANT 3 TECHNICAL SPECIFICATION REPORT
## PHASE 4: AEROSPACE STYLING, MICRO-TYPOGRAPHY, OPTICAL RETICLES & RESPONSIVE VERTICAL FIT

**Document ID:** `AERO-SPEC-RES-Q3-STYLING-MICROTYPO-RETICLES-v1.0`  
**Standard:** `AERO-SPEC-ML-AG-CONTRACT-v5.0 Section 5.5`  
**Subsystem:** Flank Right Quadrant 3 (`RightFlankPanel.tsx`, `GGTractionRadar.tsx`, `SteeringWheelHUD.tsx`, `CornerAuditCard.tsx`, `MlStrategySandbox.tsx`)  
**Phase:** Phase 4 (Telemetry HUD, G-G Polar Radar, Steering Wheel & ML Strategy Sandbox)  
**Author:** Subagent 9 — Micro-Typography, Optical Reticles & Visual Polish Specialist  
**Aesthetic Standard:** NASA Johnson Space Center Flight Dynamics Officer (FDO) + Mercedes-AMG PETRONAS ATLAS  
**Performance Invariant:** Locked 60.0 FPS | Zero Virtual DOM Allocations | Zero Cumulative Layout Shift (CLS = 0) | Exact 0px Overflow at 1080p  

---

### EXECUTIVE SUMMARY

Quadrant 3 (Flank Right, Width: $345\,\text{px}$ to $360\,\text{px}$) serves as the primary tactical diagnostics and vehicle kinematics cluster of the Aero-Spec F1 Cockpit. In **`TELEMETRY_LAB`** mode, it mounts three synchronized high-frequency instruments:
1. **Sub-Panel 3A (`GGTractionRadar.tsx`):** A $210\,\text{px}$ polar traction envelope and friction ellipse visualizing instantaneous lateral ($[-5G, +5G]$) and longitudinal ($[-6G, +2.5G]$) forces with historical decay locus trails.
2. **Sub-Panel 3B (`SteeringWheelHUD.tsx`):** A $185\,\text{px}$ McLaren Applied PCU-8D instrument cluster featuring a 15-LED sequential shift array (5 Green, 5 Red, 5 Blue), a $28\,\text{px}$ font-black Big Gear readout, linear throttle/brake bars, and an active DRS status indicator.
3. **Sub-Panel 3C (`CornerAuditCard.tsx`):** A dynamic $\sim 337\,\text{px}$ (`flex-1`) corner apex and braking audit card analyzing braking markers, minimum cornering speeds ($v_{\min}$), throttle pickup points, and corner delta times ($\Delta t$).

In **`ML_STRATEGY_ORACLE`** mode, Quadrant 3 mounts:
- **`MlStrategySandbox.tsx`:** An interactive physics-warp and Monte Carlo strategy console with tactile range sliders (Tyre Age, Fuel Load, Track Temp, Pit Laps, Safety Car windows) providing sub-1.0ms real-time predictive feedback.

This report establishes the complete micro-typography, optical reticle architecture, color token mappings, responsive vertical budget ($756\,\text{px}$ exact height), and tactile control specifications required for Phase 4 implementation.

---

### 1. NASA FDO & MERCEDES-AMG ATLAS VISUAL LANGUAGE

#### 1.1 Aesthetic & Functional Philosophy
Formula 1 trackside race engineering consoles (such as McLaren/Mercedes ATLAS, RaceWatch, and Red Bull Pit-Wall telemetry) operate in high-stress, low-latency environments. Interfaces must prioritize rapid cognitive decoding over decorative consumer embellishments:
- **Extreme Contrast & Zero Luminance Fatigue:** Deep void black surfaces eliminate background glare, allowing high-intensity neon wavelengths to convey telemetry deltas across peripheral vision.
- **Physical Chassis Realism:** Rack-mounted avionics and carbon-composite enclosures are represented through continuous $1\,\text{px}$ hairline seams (`#1B2230`) and planar sub-panel tiers.
- **Zero Border-Radius Mandate (`border-radius: 0px !important;`):** Rounded corners waste valuable pixel real estate, create anti-aliased visual blur at high telemetry density, and break structural seam alignment.

#### 1.2 Surface & Recessed Color Hierarchy
Quadrant 3 employs a 4-tier surface hierarchy:

```
+-----------------------------------------------------------------------------------+
| SURFACE LUMINANCE HIERARCHY                                                       |
|                                                                                   |
|  [#05070B] Void Carbon     --> Master Cockpit Background (Lowest Luminance)       |
|       |                                                                           |
|       +--> [#0C1017] Sheet Metal Panel --> Quadrant 3 Outer Container (Flank)     |
|               |                                                                   |
|               +--> [#080B10] Surface Background --> Sub-Panel Headers & Cards     |
|                       |                                                           |
|                       +--> [#141B26] Recessed Instrument / Active Row / Subpanel  |
+-----------------------------------------------------------------------------------+
```

#### 1.3 Complete Color Token Architecture

| Color Identifier | Hex Code | CSS Variable | Semantic Telemetry Role |
| :--- | :--- | :--- | :--- |
| **Void Carbon** | `#05070B` | `var(--hud-bg-void)` | Root canvas background, deep backdrop |
| **Sheet Metal** | `#0C1017` | `var(--hud-bg-panel)` | Quadrant 3 panel background, main body |
| **Surface Background** | `#080B10` | `var(--hud-bg-surface)` | Sub-panel headers, card containers, radar canvas background |
| **Recessed Subpanel** | `#141B26` | `var(--hud-bg-subpanel)` | Inset data boxes, gauge backgrounds, inactive shift LEDs |
| **Seam Hairlines** | `#1B2230` | `var(--hud-border-hairline)` | Primary $1\,\text{px}$ dividing borders between 3A, 3B, 3C |
| **Seam Accent** | `#232D40` | `var(--hud-border-accent)` | Slider tracks, elevated card borders, reticle hover |
| **Electric Cyan** | `#00E5FF` | `var(--hud-cyan)` | Driver A (VER) telemetry, target speed, gear display, optimum upshift LEDs |
| **Electric Violet** | `#B000FF` | `var(--hud-purple)` | Driver B (NOR) benchmark, ghost G-locus, purple fastest sector |
| **Neon Green** | `#00FF66` | `var(--hud-green)` | 100% Throttle, DRS Open, undercut win, green sector, shift LEDs 1–5 |
| **Solar Amber** | `#FFE600` | `var(--hud-amber)` | ML Ghost trace, tyre degradation cliff, warning flags, DRS available |
| **Crimson** | `#FF1E44` | `var(--hud-red)` | Hydraulic brake pressure ($>0\,\text{bar}$), redline shift LEDs 6–10, time deficit |
| **Primary Slate** | `#E2E8F0` | `var(--hud-text-primary)` | Primary data values, big readouts, active units |
| **Secondary Slate** | `#94A3B8` | `var(--hud-text-secondary)` | Axis labels, sub-panel descriptors, telemetry keys |
| **Muted Slate** | `#64748B` | `var(--hud-text-muted)` | Inactive labels, column headers, units (G, KM/H, RPM, bar) |
| **Dim Slate** | `#334155` | `var(--hud-text-dim)` | Structural grid lines, background polar radar circles |

---

### 2. MICRO-TYPOGRAPHY & TABULAR LAYOUT INVARIANTS

#### 2.1 Tabular Numerics & Zero-Allocation Font Architecture
During 60 Hz telemetry scrubbing, numbers update 60 times per second. Proportional fonts cause characters to shift horizontally ("number jitter"), destroying visual focus and triggering browser layout shifts.

To achieve **Zero Cumulative Layout Shift ($\text{CLS} = 0$)**:
1. All numeric displays enforce OpenType tabular figures and slashed zero:
   ```css
   font-family: var(--hud-font-mono); /* JetBrains Mono */
   font-variant-numeric: tabular-nums slashed-zero;
   font-feature-settings: 'tnum' 1, 'zero' 1;
   ```
2. Every telemetry readout container enforces fixed character widths (`HUD_CHAR_WIDTHS`):
   - Speed: `8ch` (e.g. `342 KM/H`)
   - G-Force: `7ch` (e.g. `+4.82 G`)
   - RPM: `9ch` (e.g. `12450 RPM`)
   - Gear: `1ch` (e.g. `7`)
   - Delta: `7ch` (e.g. `+0.124s`)

#### 2.2 Strict Font Size Hierarchy

```
+-----------------------------------------------------------------------------------+
| QUADRANT 3 TYPOGRAPHY SCALE                                                       |
|                                                                                   |
|  [28px font-black]       --> Big Gear Display (Center Steering HUD)               |
|  [18px font-bold]        --> Speed Numeric Readout (Steering HUD)                 |
|  [12px font-bold]        --> Engine RPM Readout (Steering HUD)                    |
|  [10.5px font-bold]      --> Metric Values (G-force, Brake Marker, Apex vMin)     |
|  [10.0px font-bold]      --> Quadrant 3 Header Title (Q3 // REAL-TIME HUD...)     |
|  [9.5px font-bold]       --> Sub-Panel Titles (SUB-PANEL 3A // G-G RADAR...)      |
|  [8.5px font-semibold]   --> Metric Labels (LAT G, LONG G, VMIN, BRAKE)          |
|  [7.5px font-medium]     --> Micro Units & Polar Grid Annotations (KM/H, DEG, G)  |
+-----------------------------------------------------------------------------------+
```

#### 2.3 Micro-Typography Utility Mapping Table

| UI Element | CSS Properties & Tailwind Combination | Sample Rendered Output |
| :--- | :--- | :--- |
| **Big Gear Display** | `text-[28px] font-black leading-none text-[#00E5FF] tracking-tighter` | `7` |
| **Speed Value** | `text-[18px] font-bold text-[#E2E8F0] tracking-tight tabular-nums` | `324` |
| **Speed Unit** | `text-[8.5px] font-semibold text-[#64748B] tracking-wider ml-1` | `KM/H` |
| **RPM Readout** | `text-[11px] font-bold text-[#94A3B8] tracking-normal tabular-nums` | `12,450 RPM` |
| **Quadrant Header** | `text-[10px] font-bold tracking-wider text-[#E2E8F0] uppercase` | `Q3 // REAL-TIME TELEMETRY HUD` |
| **Sub-Panel Header** | `text-[9.5px] font-bold tracking-wide text-[#64748B] uppercase` | `SUB-PANEL 3A // G-G POLAR RADAR` |
| **Metric Label** | `text-[8.5px] font-medium tracking-wider text-[#64748B] uppercase` | `BRAKE MARKER` |
| **Metric Value** | `text-[10.5px] font-bold text-[#E2E8F0] tabular-nums` | `118 m` |
| **Metric Delta A vs B**| `text-[10.5px] font-bold text-[#00FF66] tabular-nums` | `-13 m` |
| **DRS Badge Text** | `text-[9px] font-extrabold tracking-widest uppercase` | `DRS OPEN` |
| **Slider Param Name** | `text-[9px] font-bold text-[#94A3B8] tracking-wider uppercase` | `TYRE AGE (LAPS)` |
| **Slider Value Tag** | `text-[10px] font-bold text-[#FFE600] tabular-nums` | `18 LAPS` |

---

### 3. OPTICAL RETICLES, TACTICAL FRAMES & SEAMS

#### 3.1 Pure CSS Optical Corner Reticles (`.reticle-corner`)
In NASA flight consoles and military HUDs, instrument quadrants feature optical L-brackets at each corner to indicate telemetry lock and structural alignment.
- **Arm Dimensions:** $6\,\text{px} \times 6\,\text{px}$ hairline stroke.
- **Stroke Thickness:** Exactly $1\,\text{px}$ hairline border.
- **Zero Extra DOM Overhead:** Implemented using CSS `::before` (Top-L/R) and `::after` (Bottom-L/R) pseudo-elements with dual linear gradients.

```
(Top-Left Corner)                                           (Top-Right Corner)
+------                                                                 ------+
|                                                                             |
|                                                                             |
|                    SUB-PANEL INSTRUMENT CONTAINER                           |
|                                                                             |
|                                                                             |
+------                                                                 ------+
(Bottom-Left Corner)                                     (Bottom-Right Corner)
```

```css
/* Sub-Panel Optical Reticle Bracket Standard */
.reticle-corner {
  position: relative;
}

.reticle-corner::before {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  height: 6px;
  pointer-events: none;
  z-index: 20;
  border-left: 1px solid var(--reticle-color, #00e5ff);
  border-right: 1px solid var(--reticle-color, #00e5ff);
  background-image:
    linear-gradient(to right, var(--reticle-color, #00e5ff) 6px, transparent 6px),
    linear-gradient(to left, var(--reticle-color, #00e5ff) 6px, transparent 6px);
  background-size: 6px 1px, 6px 1px;
  background-repeat: no-repeat;
  background-position: top left, top right;
  transition: border-color 0.15s ease, background-image 0.15s ease;
}

.reticle-corner::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: -1px;
  right: -1px;
  height: 6px;
  pointer-events: none;
  z-index: 20;
  border-left: 1px solid var(--reticle-color, #00e5ff);
  border-right: 1px solid var(--reticle-color, #00e5ff);
  background-image:
    linear-gradient(to right, var(--reticle-color, #00e5ff) 6px, transparent 6px),
    linear-gradient(to left, var(--reticle-color, #00e5ff) 6px, transparent 6px);
  background-size: 6px 1px, 6px 1px;
  background-repeat: no-repeat;
  background-position: bottom left, bottom right;
  transition: border-color 0.15s ease, background-image 0.15s ease;
}

/* Subtle Reticle Variants */
.reticle-dim {
  --reticle-color: #232d40;
}
.reticle-dim:hover {
  --reticle-color: #00e5ff;
}
.reticle-amber {
  --reticle-color: #ffe600;
}
.reticle-purple {
  --reticle-color: #b000ff;
}
```

#### 3.2 High-Contrast Structural Seams
Sub-Panels 3A, 3B, and 3C are separated by high-contrast mechanical seams:
- **Seam Border:** `border-b border-[#1B2230]`.
- **Sub-panel Header Bar:** `h-[20px] bg-[#080B10] border-b border-[#1B2230] px-2 flex items-center justify-between`.
- **Active Diagnostic Pip:** $5\,\text{px} \times 5\,\text{px}$ solid square pip indicating channel lock:
  - `bg-[#00E5FF]` (Driver A lock)
  - `bg-[#B000FF]` (Driver B lock)
  - `bg-[#FFE600]` (ML Ghost active)

---

### 4. TACTILE SLIDERS & MECHANICAL CONTROLS (`MlStrategySandbox.tsx`)

#### 4.1 Industrial Telemetry Range Sliders
In `MlStrategySandbox.tsx`, users interactively perturb physical parameters: Tyre Age ($0 \to 40$ laps), Fuel Load ($5 \to 110\,\text{kg}$), Track Temp ($18 \to 55^\circ\text{C}$), Pit Laps ($1 \to 53$), and Safety Car trigger lap.

To preserve the avionics feel, sliders must **never** use rounded bubbly thumb handles or native browser styles.

```css
/* Master Tactile Telemetry Slider */
.hud-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 14px;
  background: transparent;
  outline: none;
  cursor: ew-resize;
  margin: 3px 0;
  display: block;
}

/* WebKit Track: 2px Hairline Seam */
.hud-slider::-webkit-slider-runnable-track {
  width: 100%;
  height: 2px;
  background: #1b2230;
  border: none;
}

/* WebKit Thumb: 8px x 14px Solid Rectangular Block, 0px Radius */
.hud-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 8px;
  height: 14px;
  background-color: var(--hud-cyan); /* #00E5FF */
  border: 1px solid #000000;
  margin-top: -6px;
  border-radius: 0px !important;
  box-shadow: 0 0 6px rgba(0, 229, 255, 0.4);
  transition: background-color 0.1s ease, box-shadow 0.1s ease;
}

.hud-slider:hover::-webkit-slider-thumb {
  background-color: #ffffff;
  box-shadow: 0 0 8px #ffffff;
}

.hud-slider:active::-webkit-slider-thumb {
  background-color: var(--hud-green); /* #00FF66 */
  box-shadow: 0 0 10px rgba(0, 255, 102, 0.8);
}

/* Solar Amber Variant (ML Physics-Warp Parameters) */
.hud-slider-amber::-webkit-slider-thumb {
  background-color: var(--hud-amber); /* #FFE600 */
  box-shadow: 0 0 6px rgba(255, 230, 0, 0.4);
}

.hud-slider-amber:hover::-webkit-slider-thumb {
  background-color: #ffffff;
}

.hud-slider-amber:active::-webkit-slider-thumb {
  background-color: #ffffff;
  box-shadow: 0 0 10px rgba(255, 230, 0, 0.9);
}

/* Firefox Track & Thumb */
.hud-slider::-moz-range-track {
  width: 100%;
  height: 2px;
  background: #1b2230;
  border: none;
}

.hud-slider::-moz-range-thumb {
  width: 8px;
  height: 14px;
  background-color: var(--hud-cyan);
  border: 1px solid #000000;
  border-radius: 0px !important;
  cursor: ew-resize;
}

.hud-slider-amber::-moz-range-thumb {
  background-color: var(--hud-amber);
  border: 1px solid #000000;
  border-radius: 0px !important;
}
```

#### 4.2 Interactive Button & Mode Switcher Styling
- **Action Button (`.hud-button`):** `h-[22px] px-2 bg-[#080B10] border border-[#1B2230] text-[9.5px] font-bold text-[#E2E8F0] uppercase tracking-wider hover:bg-[#16202E] hover:border-[#232D40] active:translate-y-[1px]`
- **Primary Trigger (`.hud-button-primary`):** `bg-[#00E5FF] text-[#05070B] border-[#00E5FF] font-extrabold hover:bg-[#33ECFF] active:bg-[#00B3CC]`
- **Amber Warning/ML Trigger (`.hud-button-warning`):** `bg-[#FFE600] text-[#05070B] border-[#FFE600] font-extrabold hover:bg-[#FFF04D]`

---

### 5. RESPONSIVE FIT & VERTICAL PIXEL BUDGET BREAKDOWN

#### 5.1 Exact Vertical Height Geometry at 1080p ($1920 \times 1080$)
The master viewport is locked to $100\text{vw} \times 100\text{vh}$ with grid rows:
$$\text{Grid Rows} = [36\,\text{px} \quad 1\,\text{fr} \quad 260\,\text{px} \quad 28\,\text{px}]$$

Calculation of available vertical height for Row 2 (Quadrant 3 Flank Right):
$$\text{Available Height} = 1080\,\text{px} - 36\,\text{px} (\text{Zone 0}) - 260\,\text{px} (\text{Zone 4}) - 28\,\text{px} (\text{Zone 5}) = 756\,\text{px}$$

#### 5.2 Deterministic Sub-Panel Height Allocation (Mode: `TELEMETRY_LAB`)

| Sub-Panel Component | Allocation Type | Height | Vertical Range | Layout Invariant & Content |
| :--- | :--- | :--- | :--- | :--- |
| **Quadrant Header** | Static | $24\,\text{px}$ | $0\,\text{px} \to 24\,\text{px}$ | Mode title, icon, live telemetry rate |
| **Sub-Panel 3A (`GGTractionRadar`)** | Static Fixed | $210\,\text{px}$ | $24\,\text{px} \to 234\,\text{px}$ | $20\,\text{px}$ header + $190\,\text{px}$ polar canvas |
| **Sub-Panel 3B (`SteeringWheelHUD`)** | Static Fixed | $185\,\text{px}$ | $234\,\text{px} \to 419\,\text{px}$ | $20\,\text{px}$ header + $15$-LED shift array + $28\,\text{px}$ gear + dual bars |
| **Sub-Panel 3C (`CornerAuditCard`)** | Dynamic Flex | $337\,\text{px}$ | $419\,\text{px} \to 756\,\text{px}$ | `flex-1 min-h-[220px]`, corner apex analysis table |
| **TOTAL QUADRANT 3 HEIGHT** | **Exact Fit** | **$756\,\text{px}$** | **$0\,\text{px} \to 756\,\text{px}$** | **EXACTLY 0px OVERFLOW! CLS = 0** |

```
+-------------------------------------------------------------------+ 0px
| Q3 MASTER HEADER: Q3 // REAL-TIME TELEMETRY HUD & G-G RADAR [24px] |
+-------------------------------------------------------------------+ 24px
| SUB-PANEL 3A: G-G POLAR TRACTION RADAR                      [210px]|
| - 20px Subpanel Header: SUB-PANEL 3A // G-G TRACTION RADAR        |
| - 190px Polar Radar Canvas (Concentric 1G-5G, Locus Trail, Readout)|
+-------------------------------------------------------------------+ 234px
| SUB-PANEL 3B: COCKPIT STEERING WHEEL HUD                    [185px]|
| - 20px Subpanel Header: SUB-PANEL 3B // COCKPIT STEERING HUD      |
| - 14px 15-LED Sequential Shift Light Array (5G, 5R, 5B)           |
| - 70px Center Cluster: [28px] BIG GEAR | [18px] SPEED | [11px] RPM|
| - 45px Dual Vertical/Horizontal Gauges: THROTTLE (%) | BRAKE (bar)|
| - 36px DRS Status Badge & Steering Degree Indicator               |
+-------------------------------------------------------------------+ 419px
| SUB-PANEL 3C: CORNER APEX & BRAKING AUDIT (flex-1)          [337px]|
| - 20px Subpanel Header: SUB-PANEL 3C // CORNER AUDIT CARD         |
| - 24px Current Corner Badge: T1 // VARIANTE DEL RETTIFILO (382m)  |
| - 220px Comparative Telemetry Matrix:                             |
|   * Brake Marker: A vs B vs Delta (m)                             |
|   * Apex vMin: A vs B vs Delta (km/h)                             |
|   * Throttle Pickup: A vs B vs Delta (m)                          |
|   * Corner Delta-T: +/- 0.000s                                    |
| - 73px Longitudinal G Deceleration Profile / Micro-Trace          |
+-------------------------------------------------------------------+ 756px
```

#### 5.3 Deterministic Sub-Panel Height Allocation (Mode: `ML_STRATEGY_ORACLE`)
In `ML_STRATEGY_ORACLE` mode, Quadrant 3 renders `MlStrategySandbox.tsx`:
- **Quadrant Header:** $24\,\text{px}$ (`Q3 // ML PHYSICS WARP & STRATEGY SANDBOX`)
- **`MlStrategySandbox` Body:** $732\,\text{px}$ (`flex-1`)
  - Subpanel Header: $20\,\text{px}$
  - Physics-Warp Interactive Sliders Section: $180\,\text{px}$ (Tyre Age, Fuel Load, Track Temp)
  - Driver Strategy Stint Matrix: $190\,\text{px}$ (VER Soft $\to$ Hard, NOR Medium $\to$ Hard)
  - Safety Car & Pit Loss Controls: $120\,\text{px}$
  - Real-Time Undercut Prediction Card & Verdict: $160\,\text{px}$
  - Monte Carlo Simulation Trigger Button: $42\,\text{px}$
  - Total: $24 + 732 = 756\,\text{px}$ (Zero overflow at 1080p).

#### 5.4 Overflow Protection on Compact Displays ($< 850\,\text{px}$ Height)
On laptops or reduced-height viewports ($< 850\,\text{px}$ total window height):
1. The outer panel container declares:
   ```tsx
   <aside className="hud-quadrant w-[345px] h-full flex flex-col overflow-y-auto overflow-x-hidden scrollbar-thin bg-[#0C1017] border-l border-[#1B2230] select-none">
   ```
2. Each sub-panel specifies rigid minimum heights:
   - Sub-Panel 3A: `min-h-[210px]`
   - Sub-Panel 3B: `min-h-[185px]`
   - Sub-Panel 3C: `min-h-[220px]`
3. This prevents any clipping or overlapping of numerical gauges. When vertical space drops below $756\,\text{px}$, an ultra-thin industrial scrollbar ($4\,\text{px}$ width, `#232D40` thumb on `#05070B` track) smoothly engages without disrupting tabular alignments.

---

### 6. COMPONENT DETAILED SPECIFICATIONS & TAILWIND COMBINATIONS

#### 6.1 Sub-Panel 3A: `GGTractionRadar.tsx`
- **Container:** `h-[210px] min-h-[210px] flex flex-col bg-[#0C1017] border-b border-[#1B2230]`
- **Sub-header:** `h-[20px] px-2 bg-[#080B10] border-b border-[#1B2230] flex items-center justify-between text-[9.5px] font-bold text-[#64748B]`
- **Canvas Viewport:** `w-full flex-1 relative bg-[#06090E] overflow-hidden flex items-center justify-center`
- **Polar Grid Rings:** Concentric circles drawn via HTML5 2D Canvas or SVG at radii corresponding to $1.0G, 2.0G, 3.0G, 4.0G, 5.0G$ with stroke `#1B2230`.
- **Friction Ellipse:** Pirelli P-Zero Soft traction boundary in `#232D40` dashed line ($5.2G$ max lateral, $5.8G$ max braking, $2.0G$ max longitudinal acceleration).
- **Driver A Locus Dot:** $5\,\text{px} \times 5\,\text{px}$ solid `#00E5FF` square with glowing box shadow `0 0 6px #00E5FF`.
- **History Trail:** Last 20 locus positions plotted with decaying alpha (`rgba(0, 229, 255, alpha)`).
- **Benchmark Driver B Locus Dot:** $4\,\text{px} \times 4\,\text{px}$ `#B000FF` square (ghost locus).
- **Corner Micro-Readouts:**
  - Top-Left: `text-[8.5px] text-[#64748B]` $\to$ `LAT:` `<span class="text-[10px] font-bold text-[#00E5FF] tabular-nums">+3.84 G</span>`
  - Top-Right: `text-[8.5px] text-[#64748B]` $\to$ `LONG:` `<span class="text-[10px] font-bold text-[#FF1E44] tabular-nums">-4.92 G</span>`
  - Bottom-Left: `text-[8.5px] text-[#64748B]` $\to$ `COMBINED:` `<span class="text-[10px] font-bold text-[#E2E8F0] tabular-nums">6.24 G</span>`
  - Bottom-Right: `text-[8px] text-[#334155]` $\to$ `MAX: 5.0G`

#### 6.2 Sub-Panel 3B: `SteeringWheelHUD.tsx`
- **Container:** `h-[185px] min-h-[185px] flex flex-col bg-[#0C1017] border-b border-[#1B2230]`
- **Sub-header:** `h-[20px] px-2 bg-[#080B10] border-b border-[#1B2230] flex items-center justify-between text-[9.5px] font-bold text-[#64748B]`
- **15-LED Shift Array:**
  - Container: `h-[14px] px-2 py-1 bg-[#06090E] border-b border-[#141B26] flex items-center gap-[2px]`
  - LEDs 1–5: `flex-1 h-[6px] bg-[#141B26] border border-[#1B2230]` $\to$ active: `bg-[#00FF66] border-[#00FF66] shadow-[0_0_4px_#00FF66]`
  - LEDs 6–10: `flex-1 h-[6px] bg-[#141B26] border border-[#1B2230]` $\to$ active: `bg-[#FF1E44] border-[#FF1E44] shadow-[0_0_4px_#FF1E44]`
  - LEDs 11–15: `flex-1 h-[6px] bg-[#141B26] border border-[#1B2230]` $\to$ active: `bg-[#00E5FF] border-[#00E5FF] shadow-[0_0_6px_#00E5FF]`
  - Rev Limiter Flash: All 15 LEDs pulse `#FFFFFF` / `#00E5FF` at $>12,800\,\text{RPM}$ (`.shift-flash`).
- **Main Wheel Cluster:**
  - Big Gear: `text-[28px] font-black text-[#00E5FF] leading-none` inside an inset recessed box `w-[42px] h-[46px] bg-[#080B10] border border-[#1B2230] flex items-center justify-center`
  - Speed Readout: `text-[18px] font-bold text-[#E2E8F0] tabular-nums` + `text-[8px] text-[#64748B] font-semibold`
  - Engine RPM: `text-[11px] font-bold text-[#94A3B8] tabular-nums`
- **Dual Telemetry Bars (Throttle & Brake):**
  - Throttle Bar: Inset track `h-[8px] bg-[#080B10] border border-[#1B2230] overflow-hidden` with fill `h-full bg-[#00FF66] shadow-[0_0_4px_#00FF66]`
  - Brake Bar: Inset track `h-[8px] bg-[#080B10] border border-[#1B2230] overflow-hidden` with fill `h-full bg-[#FF1E44] shadow-[0_0_4px_#FF1E44]`
- **Status Badges:**
  - DRS Active: `px-2 py-0.5 text-[9px] font-extrabold bg-[#00FF66] text-[#05070B] border border-[#00FF66] shadow-[0_0_6px_rgba(0,255,102,0.5)]`
  - DRS Off: `px-2 py-0.5 text-[9px] font-extrabold bg-[#080B10] text-[#64748B] border border-[#1B2230]`
  - Steering Angle: `text-[9.5px] font-bold text-[#E2E8F0] tabular-nums` (e.g. `-24.5°`)

#### 6.3 Sub-Panel 3C: `CornerAuditCard.tsx`
- **Container:** `flex-1 min-h-[220px] flex flex-col bg-[#0C1017]`
- **Sub-header:** `h-[20px] px-2 bg-[#080B10] border-b border-[#1B2230] flex items-center justify-between text-[9.5px] font-bold text-[#64748B]`
- **Active Corner Banner:** `px-2 py-1 bg-[#0E141E] border-b border-[#1B2230] flex items-center justify-between`
  - Corner Title: `text-[10px] font-extrabold text-[#00E5FF] tracking-wider uppercase` (e.g. `T1 // VARIANTE DEL RETTIFILO`)
  - Apex Distance: `text-[9px] font-bold text-[#94A3B8] tabular-nums` (e.g. `APEX: 382m`)
- **Comparative Telemetry Matrix (4 Columns: METRIC | DRV A | DRV B | DELTA):**
  - Grid Spec: `grid grid-cols-[85px_1fr_1fr_1fr] items-center px-2 py-1 text-[9px] border-b border-[#141B26]`
  - Metric Rows:
    1. **Braking Marker:** `118m` (A) vs `105m` (B) $\to$ Delta: `<span class="text-[#00FF66] font-bold">-13m</span>`
    2. **Apex Minimum Speed ($v_{\min}$):** `74 KM/H` (A) vs `78 KM/H` (B) $\to$ Delta: `<span class="text-[#FF1E44] font-bold">-4 KM/H</span>`
    3. **Throttle Pickup Point:** `422m` (A) vs `414m` (B) $\to$ Delta: `<span class="text-[#FF1E44] font-bold">+8m</span>`
    4. **Corner Time Delta ($\Delta t$):** `+0.082s` (B advantage)
- **Deceleration G-Bar Profile:** Inset horizontal micro-chart illustrating peak entry deceleration ($-5.2G$).

#### 6.4 `MlStrategySandbox.tsx` (Oracle Mode)
- **Container:** `flex-1 flex flex-col bg-[#0C1017] p-2 space-y-3 overflow-y-auto scrollbar-thin`
- **Parameter Sliders Cluster:**
  - Tyre Age Slider: `hud-slider-amber` ($0 \to 40$ laps) with live tabular readout `18 LAPS`
  - Fuel Load Slider: `hud-slider` ($5 \to 110\,\text{kg}$) with live tabular readout `45.0 KG`
  - Track Temp Slider: `hud-slider-amber` ($18 \to 55^\circ\text{C}$) with live tabular readout `42.4 °C`
- **Strategy Stint Selectors:**
  - Start Compound: Segmented mode group (`S` soft, `M` medium, `H` hard)
  - Pit Lap 1: Numeric input / slider (`LAP 19`)
  - Stint 2 Compound: Segmented mode group
- **Undercut Prediction Verdict Card:**
  - Border: `border border-[#00FF66]/40 bg-[#080B10]`
  - Headline: `text-[10px] font-extrabold text-[#00FF66] tracking-wider` $\to$ `UNDERCUT OPTIMAL // BOX LAP 19 FOR [H]`
  - Metrics: `NET GAIN: +1.84s` • `EXIT GAP: +14.2m`
- **Monte Carlo Execution Trigger:**
  - Button: `w-full h-[28px] bg-[#FFE600] text-[#05070B] font-black text-[10px] tracking-wider uppercase flex items-center justify-center gap-2 hover:bg-[#FFF04D] active:translate-y-[1px]`
  - Execution Time Badge: `text-[8.5px] font-semibold text-[#64748B]` $\to$ `MONTE CARLO (5,000 RUNS) < 1.0ms`

---

### 7. HIGH-DENSITY AESTHETIC ASCII MOCKUPS

#### 7.1 Telemetry Lab Mode (345px Width, 756px Height Budget)

```
+===================================================================+ [0px]
| Q3 // REAL-TIME TELEMETRY HUD & G-G RADAR               [60.0 FPS]| [24px Header]
+-------------------------------------------------------------------+
| SUB-PANEL 3A // G-G POLAR TRACTION RADAR                   [LIVE] | [20px]
|                                                                   |
|   LAT: +3.84 G  [#00E5FF]                     LONG: -4.92 G [#FF] |
|              \          +2.0G ACCEL         /                     |
|               \             |              /                      |
|                \            |             /                       |
|          -5.0G  +-----------+-----------+  +5.0G                  |
|          LAT    |     ( )   |     (*)   |  LAT                    |
|                 |    Ghost  |    Driver |                         |
|                 +-----------+-----------+                         |
|                /            |            \                        |
|               /             |             \                       |
|              /          -5.5G BRAKE        \                      |
|   COMBINED: 6.24 G                             LIMIT: 5.2G (SOFT) |
+-------------------------------------------------------------------+ [234px]
| SUB-PANEL 3B // COCKPIT STEERING WHEEL HUD                        | [20px]
| [G][G][G][G][G]  [R][R][R][R][R]  [B][B][B][B][B]                 | [14px LED Array]
|  100% THROTTLE     OPTIMUM SHIFT      REV LIMIT FLASH (>12.8k)    |
|                                                                   |
| +-----------+  SPEED:  324 KM/H [#E2E8F0]                         |
| |     7     |  RPM:    12,450   [#94A3B8]                         |
| | [#00E5FF] |  STEER:  -18.4 DEG                                  |
| +-----------+  DELTA:  -0.082s  [#00FF66]                         |
|                                                                   |
| THR: [=========================] 100% [#00FF66]                   |
| BRK: [===================      ]  78 bar [#FF1E44]                |
|                                                                   |
| [ DRS OPEN // FIA DETECTED ] [#00FF66]        [ BIAS: 56.4% F ]   |
+-------------------------------------------------------------------+ [419px]
| SUB-PANEL 3C // CORNER APEX & BRAKING AUDIT                       | [20px]
| >> T1 // VARIANTE DEL RETTIFILO                   (APEX: 382m)    |
|                                                                   |
| METRIC CHANNEL      DRIVER A      DRIVER B (GHOST)    DELTA A-B   |
| ----------------------------------------------------------------- |
| BRAKE MARKER        118 m         105 m               -13 m [GRN] |
| APEX VMIN           74 KM/H       78 KM/H             -4 KM/H[RED]|
| THROTTLE PICKUP     422 m         414 m               +8 m  [RED] |
| CORNER DELTA-T      2.841 s       2.759 s             +0.082s[RED]|
| PEAK LONG DECEL     -5.24 G       -4.98 G             -0.26 G     |
|                                                                   |
| LONGITUDINAL DECELERATION PROFILE (118m -> 382m APEX):            |
| 342 KM/H [========================\                             ] |
|           100% BRAKE (118m)        \--- 74 KM/H APEX (382m)       |
+===================================================================+ [756px]
```

#### 7.2 ML Strategy Oracle Mode (345px Width, 756px Height Budget)

```
+===================================================================+ [0px]
| Q3 // ML PHYSICS WARP & STRATEGY SANDBOX            [WARP ACTIVE] | [24px Header]
+-------------------------------------------------------------------+
| SUB-PANEL 3 // CLIENT-SIDE MONTE CARLO STRATEGY ORACLE            | [20px]
|                                                                   |
| [1] REAL-TIME PHYSICS-WARP PERTURBATION:                          |
|   TYRE AGE:      [----*-----------------]  18 LAPS   [#FFE600]    |
|   FUEL LOAD:     [----------*-----------]  45.0 KG   [#00E5FF]    |
|   TRACK TEMP:    [----------------*-----]  42.4 °C   [#FFE600]    |
|                                                                   |
|   WARP PREDICTION: +0.842s / LAP (GRIP: 94.2% | BRAKE: +11.4m)   |
| ----------------------------------------------------------------- |
| [2] DRIVER STRATEGY MATRIX (53 LAPS MONZA):                       |
|   DRIVER A (VER):  [SOFT] ---> BOX LAP 19 ---> [HARD] (1-STOP)    |
|   DRIVER B (NOR):  [MED]  ---> BOX LAP 24 ---> [HARD] (1-STOP)    |
|                                                                   |
|   SAFETY CAR WINDOW: [--------*---------]  LAP 22 / 53 (OR STOCH) |
| ----------------------------------------------------------------- |
| [3] ML UNDERCUT & PIT EXIT VERDICT:                               |
| +---------------------------------------------------------------+ |
| | UNDERCUT OPTIMAL // BOX LAP 19 FOR [H]                        | |
| | NET TRACK GAIN:      +1.84s                                   | |
| | PIT EXIT SEPARATION: +14.2m AT TURN 1                         | |
| | OVERCUT THREAT:      LOW (NOR HARD IN LAP TYRE CLIFF AT L26)  | |
| +---------------------------------------------------------------+ |
|                                                                   |
| [ RUN 5,000-ITERATION MONTE CARLO SIMULATION ]    [ < 1.0ms ]     |
|   WIN PROBABILITY: A: 68.4% | B: 24.1% | OTHER: 7.5%             |
|   PODIUM PROB:     A: 94.2% | B: 88.6%                            |
+===================================================================+ [756px]
```

---

### 8. ACTIONABLE IMPLEMENTATION CODE TEMPLATES

#### 8.1 Supplementary CSS Additions for `frontend/src/styles/aero-spec-hud.css`

```css
/* -------------------------------------------------------------------------- */
/* QUADRANT 3: RETICLES, GAUGES & TACTILE SLIDERS EXTENSION                   */
/* -------------------------------------------------------------------------- */

/* Sub-panel corner reticle brackets */
.subpanel-reticle {
  position: relative;
}

.subpanel-reticle::before {
  content: '';
  position: absolute;
  top: -1px;
  left: -1px;
  right: -1px;
  height: 5px;
  pointer-events: none;
  z-index: 10;
  border-left: 1px solid var(--subpanel-reticle-color, #00e5ff);
  border-right: 1px solid var(--subpanel-reticle-color, #00e5ff);
  background-image:
    linear-gradient(to right, var(--subpanel-reticle-color, #00e5ff) 5px, transparent 5px),
    linear-gradient(to left, var(--subpanel-reticle-color, #00e5ff) 5px, transparent 5px);
  background-size: 5px 1px, 5px 1px;
  background-repeat: no-repeat;
  background-position: top left, top right;
}

.subpanel-reticle::after {
  content: '';
  position: absolute;
  bottom: -1px;
  left: -1px;
  right: -1px;
  height: 5px;
  pointer-events: none;
  z-index: 10;
  border-left: 1px solid var(--subpanel-reticle-color, #00e5ff);
  border-right: 1px solid var(--subpanel-reticle-color, #00e5ff);
  background-image:
    linear-gradient(to right, var(--subpanel-reticle-color, #00e5ff) 5px, transparent 5px),
    linear-gradient(to left, var(--subpanel-reticle-color, #00e5ff) 5px, transparent 5px);
  background-size: 5px 1px, 5px 1px;
  background-repeat: no-repeat;
  background-position: bottom left, bottom right;
}

/* Linear Gauge Bar Containers */
.hud-gauge-bar {
  position: relative;
  height: 8px;
  background-color: #080b10;
  border: 1px solid #1b2230;
  overflow: hidden;
}

.hud-gauge-fill-green {
  height: 100%;
  background-color: var(--hud-green);
  box-shadow: 0 0 6px rgba(0, 255, 102, 0.4);
  transition: width 0.05s linear;
}

.hud-gauge-fill-red {
  height: 100%;
  background-color: var(--hud-red);
  box-shadow: 0 0 6px rgba(255, 30, 68, 0.4);
  transition: width 0.05s linear;
}

/* Big Gear Readout Container */
.hud-gear-box {
  width: 44px;
  height: 48px;
  background-color: #06090e;
  border: 1px solid #1b2230;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--hud-font-mono);
  font-size: 28px;
  font-weight: 900;
  line-height: 1;
  color: var(--hud-cyan);
  text-shadow: 0 0 8px rgba(0, 229, 255, 0.6);
}
```

#### 8.2 Component Skeleton: `RightFlankPanel.tsx`

```tsx
// frontend/src/components/flankRight/RightFlankPanel.tsx
import React from 'react';
import { Sliders } from 'lucide-react';
import { useTelemetryStore } from '../../store/useTelemetryStore';
import { GGTractionRadar } from './GGTractionRadar';
import { SteeringWheelHUD } from './SteeringWheelHUD';
import { CornerAuditCard } from './CornerAuditCard';
import { MlStrategySandbox } from './MlStrategySandbox';

export const RightFlankPanel: React.FC = () => {
  const cockpitMode = useTelemetryStore((s) => s.cockpitMode);

  return (
    <aside
      data-testid="right-flank-panel"
      className="hud-quadrant w-[345px] h-full flex flex-col bg-[#0C1017] border-l border-[#1B2230] select-none font-telemetry tabular-nums overflow-y-auto overflow-x-hidden scrollbar-thin"
    >
      {/* 24px Master Header */}
      <header className="quadrant-header h-[24px] min-h-[24px] flex items-center justify-between px-2 bg-[#080B10] border-b border-[#1B2230]">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-[#00E5FF] inline-block shadow-[0_0_6px_#00E5FF]" />
          <span className="font-bold text-[10px] text-[#E2E8F0] tracking-wider uppercase">
            {cockpitMode === 'TELEMETRY_LAB'
              ? 'Q3 // REAL-TIME TELEMETRY HUD & G-G RADAR'
              : 'Q3 // ML PHYSICS WARP & STRATEGY SANDBOX'}
          </span>
        </div>
        <Sliders className="w-3.5 h-3.5 text-[#64748B]" />
      </header>

      {/* Dynamic Sub-Panels based on Cockpit Mode */}
      {cockpitMode === 'TELEMETRY_LAB' ? (
        <div className="flex-1 flex flex-col min-h-0">
          <GGTractionRadar />
          <SteeringWheelHUD />
          <CornerAuditCard />
        </div>
      ) : (
        <MlStrategySandbox />
      )}
    </aside>
  );
};
```

---

### 9. PERFORMANCE & ZERO-ALLOCATION VERIFICATION CHECKLIST

1. **Zero Virtual DOM Re-renders at 60 Hz:**
   - `GGTractionRadar.tsx` and `SteeringWheelHUD.tsx` MUST use `useDistanceSubscriber` or imperative Direct-DOM / HTML5 Canvas rendering. Subscribing components directly to `currentDistance` via React state triggers 60 full component re-renders per second, which violates the architectural contract.
2. **Cumulative Layout Shift ($\text{CLS} = 0$):**
   - All numerical values (gear, speed, RPM, G-forces, braking distance, deltas) MUST have fixed-width containers (`w-[44px]`, `w-[56px]`, `HUD_CHAR_WIDTHS`) and `tabular-nums slashed-zero`.
3. **Exact Vertical Space Fit at 1080p ($756\,\text{px}$):**
   - Header: $24\,\text{px}$
   - Sub-Panel 3A: $210\,\text{px}$
   - Sub-Panel 3B: $185\,\text{px}$
   - Sub-Panel 3C: $337\,\text{px}$ (`flex-1`)
   - Sum $= 756\,\text{px}$. Exactly 0px overflow on $1920 \times 1080$ screens.
4. **Responsive Overflow Protection on Reduced Viewports ($<850\,\text{px}$):**
   - `overflow-y-auto scrollbar-thin` guarantees that on compact displays, user controls remain fully accessible without clipping or layout collapse.
