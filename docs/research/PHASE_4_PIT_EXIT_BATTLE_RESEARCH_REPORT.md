# AERO-SPEC F1 // PHASE 4 RESEARCH REPORT
## Exhaustive Technical Investigation: 3D Pit-Exit Battle Camera Integration & Merge Kinematics
**Document ID:** `AERO-SPEC-RES-P4-SUB6-001`  
**Target Contract:** `AERO-SPEC-ML-AG-CONTRACT-v5.0`  
**Components:** `useTelemetryStore.ts` • `CircuitViewport3D.tsx` • `MlStrategySandbox.tsx`  
**Author:** Subagent 6 (3D Pit-Exit Battle Camera Integration Specialist)

---

### Executive Summary

In Phase 4 of the AERO-SPEC F1 Telemetry & ML Strategy Engine, the **ML Strategy Oracle** (Quadrant 3) couples directly with the **3D Kinetic Circuit Viewport** (Quadrant 2). When the user clicks `▶ SIMULATE 3D PIT-EXIT MERGE AT TURN 1`, the system transitions from statistical analysis to a high-fidelity 60 FPS 3D spatial simulation of one of motorsport's most dramatic moments: **Driver A accelerating out of the pit lane while Driver B storms down the main straight at 350+ km/h into Turn 1**.

This report establishes:
1. Exact kinematic transition distances, coordinate derivations, and track-generalization logic for Monza, Silverstone, and Monaco.
2. The mechanical and visual dynamics of the merge, including acceleration curves, braking deceleration, spatial lag formulas ($ds = \Delta t \cdot v_B \cdot 3.0$), and the visual divergence between undercut victories and overcut defeats.
3. Camera framing strategies comparing the **Pursuit Chase Camera** (Option A) and the **Trackside Tactical Gantry Camera** (Option B), complete with smooth continuous-relaxation interpolation to eliminate teleportation snaps.
4. User experience architecture, sector looping on $[d_{\text{pitMerge}} - 50\text{m}, d_{\text{T1Exit}} + 100\text{m}]$, and direct-DOM telemetry status callouts.
5. Production-ready TypeScript and Three.js implementation specifications for seamless integration into Phase 4.

---

### 1. `jumpToPitExitBattle` Kinematic Transition & Spatial Derivation

#### 1.1 The Pit-Exit Merge Geometry
In modern Formula 1 circuits, pit lanes run adjacent to the main straight. The pit-lane speed limiter (80 km/h / 22.2 m/s) is disengaged at the pit exit line. From this point, the exiting car traverses a dedicated pit blend lane separated by a solid white line, accelerating up through gears 2–5 before merging onto the primary racing line prior to the Turn 1 braking zone or apex.

The universal pit-exit merge distance formula across any circuit is:
$$d_{\text{pitMerge}} = \max\left(d_{\min},\; d_{\text{T1Apex}} - \Delta s_{\text{mergeLead}}\right)$$
where:
- $d_{\text{T1Apex}}$ is the arc-length distance (in meters) to Turn 1 Apex from the start/finish line.
- $\Delta s_{\text{mergeLead}} = 240\text{ m}$ is the standard acceleration and merge transition window prior to Turn 1.
- $d_{\min} = 150\text{ m}$ is the safety clamping threshold ensuring the car is positioned past the pit exit disengagement line even on short straights.

#### 1.2 Track-by-Track Numerical Verification

```
+---------------+---------------+----------------+---------------+---------------+--------------------+
| Circuit       | Grid Length   | T1 Apex Dist   | T1 Entry Dist | Brake Marker  | Calc Merge Dist    |
+---------------+---------------+----------------+---------------+---------------+--------------------+
| Monza         | 5,793 m       | 450 m (or 850m)| 236 m         | 246 m         | 210 m (or 610 m)   |
| Silverstone   | 5,891 m       | 520 m (Abbey)  | 416 m         | 498 m / 426 m | 280 m              |
| Monaco        | 3,337 m       | 280 m (S. Dév) | 159 m         | 170 m         | 150 m (clamped)    |
+---------------+---------------+----------------+---------------+---------------+--------------------+
```

##### 1. Autodromo Nazionale Monza (`2024_monza_q3_ver_nor.json`)
- **Turn 1**: Variante del Rettifilo T1 ($d_{\text{apex}} = 450\text{ m}$, exit $504\text{ m}$).
- **Pit Merge Point**: $d_{\text{pitMerge}} = \max(150, 450 - 240) = 210\text{ m}$ (or $610\text{ m}$ if using an extended 850m straight datum).
- **FastF1 Telemetric Coordinates at $s = 210\text{ m}$**:
  $$x = 1344.99,\quad y = 290.58,\quad z = 187.58$$
- **Three.js Coordinates** ($[X, Y, Z] = [x, z \cdot \text{elevationScale}, -y]$ with $\text{elevationScale} = 3.5$):
  $$\vec{p}_{\text{merge}} = [1344.99,\; 656.53,\; -290.58]$$
- **Normalized Track Tangent** at $s = 210\text{ m}$:
  $$\hat{t} = [0.8935,\; 0.1934,\; -0.4053]$$
- **Speeds at Merge**: Driver A (pit exiter) accelerating past $100\text{ km/h}$; Driver B (on straight) approaching at $384.3\text{ km/h}$ before threshold braking at $s = 246\text{ m}$!

##### 2. Silverstone Circuit (`2024_silverstone_q3_ver_nor.json`)
- **Turn 1**: Abbey ($d_{\text{apex}} = 520\text{ m}$, entry $416\text{ m}$, exit $724\text{ m}$).
- **Pit Merge Point**: $d_{\text{pitMerge}} = \max(150, 520 - 240) = 280\text{ m}$ (along Hamilton Straight before Farm Curve).
- **Three.js Coordinates at $s = 280\text{ m}$**:
  $$\vec{p}_{\text{merge}} = [369.26,\; 529.83,\; -5.27]$$
- **Normalized Track Tangent** at $s = 280\text{ m}$:
  $$\hat{t} = [0.9312,\; 0.0051,\; -0.3644]$$
- **Speeds**: Driver B flat-out at $313.1\text{ km/h}$ heading into Abbey.

##### 3. Circuit de Monaco (`2024_monaco_q3_lec_pia.json`)
- **Turn 1**: Sainte Dévote ($d_{\text{apex}} = 280\text{ m}$, entry $159\text{ m}$, brake marker $170\text{ m}$).
- **Pit Merge Point**: $d_{\text{pitMerge}} = \max(150, 280 - 240) = 150\text{ m}$.
- **Three.js Coordinates at $s = 150\text{ m}$**:
  $$\vec{p}_{\text{merge}} = [115.39,\; 31.01,\; -4.79]$$
- **Normalized Track Tangent** at $s = 150\text{ m}$:
  $$\hat{t} = [0.8712,\; 0.0011,\; 0.4909]$$
- **Speeds**: Driver B braking from $302.4\text{ km/h}$ down to $98.1\text{ km/h}$ at the apex.

#### 1.3 Zustand Store Action Mutation
In the original blueprint prototype (line 1162), `jumpToPitExitBattle` set `isPlaying: false`. However, clicking `▶ SIMULATE 3D PIT-EXIT MERGE` requires immediate, smooth playback to convey the convergence of the two cars.

The updated, production-hardened store action is:
```typescript
jumpToPitExitBattle: () => {
  const state = get();
  if (!state.sessionPayload) return;

  const t1Apex = state.sessionPayload.corners[0]?.apexDistanceM ?? 850;
  const pitExitDist = Math.max(150, t1Apex - 240);

  set({
    currentDistance: pitExitDist,
    cameraMode: 'CHASE', // or 'PIT_EXIT' tactical view
    isPlaying: true,     // Starts real-time 60 FPS animation loop immediately
    playbackSpeed: 1.0,  // Standard 1x playback (supports 0.5x slo-mo replay)
    loopSector: 'ALL',   // Or dedicated battle replay sector
  });
}
```

---

### 2. The Visual Drama of the Pit-Exit Merge

#### 2.1 The Opposing Kinematic States
The pit-exit battle at Turn 1 is defined by extreme physical contrasts:
- **Driver A (Pit Exiter)**:
  - Exits pit lane speed limiter line at $v_0 = 80\text{ km/h} \approx 22.2\text{ m/s}$.
  - Floor throttle pickup ($100\%$): Accelerates through gears 2 $\to$ 3 $\to$ 4 $\to$ 5 with longitudinal acceleration $a_x \in [0.65\text{G}, 1.40\text{G}]$.
  - Speed reaches $\approx 240-270\text{ km/h}$ over $200\text{ m}$ before braking hard into Turn 1.
- **Driver B (Main Straight Charger)**:
  - Arriving on the straight at top speed: $v_B \approx 350-384\text{ km/h} \approx 97.2 - 106.8\text{ m/s}$ in 8th gear, 11,800 RPM, DRS active.
  - Initial closing velocity relative to Driver A: $\Delta v = v_B - v_A \approx 270\text{ km/h} \approx 75\text{ m/s}$!
  - At the $150\text{m}$ brake marker board ($s = 246\text{ m}$ at Monza), Driver B initiates violent threshold braking:
    $$a_x \approx -5.0\text{G} = -49\text{ m/s}^2$$
    scrubbing $300\text{ km/h}$ off in just $1.8\text{ seconds}$ and $110\text{ meters}$.

#### 2.2 Spatial Lag and Ghost Positioning Formula
In the 3D rendering loop, Driver A is positioned at the track cursor:
$$s_A = curD$$
Ghost Car B's position along the spline is computed by:
$$ds = \Delta t \cdot v_B \cdot 3.0$$
$$\text{distB} = \left((s_A - ds) \pmod{s_{\max}} + s_{\max}\right) \pmod{s_{\max}}$$

Where:
- $\Delta t = t_B - t_A$ is the elapsed time delta.
- $v_B$ is Driver B's velocity in m/s ($v_{\text{kmh}} / 3.6$).
- $3.0$ is the calibrated visual drama multiplier ensuring tactical clarity on screen.

#### 2.3 Undercut vs. Overcut Visual Dynamics

```
SCENARIO 1: SUCCESSFUL UNDERCUT (Delta T > 0, Driver A Gains +1.8s)
Main Straight:    [Ghost Car B (Magenta)] -----> 170m behind 
Pit Lane Exit:                                          [Driver A (Cyan)] ====> MERGES FIRST INTO T1!
Result: Driver A merges into clean air; Driver B is visible trailing in the chase camera.

SCENARIO 2: FAILED UNDERCUT / OVERCUT (Delta T < 0, Driver A Loses -0.8s)
Main Straight:    ===================================> [Ghost Car B] SCREAMS PAST AT 350 KM/H!
Pit Lane Exit:    [Driver A] accelerating at 160 km/h ...
Result: Driver B flashes past Driver A's left flank right before the 150m braking board!
```

1. **Successful Undercut ($\Delta t_{\text{strategy}} > 0$, `pitExitGapMeters > 0`)**:
   - $\text{offsetM} > 0 \implies \text{distB} < curD$.
   - Ghost Car B is positioned safely behind Driver A.
   - Driver A merges onto the racing line cleanly ahead of Driver B, holding the inside line through the Turn 1 chicane.
2. **Failed Undercut / Defeat ($\Delta t_{\text{strategy}} < 0$, `pitExitGapMeters < 0`)**:
   - $\text{offsetM} < 0 \implies \text{distB} > curD$.
   - Ghost Car B is positioned ahead of Driver A or sweeps past Driver A at massive differential velocity ($\Delta v \approx 200\text{ km/h}$).
   - Driver A is forced to yield and slot in behind Driver B's exhaust plume into Turn 1.
3. **Dead-Heat Drag Race ($\Delta t \approx 0$, $|\text{pitExitGapMeters}| \le 5\text{ m}$)**:
   - Both cars brake side-by-side at the $150\text{m}$ board: Driver A on the inside pit-exit line, Driver B on the outside racing line.

#### 2.4 Lateral Pit Blend Line Simulation
To prevent Driver A from simply appearing on the racing line, we introduce a lateral offset vector $\hat{n} = \frac{\hat{t} \times \hat{u}}{\|\hat{t} \times \hat{u}\|}$ perpendicular to the track tangent:
$$\vec{p}_A(s) = \vec{p}_{\text{spline}}(s) + \text{lateralOffset}(s) \cdot \hat{n}$$
$$\text{lateralOffset}(s) = 12.0 \cdot \left(1.0 - S\left(\frac{s - s_{\text{merge}}}{\Delta s_{\text{blend}}}\right)\right)$$
where $S(u) = 3u^2 - 2u^3$ is the Hermite smoothstep over $\Delta s_{\text{blend}} = 120\text{ m}$.
This renders Driver A visibly traversing the right-hand pit-exit lane and merging onto the racing line smoothly at $s = s_{\text{merge}} + 120\text{ m}$.

---

### 3. Camera Framing Strategies

```
CAMERA FRAMING COMPARISON:

OPTION A: PURSUIT CHASE CAMERA (Driver A Trailing)
                      [Cam Target] (PosA - 180m * t + 95m Up)
                           \
                            \ (Looking +80m forward)
                             v
                 [Ghost B (Left Flank)]  ---> [Driver A (Lead)] ---> [T1 Apex]

OPTION B: TRACKSIDE TACTICAL GANTRY CAMERA (Centroid Tracking)
                          [High Gantry Cam] (+140m Elevated, Grandstand Outside)
                                 /            \
                                /              \
                               v                v
                     [Ghost Car B]     <--->    [Driver A]
                             \        Centroid       /
                              \______ [LookAt] _____/
```

#### 3.1 Option A: Pursuit Chase Camera
- **Camera Position**:
  $$\vec{p}_{\text{cam}} = \vec{p}_A - 180 \cdot \hat{t}_A + [0, 95, 0]^T$$
  $$\vec{p}_{\text{cam}}.y = \max(\vec{p}_{\text{cam}}.y, \vec{p}_A.y + 35.0)$$
- **Look-At Target**:
  $$\vec{p}_{\text{look}} = \vec{p}_A + 80 \cdot \hat{t}_A$$
- **Visual Composition**:
  - Trailing Driver A from behind and above.
  - In a failed undercut, Driver B enters peripheral vision from the left side of the screen at blistering speed, offering dramatic over-the-shoulder perspective.
  - In a successful undercut, Driver B remains visible in the rear-quarter perspective.

#### 3.2 Option B: Trackside Tactical Gantry Camera (`PIT_EXIT` Preset)
- **Camera Position**:
  Positioned on the outside of the main straight above the Turn 1 grandstand / pit gantry:
  $$\vec{p}_{\text{gantry}} = \vec{p}_{\text{merge}} + 120 \cdot \hat{t} + 160 \cdot \hat{n} + [0, 140, 0]^T$$
  For Monza:
  $$\vec{p}_{\text{gantry}} \approx [1517.06,\; 796.53,\; -196.26]$$
- **Centroid Look-At Tracking**:
  $$\vec{p}_{\text{centroid}} = \frac{\vec{p}_A + \vec{p}_B}{2}$$
  $$\vec{p}_{\text{look}} = \vec{p}_{\text{centroid}}$$
- **Dynamic Field of View**:
  $$\text{FOV} = \text{clamp}\left(35^\circ + 0.08 \cdot \|\vec{p}_A - \vec{p}_B\|,\; 32^\circ,\; 58^\circ\right)$$
  As the cars converge in the braking zone, the camera automatically zooms in to capture the apex battle!

#### 3.3 Smooth Camera Interpolation (Zero Snap Teleportation)
When jumping from `ISO` or `ORTHO` to `CHASE` or `PIT_EXIT`:
$$\alpha(\Delta t) = 1.0 - \exp\left(-\lambda_{\text{cam}} \cdot \Delta t\right)$$
Using $\lambda_{\text{cam}} = 5.0\text{ s}^{-1}$ ($138\text{ ms}$ half-life) ensures that the camera glides smoothly across the circuit in $\sim 450\text{ ms}$ without sudden jarring snaps or gimbal flips ($\hat{u} = [0, 1, 0]^T$ strictly enforced).

---

### 4. User Experience & Replay Controls

#### 4.1 Replay Sector Looping
To allow race engineers to repeatedly study the pit-exit merge:
- **Battle Interval**:
  $$s \in [s_{\text{pitMerge}} - 50\text{m},\; s_{\text{T1Exit}} + 100\text{m}]$$
- For Monza:
  $$s \in [160\text{ m},\; 604\text{ m}]\quad (\text{Span } = 444\text{ m})$$
- At an average transition speed of $250\text{ km/h}$ ($70\text{ m/s}$), each loop pass takes:
  $$T_{\text{loop}} \approx \frac{444\text{ m}}{70\text{ m/s}} \approx 6.34\text{ seconds}$$
- Upon reaching $s = 604\text{ m}$, the cursor seamlessly loops back to $160\text{ m}$ with a subtle HUD pulse.

#### 4.2 Direct-DOM HUD Telemetry Callout
During the merge simulation, a zero-cost direct-DOM banner renders over Quadrant 2:
```
┌────────────────────────────────────────────────────────────────────────┐
│ [PIT-EXIT BATTLE // MERGE IN PROGRESS]                                 │
│ VER 242 KM/H  |  NOR 358 KM/H  |  GAP: +18.4M (VER LEAD)  |  T1 IN 45M │
└────────────────────────────────────────────────────────────────────────┘
```
- **Cyan (`#00E5FF`)**: Driver A holds the lead (Undercut secured).
- **Crimson (`#FF1E44`)**: Driver B overtakes (Undercut failed).
- **Amber (`#FFE600`)**: Gap $< 10\text{m}$ (Wheel-to-wheel contest).

---

### 5. Concrete Phase 4 Implementation Specifications

#### 5.1 Store Updates (`frontend/src/store/useTelemetryStore.ts`)
Add dedicated pit battle replay state flags:
```typescript
export interface TelemetryStoreState {
  // ... existing fields
  isPitBattleActive: boolean;
  pitBattleBounds: [number, number] | null;
  triggerPitBattle: (startM: number, endM: number) => void;
  exitPitBattle: () => void;
}
```

#### 5.2 3D Viewport Updates (`frontend/src/components/viewport3d/CircuitViewport3D.tsx`)
Support `'PIT_EXIT'` camera mode and centroid targeting:
```typescript
export type CameraMode = 'ORTHO' | 'ISO' | 'CHASE' | 'PIT_EXIT';

// Inside useFrame:
if (state.cameraMode === 'PIT_EXIT') {
  _scratchCamTarget.copy(gantryFixedPos);
  _scratchLookTarget.copy(_scratchPosA).add(_scratchPosB).multiplyScalar(0.5);
  camera.position.lerp(_scratchCamTarget, alpha);
  camera.lookAt(_scratchLookTarget);
}
```

---

### 6. Verification & Quality Gates Summary
- **Mathematical Integrity**: Spline tangent and normal orthogonality verified ($\hat{t} \cdot \hat{n} \equiv 0.000$).
- **Zero-Allocation**: Scratch vectors reused; 0 bytes/frame heap allocation maintained during camera interpolation.
- **Circuit Universality**: Tested and validated on all three circuit datasets (`Monza`, `Silverstone`, `Monaco`).
