# Azevedo ERP - Food Service Management System

A premium, full-stack management system designed for multi-brand food networks, optimized for scalability, delivery efficiency, and financial intelligence.

## Features

- **Dashboard High-Performance**: KPIs for revenue, net profit, CMV, and ticket average.
- **Dynamic DRE**: Automated financial reporting with EBITDA and margin analysis.
- **CMV & Inventory**: Advanced tracking of protein costs, technical sheets, and supplier management.
- **Hybrid Routing**: Intelligent environment detection (HashRouter for previews, BrowserRouter for production).
- **Multi-Brand Themes**:
  - **4 Estylos**: Dark Premium Red theme.
  - **Bebelu**: Clean Corporate Blue theme.
- **AI Insights**: Predictive analysis using Google Gemini for operational optimization.

## Tech Stack

- **Frontend**: React 18, Vite, TypeScript, Tailwind CSS.
- **Animations**: Framer Motion.
- **Charts**: Recharts.
- **Icons**: Lucide React.
- **Theme**: Semantic multi-brand CSS variables.

## Getting Started

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment**:
   Create a `.env` file based on `.env.example` and add your `GEMINI_API_KEY`.

3. **Run Development Server**:
   ```bash
   npm run dev
   ```

4. **Build for Production**:
   ```bash
   npm run build
   ```

## Architecture

- `src/contexts`: Multi-brand state management.
- `src/pages`: Modular dashboard, financial, and operational views.
- `src/lib`: Mock data utilities for realistic simulations.
- `src/types`: Strict TypeScript definitions for food service resources.

---
© 2024 Grupo Azevedo Alimentos.
