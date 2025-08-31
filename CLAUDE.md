# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an interactive HTML/CSS/JavaScript project called "interactive-comics" that creates an atmospheric cyberpunk-themed animation featuring "Agent Dust" (Агент Пыли) in Russian. The project is built using Vite with React, though the current implementation is pure HTML/CSS/JavaScript.

## Development Commands

- `npm run dev` - Start development server with Vite
- `npm run build` - Build the project for production  
- `npm run preview` - Preview the production build locally

## Project Structure

The project is currently very simple:
- `index.html` - Main HTML file containing the complete interactive comic scene
- `package.json` - Project configuration with Vite and React dependencies
- `vite.config.js` - Vite configuration with React plugin

## Architecture Notes

The current implementation is entirely self-contained in `index.html`:
- Pure CSS animations with keyframes for visual effects (flickering, glitch, typewriter, particles)
- Minimal JavaScript for interactivity (postcard click interaction, monitor flickering effects)  
- Cyberpunk aesthetic with Russian text and metro map SVG graphics
- No external dependencies or frameworks used in the actual implementation despite React being configured

The project appears to be in transition - it has React configured via Vite but the current implementation doesn't use React components. Future development may involve converting the HTML/CSS/JS implementation to React components.