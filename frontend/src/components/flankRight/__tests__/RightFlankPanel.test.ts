// frontend/src/components/flankRight/__tests__/RightFlankPanel.test.ts
/**
 * AERO-SPEC F1 // QUADRANT 3: RIGHT FLANK PANEL TEST SUITE
 * Master Container Verification: RightFlankPanel.tsx
 * Specification: AERO-SPEC-ML-AG-CONTRACT-v5.0 Section 5.8
 * Master Blueprint: aero_spec_antigravity_master_blueprint.md (lines 2239-2286)
 *
 * Automated Multi-Gate Test Coverage:
 * 1. Exact 1080p Pixel Height Allocation (756px total = 24px + 210px + 185px + 337px / 24px + 732px)
 * 2. Static AST & Gate 5 Conformance (Strict Zero-VDOM Subscription Contract)
 * 3. Aerospace NASA FDO / Mercedes ATLAS Styling Invariants (0px radius, void carbon, hairlines)
 * 4. Dual-Mode Conditional Rendering (TELEMETRY_LAB vs ML_STRATEGY_ORACLE)
 * 5. Interactive Mode Switching & Store State Synchronization
 * 6. React.memo Decoupling & Component DisplayName
 */

import test, { describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import React from 'react';
import { renderToString } from 'react-dom/server';
import {
  RightFlankPanel,
  Q3_PANEL_HEIGHTS,
} from '../RightFlankPanel';
import { useTelemetryStore } from '../../../store/useTelemetryStore';
import type { SessionTelemetryPayload } from '../../../types/telemetry';

describe('Aero-Spec Phase 4: Quadrant 3 Container (RightFlankPanel) Test Suite', { concurrency: 1 }, () => {
  // Locate telemetry fixtures robustly
  const telemetryDir = fs.existsSync(path.resolve(process.cwd(), 'public/telemetry'))
    ? path.resolve(process.cwd(), 'public/telemetry')
    : path.resolve(process.cwd(), 'frontend/public/telemetry');

  const monzaPath = path.resolve(telemetryDir, '2024_monza_q3_ver_nor.json');
  const monzaBundle: SessionTelemetryPayload = JSON.parse(fs.readFileSync(monzaPath, 'utf8'));

  const componentPath = fs.existsSync(
    path.resolve(process.cwd(), 'src/components/flankRight/RightFlankPanel.tsx')
  )
    ? path.resolve(process.cwd(), 'src/components/flankRight/RightFlankPanel.tsx')
    : path.resolve(process.cwd(), 'frontend/src/components/flankRight/RightFlankPanel.tsx');

  beforeEach(() => {
    // Reset Zustand store state before each test
    useTelemetryStore.setState({
      sessionPayload: monzaBundle,
      isLoading: false,
      error: null,
      cockpitMode: 'TELEMETRY_LAB',
      currentDistance: 0,
      maxDistance: 5793,
      isPlaying: false,
      playbackSpeed: 1.0,
      cameraMode: 'ISO',
      trackColorMode: 'PEDAL',
      elevationScale: 3.5,
      loopSector: 'ALL',
      strategyResult: null,
    });
  });

  // ============================================================================
  // GATE 1: DETERMINISTIC PIXEL HEIGHT ALLOCATION & MATHEMATICAL INVARIANTS
  // ============================================================================
  describe('Gate 1: Exact 1080p Pixel Height Geometry (756px Total Budget)', () => {
    test('enforces exact mathematical identity: Header(24px) + 3A(210px) + 3B(185px) + 3C(337px) = 756px', () => {
      const sumTelemetryLab =
        Q3_PANEL_HEIGHTS.HEADER +
        Q3_PANEL_HEIGHTS.SUBPANEL_3A_RADAR +
        Q3_PANEL_HEIGHTS.SUBPANEL_3B_STEERING +
        Q3_PANEL_HEIGHTS.SUBPANEL_3C_CORNER;

      assert.strictEqual(
        sumTelemetryLab,
        756,
        'Sum of TELEMETRY_LAB sub-panels must exactly equal 756px'
      );
      assert.strictEqual(
        sumTelemetryLab,
        Q3_PANEL_HEIGHTS.TOTAL,
        'Sum must equal Q3_PANEL_HEIGHTS.TOTAL'
      );
    });

    test('enforces exact mathematical identity: Header(24px) + ML_Sandbox(732px) = 756px', () => {
      const sumMlMode = Q3_PANEL_HEIGHTS.HEADER + Q3_PANEL_HEIGHTS.ML_SANDBOX;

      assert.strictEqual(
        sumMlMode,
        756,
        'Sum of ML_STRATEGY_ORACLE sub-panels must exactly equal 756px'
      );
      assert.strictEqual(
        sumMlMode,
        Q3_PANEL_HEIGHTS.TOTAL,
        'Sum must equal Q3_PANEL_HEIGHTS.TOTAL'
      );
    });

    test('exports Q3_PANEL_HEIGHTS constant with immutable readonly values', () => {
      assert.strictEqual(Q3_PANEL_HEIGHTS.TOTAL, 756);
      assert.strictEqual(Q3_PANEL_HEIGHTS.HEADER, 24);
      assert.strictEqual(Q3_PANEL_HEIGHTS.SUBPANEL_3A_RADAR, 210);
      assert.strictEqual(Q3_PANEL_HEIGHTS.SUBPANEL_3B_STEERING, 185);
      assert.strictEqual(Q3_PANEL_HEIGHTS.SUBPANEL_3C_CORNER, 337);
      assert.strictEqual(Q3_PANEL_HEIGHTS.ML_SANDBOX, 732);
    });
  });

  // ============================================================================
  // GATE 2: ZERO-VDOM RE-RENDER DECOUPLING & GATE 5 AST CONFORMANCE
  // ============================================================================
  describe('Gate 2: Static AST & Zero-VDOM Subscription Invariant (Gate 5 Conformance)', () => {
    test('RightFlankPanel source code strictly does NOT subscribe to currentDistance', () => {
      const source = fs.readFileSync(componentPath, 'utf8');

      assert.ok(
        !/useTelemetryStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.currentDistance\s*\)/.test(source),
        'Forbidden reactive subscription found: (s) => s.currentDistance'
      );
      assert.ok(
        !/useTelemetryStore\s*\(\s*\(\s*state\s*\)\s*=>\s*state\.currentDistance\s*\)/.test(source),
        'Forbidden reactive subscription found: (state) => state.currentDistance'
      );
      assert.ok(
        !/const\s*\{\s*[^}]*currentDistance[^}]*\}\s*=\s*useTelemetryStore\s*\(\s*\)/.test(source),
        'Forbidden destructuring of currentDistance from useTelemetryStore'
      );
    });

    test('RightFlankPanel source code strictly does NOT subscribe to isPlaying', () => {
      const source = fs.readFileSync(componentPath, 'utf8');

      assert.ok(
        !/useTelemetryStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.isPlaying\s*\)/.test(source),
        'Forbidden reactive subscription found: (s) => s.isPlaying'
      );
      assert.ok(
        !/useTelemetryStore\s*\(\s*\(\s*state\s*\)\s*=>\s*state\.isPlaying\s*\)/.test(source),
        'Forbidden reactive subscription found: (state) => state.isPlaying'
      );
    });

    test('RightFlankPanel source code strictly does NOT subscribe to speed or telemetry arrays', () => {
      const source = fs.readFileSync(componentPath, 'utf8');

      assert.ok(
        !/useTelemetryStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.speed\w*\s*\)/.test(source),
        'Forbidden reactive subscription to speed'
      );
    });

    test('RightFlankPanel source code subscribes ONLY to cockpitMode and setCockpitMode', () => {
      const source = fs.readFileSync(componentPath, 'utf8');

      assert.ok(
        /useTelemetryStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.cockpitMode\s*\)/.test(source),
        'Must subscribe to cockpitMode'
      );
      assert.ok(
        /useTelemetryStore\s*\(\s*\(\s*s\s*\)\s*=>\s*s\.setCockpitMode\s*\)/.test(source),
        'Must subscribe to setCockpitMode'
      );
    });

    test('RightFlankPanel is wrapped in React.memo for render decoupling', () => {
      const source = fs.readFileSync(componentPath, 'utf8');

      assert.ok(
        /React\.memo\s*\(/.test(source),
        'RightFlankPanel must be wrapped in React.memo'
      );
      assert.strictEqual(
        RightFlankPanel.displayName,
        'RightFlankPanel',
        'RightFlankPanel must specify displayName'
      );
    });
  });

  // ============================================================================
  // GATE 3: AEROSPACE ATLAS / NASA FDO STYLING & ZERO BORDER-RADIUS
  // ============================================================================
  describe('Gate 3: Aerospace ATLAS Styling & Design Token Conformance', () => {
    test('enforces zero border-radius mandate (rounded-none and no rounded-*)', () => {
      const html = renderToString(React.createElement(RightFlankPanel));

      assert.ok(
        html.includes('rounded-none'),
        'Master container and buttons must include rounded-none class'
      );
      assert.ok(
        !html.includes('rounded-md') &&
          !html.includes('rounded-lg') &&
          !html.includes('rounded-xl') &&
          !html.includes('rounded-full'),
        'Interface must strictly prohibit curved border-radius classes'
      );
    });

    test('includes pure CSS optical reticle crosshair class (.hud-quadrant)', () => {
      const html = renderToString(React.createElement(RightFlankPanel));

      assert.ok(
        html.includes('hud-quadrant'),
        'Container must include hud-quadrant for ::before and ::after reticle crosshairs'
      );
    });

    test('applies Void Carbon (#05070B) background and Hairline Seam (#1B2230) border', () => {
      const html = renderToString(React.createElement(RightFlankPanel));

      assert.ok(
        html.includes('bg-[#05070B]'),
        'Must apply Void Carbon background token #05070B'
      );
      assert.ok(
        html.includes('border-[#1B2230]'),
        'Must apply hairline seam border token #1B2230'
      );
    });

    test('preserves 360px grid width constraint matching App.tsx column 3', () => {
      const html = renderToString(React.createElement(RightFlankPanel));

      assert.ok(
        html.includes('md:w-[360px]') || html.includes('w-[360px]'),
        'Container must specify 360px grid width allocation'
      );
    });

    test('strictly enforces 756px vertical boundary with overflow-hidden', () => {
      const html = renderToString(React.createElement(RightFlankPanel));

      assert.ok(
        html.includes('h-[756px]'),
        'Container must enforce exact h-[756px] budget'
      );
      assert.ok(
        html.includes('overflow-hidden'),
        'Container must enforce overflow-hidden to guarantee 0px layout spill'
      );
    });
  });

  // ============================================================================
  // GATE 4: CONDITIONAL RENDERING IN TELEMETRY_LAB MODE
  // ============================================================================
  describe('Gate 4: TELEMETRY_LAB Mode Conditional Sub-Panel Mounting', { concurrency: 1 }, () => {
    test('renders Quadrant Header with TELEMETRY_LAB title and Cyan pip', () => {
      useTelemetryStore.setState({ cockpitMode: 'TELEMETRY_LAB' });
      const html = renderToString(
        React.createElement(RightFlankPanel, { cockpitMode: 'TELEMETRY_LAB' })
      );

      assert.ok(
        html.includes('Q3 // INERTIAL G-G &amp; STEERING HUD') ||
          html.includes('Q3 // INERTIAL G-G & STEERING HUD'),
        'Header must display telemetry mode title'
      );
      assert.ok(
        html.includes('bg-[#00E5FF]'),
        'Diagnostic pip must display Electric Cyan (#00E5FF)'
      );
    });

    test('renders mode toggle button with OPEN ML SANDBOX prompt in TELEMETRY_LAB mode', () => {
      useTelemetryStore.setState({ cockpitMode: 'TELEMETRY_LAB' });
      const html = renderToString(
        React.createElement(RightFlankPanel, { cockpitMode: 'TELEMETRY_LAB' })
      );

      assert.ok(
        html.includes('OPEN ML SANDBOX'),
        'Toggle button must offer transition to ML Sandbox'
      );
      assert.ok(
        html.includes('data-testid="mode-toggle-btn"'),
        'Toggle button must be identifiable via data-testid'
      );
    });

    test('mounts Sub-Panel 3A (GGTractionRadar) in 210px container', () => {
      useTelemetryStore.setState({ cockpitMode: 'TELEMETRY_LAB' });
      const html = renderToString(
        React.createElement(RightFlankPanel, { cockpitMode: 'TELEMETRY_LAB' })
      );

      assert.ok(
        html.includes('data-testid="subpanel-3a-radar-container"'),
        'Must mount Sub-Panel 3A container'
      );
      assert.ok(
        html.includes('h-[210px]'),
        'Sub-Panel 3A container must enforce exact 210px height'
      );
    });

    test('mounts Sub-Panel 3B (SteeringWheelHUD) in 185px container', () => {
      useTelemetryStore.setState({ cockpitMode: 'TELEMETRY_LAB' });
      const html = renderToString(
        React.createElement(RightFlankPanel, { cockpitMode: 'TELEMETRY_LAB' })
      );

      assert.ok(
        html.includes('data-testid="subpanel-3b-steering-container"'),
        'Must mount Sub-Panel 3B container'
      );
      assert.ok(
        html.includes('h-[185px]'),
        'Sub-Panel 3B container must enforce exact 185px height'
      );
    });

    test('mounts Sub-Panel 3C (CornerAuditCard) in 337px flex-1 container', () => {
      useTelemetryStore.setState({ cockpitMode: 'TELEMETRY_LAB' });
      const html = renderToString(
        React.createElement(RightFlankPanel, { cockpitMode: 'TELEMETRY_LAB' })
      );

      assert.ok(
        html.includes('data-testid="subpanel-3c-corner-container"'),
        'Must mount Sub-Panel 3C container'
      );
      assert.ok(
        html.includes('h-[337px]'),
        'Sub-Panel 3C container must specify 337px height'
      );
      assert.ok(
        html.includes('flex-1'),
        'Sub-Panel 3C container must specify flex-1'
      );
    });

    test('does NOT mount MlStrategySandbox in TELEMETRY_LAB mode', () => {
      useTelemetryStore.setState({ cockpitMode: 'TELEMETRY_LAB' });
      const html = renderToString(
        React.createElement(RightFlankPanel, { cockpitMode: 'TELEMETRY_LAB' })
      );

      assert.ok(
        !html.includes('data-testid="ml-strategy-oracle-container"'),
        'ML Strategy container must NOT mount in TELEMETRY_LAB mode'
      );
      assert.ok(
        !html.includes('data-testid="ml-strategy-sandbox-container"'),
        'ML Strategy sandbox must NOT mount in TELEMETRY_LAB mode'
      );
    });
  });

  // ============================================================================
  // GATE 5: CONDITIONAL RENDERING IN ML_STRATEGY_ORACLE MODE
  // ============================================================================
  describe('Gate 5: ML_STRATEGY_ORACLE Mode Conditional Sub-Panel Mounting', { concurrency: 1 }, () => {
    test('renders Quadrant Header with ML Oracle title and Amber pip', () => {
      useTelemetryStore.setState({ cockpitMode: 'ML_STRATEGY_ORACLE' });
      const html = renderToString(
        React.createElement(RightFlankPanel, { cockpitMode: 'ML_STRATEGY_ORACLE' })
      );

      assert.ok(
        html.includes('Q3 // ML PIT-WINDOW &amp; PHYSICS SANDBOX') ||
          html.includes('Q3 // ML PIT-WINDOW & PHYSICS SANDBOX'),
        'Header must display ML Oracle mode title'
      );
      assert.ok(
        html.includes('bg-[#FFE600]'),
        'Diagnostic pip must display Solar Amber (#FFE600)'
      );
    });

    test('renders mode toggle button with LIVE HUD prompt in ML_STRATEGY_ORACLE mode', () => {
      useTelemetryStore.setState({ cockpitMode: 'ML_STRATEGY_ORACLE' });
      const html = renderToString(
        React.createElement(RightFlankPanel, { cockpitMode: 'ML_STRATEGY_ORACLE' })
      );

      assert.ok(
        html.includes('LIVE HUD'),
        'Toggle button must offer return to LIVE HUD'
      );
      assert.ok(
        html.includes('data-testid="mode-toggle-btn"'),
        'Toggle button must be present'
      );
    });

    test('mounts MlStrategySandbox in 732px flex-1 container', () => {
      useTelemetryStore.setState({ cockpitMode: 'ML_STRATEGY_ORACLE' });
      const html = renderToString(
        React.createElement(RightFlankPanel, { cockpitMode: 'ML_STRATEGY_ORACLE' })
      );

      assert.ok(
        html.includes('data-testid="ml-strategy-oracle-container"'),
        'Must mount ML Strategy container'
      );
      assert.ok(
        html.includes('h-[732px]'),
        'ML Strategy container must enforce 732px height'
      );
      assert.ok(
        html.includes('flex-1'),
        'ML Strategy container must specify flex-1'
      );
    });

    test('does NOT mount G-G Radar, Steering Wheel HUD, or Corner Card in ML mode', () => {
      useTelemetryStore.setState({ cockpitMode: 'ML_STRATEGY_ORACLE' });
      const html = renderToString(
        React.createElement(RightFlankPanel, { cockpitMode: 'ML_STRATEGY_ORACLE' })
      );

      assert.ok(
        !html.includes('data-testid="subpanel-3a-radar-container"'),
        'Sub-Panel 3A must NOT mount in ML mode'
      );
      assert.ok(
        !html.includes('data-testid="subpanel-3b-steering-container"'),
        'Sub-Panel 3B must NOT mount in ML mode'
      );
      assert.ok(
        !html.includes('data-testid="subpanel-3c-corner-container"'),
        'Sub-Panel 3C must NOT mount in ML mode'
      );
    });
  });

  // ============================================================================
  // GATE 6: INTERACTIVE MODE SWITCHING & STATE SYNCHRONIZATION
  // ============================================================================
  describe('Gate 6: Mode Switching & Store State Synchronization', () => {
    test('transitions store state from TELEMETRY_LAB to ML_STRATEGY_ORACLE and back', () => {
      const { setCockpitMode } = useTelemetryStore.getState();

      assert.strictEqual(
        useTelemetryStore.getState().cockpitMode,
        'TELEMETRY_LAB',
        'Initial mode should be TELEMETRY_LAB'
      );

      setCockpitMode('ML_STRATEGY_ORACLE');
      assert.strictEqual(
        useTelemetryStore.getState().cockpitMode,
        'ML_STRATEGY_ORACLE',
        'State must update to ML_STRATEGY_ORACLE'
      );

      setCockpitMode('TELEMETRY_LAB');
      assert.strictEqual(
        useTelemetryStore.getState().cockpitMode,
        'TELEMETRY_LAB',
        'State must update back to TELEMETRY_LAB'
      );
    });

    test('supports custom className and style injection through props', () => {
      const html = renderToString(
        React.createElement(RightFlankPanel, {
          className: 'custom-q3-test-class',
          style: { zIndex: 42 },
        })
      );

      assert.ok(
        html.includes('custom-q3-test-class'),
        'Custom className must be appended to aside classes'
      );
      assert.ok(
        html.includes('z-index:42') || html.includes('z-index: 42'),
        'Custom style prop must be merged into aside container'
      );
    });
  });
});
