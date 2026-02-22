# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Knitting stitch calculator — a zero-dependency static web app (vanilla HTML/CSS/JS) that computes how to evenly distribute stitch increases or decreases across knitting rows. No build step, no package manager, no framework.

## Running and Deploying

- **Run locally**: Open `index.html` in a browser. No server or build required.
- **Deploy**: Pushes to `main` auto-deploy to GitHub Pages via `.github/workflows/deploy.yml`.
- **No test framework, linter, or build tooling is configured.**

## Architecture

All logic lives in three files: `index.html`, `script.js`, `style.css`.

**script.js** is wrapped in an IIFE with `"use strict"` and organized into layers:

1. **Algorithm** — `bresenhamDistribute(total, groups)` uses Bresenham-style error accumulation to spread remainder items evenly across groups.
2. **Calculation engines** — `calcIncrease()`, `calcDenseIncrease()` (when additions > existing stitches), `calcDecrease()` (k2tog). Router: `calculate(start, target)`.
3. **Verification** — Every calculation result self-verifies (e.g., `knitSum + addCount === target`). Functions: `verifyIncrease()`, `verifyDecrease()`.
4. **Validation** — `validate(startStr, secondStr, mode)` handles input parsing and mode logic.
5. **UI/DOM** — Form handling, mode switching ("Change by" vs "Target total"), checklist rendering with progress bar, dark mode toggle (localStorage + `[data-theme="dark"]`), clipboard integration.

**style.css** uses CSS custom properties for theming (`--bg`, `--card`, `--accent`, etc.) with light-mode defaults and `[data-theme="dark"]` overrides.

## Code Conventions

- ES5-compatible JavaScript throughout (no arrow functions, no const/let)
- Naming: `calc*` for calculators, `verify*` for validators, `show*/hide*` for UI, DOM refs suffixed with `El`
- Result objects follow shape: `{ type, summary, steps: [{ text, knit, action }], verify: { ok, text } }`
- Mobile-first CSS with 500px breakpoint
