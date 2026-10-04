# XK-Fi Frontend - TDA Visualization React App

## Overview
This folder contains the React frontend application for the XK-Fi Topological Data Analysis visualization platform.

## Tech Stack
- **React**: 19.1.1 with modern hooks and functional components
- **Vite**: Fast build tool and development server
- **D3.js**: Data visualization library for TDA charts
- **Tailwind CSS**: Utility-first CSS framework
- **PostCSS**: CSS processing with autoprefixer

## Project Structure
```
frontend/
├── src/
│   ├── App.jsx                 # Main application component
│   ├── main.jsx               # React entry point
│   ├── index.css              # Global styles
│   └── components/
│       ├── PersistenceDiagram.jsx  # D3-based persistence diagram
│       ├── BarcodeChart.jsx        # Barcode visualization
│       ├── DatasetSelector.jsx     # Dataset switching UI
│       └── TDAExplanation.jsx      # Educational component
├── public/
│   ├── index.html             # HTML template
│   └── data/                  # Static TDA datasets
│       ├── circle-persistence.json
│       └── sine-persistence.json
├── package.json               # Dependencies and scripts
├── vite.config.js            # Vite configuration
├── tailwind.config.js        # Tailwind CSS config
└── postcss.config.js         # PostCSS configuration
```

## Development Commands

### Install Dependencies
```bash
npm install
```

### Start Development Server
```bash
npm run dev
```
Opens the app at `http://localhost:5173`

### Build for Production
```bash
npm run build
```
Creates optimized build in `dist/` folder

### Lint Code
```bash
npm run lint
```

### Preview Production Build
```bash
npm run preview
```

## Current Features
- Interactive persistence diagram visualization
- Barcode chart representation of topological features
- Dataset switching between circle and sine wave patterns
- Educational explanations of TDA concepts
- Responsive design with Tailwind CSS
- Real-time data loading and visualization

## Planned MVP Enhancements
- Dynamic dataset upload and processing
- User authentication integration
- Real-time TDA computation results
- Enhanced interactive features (zoom, pan, filtering)
- Export capabilities (PNG, SVG, PDF)
- Performance optimizations for large datasets

## Development Notes
- Uses Vite for fast HMR (Hot Module Replacement)
- D3.js integrated with React using useRef and useEffect
- Tailwind CSS for consistent styling
- Component-based architecture for maintainability
- Static data currently loaded from `public/data/`

## API Integration (Planned)
The frontend will connect to a backend API for:
- User authentication (`/api/auth/*`)
- Dataset management (`/api/datasets/*`)
- TDA computation (`/api/tda/*`)
- User profiles (`/api/users/*`)

## Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---
*For full project documentation, see `../project-docs/`*
