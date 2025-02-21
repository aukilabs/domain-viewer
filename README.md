# Auki Domain Viewer

![Domain Viewer Demo](./domain-viewer-demo.gif)

A web-based 3D visualization tool for exploring posemesh domains. This application enables users to visualize the digital overlays of physical spaces, including point cloud data, navigation meshes, occlusion meshes, and portal locations in an intuitive 3D environment.

## What are Domains?

Domains are digital overlays of physical spaces that bridge the gap between the physical and digital worlds. Powered by Auki Labs' posemesh technology, domains transform physical environments into interactive canvases for digital interactions and AI applications. They serve as the foundation for:

- **Spatial Computing**: Create and manage virtual real estate that maps directly to physical spaces
- **Digital Navigation**: Enable precise indoor positioning and wayfinding
- **AR Experiences**: Support augmented reality applications with accurate spatial awareness
- **Operational Efficiency**: Map and track assets, products, and resources in physical spaces
- **Collaborative Environments**: Enable asynchronous communication and interaction in spatial contexts

Whether you're developing retail solutions, creating immersive experiences, or building innovative spatial applications, domains provide the underlying infrastructure for seamless physical-digital bridges.

## Features

- Interactive 3D visualization using Three.js and React Three Fiber
- Point cloud data rendering with color support
- Navigation and occlusion mesh visualization
- Portal location markers
- Visibility toggles for different data layers
- Auto-rotating camera when idle
- Responsive grid system with infinite ground plane
- Domain information display with copy-to-clipboard functionality

## Technology Stack

- Next.js 14
- React 18
- Three.js
- React Three Fiber
- TypeScript
- Tailwind CSS
- Radix UI Components
- Lucide Icons

## Project Structure
```
├── app/ # Next.js app directory
│ ├── [id]/ # Dynamic domain viewer route
│ │ └── page.tsx # Individual domain viewer page
│ ├── actions.ts # Server actions for API calls to fetch domain data
│ ├── globals.css # Global CSS styles
│ ├── layout.tsx # Root layout component
│ └── page.tsx # Home page
├── components/ # React components
│ ├── ui/ # Common reusable UI components
│ │ ├── button.tsx
│ │ ├── collapsable.tsx # Modal dialog component
│ │ └── input.tsx # Form input component
│ ├── CustomGrid.tsx # Custom grid component for the ground plane
│ ├── DomainInfo.tsx # Domain metadata display panel
│ ├── Navbar.tsx # The top navigation bar component with domain id input field
│ ├── ToggleVisibility.tsx # Layer visibility controls
│ └── Viewer3D.tsx # Main 3D visualization component
├── utils/ # Utility functions
│ ├── fetchIpInfo.ts # Utility function to fetch location information from IP using  API from https://ipinfo.io/
│ ├── plotly-utils.ts # Utility functions for parsing a domain point cloud
│ ├── posemeshClientApi.ts # Frontend API client
│ ├── posemeshServerApi.ts # Backend API client
│ └── three-utils.ts # Three.js helper functions
├── public/ # Static assets
│ ├── images/ # Image assets
│ ├── workers/ # Web Workers for processing point cloud files
│ └── QR.glb # A 3D model of a QR code (i.e. a portal)
├── lib/ # Shared libraries and configurations
│ └── utils.ts # Common utility functions
├── .env.template # Environment variables template
└── package.json # Project configuration
```

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm or yarn
- Docker (for containerized deployment)

### Installation

#### Local Development

1. Clone the repository:

```bash
git clone git@github.com:aukilabs/domain-viewer.git
cd domain-viewer
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env.local` file in the root directory with your credentials from https://console.auki.network:
```bash
AUKI_APP_KEY=your_app_key_here
AUKI_APP_SECRET=your_app_secret_here
```

4. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

#### Docker Deployment

1. Clone the repository and navigate to the project directory:
```bash
git clone git@github.com:aukilabs/domain-viewer.git
cd domain-viewer
```

2. Create a `.env.local` file with your Auki credentials as shown above.

3. Build and run with Docker Compose:
```bash
docker compose up -d
```

The application will be available at http://localhost:3000.

To stop the application:
```bash
docker compose down
```

### Building for Production

#### Local Build
```bash
npm run build
```

#### Docker Build
```bash
docker compose build
```

## Usage

1. Enter a domain ID in the top navigation bar
2. Click "Load" to fetch and display the domain data
3. Use mouse/touch controls to navigate the 3D view:
   - Left click + drag to rotate
   - Right click + drag to pan
   - Scroll to zoom
4. Toggle visibility of different layers using the buttons in the bottom left panel
5. View domain details in the expandable panel

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- 3D rendering powered by [Three.js](https://threejs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
