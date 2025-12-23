# Client - Frontend UI

Web-based frontend for the Survival Narrative Game.

## Features

- Complete game UI with atmospheric theme
- Mock game flow (fully functional without backend)
- State management with React Context
- Responsive design
- Keyboard shortcuts
- Side drawer panels for inventory and log

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

The app will be available at `http://localhost:3000`

## Project Structure

```
src/
├── types/          # TypeScript type definitions
├── mocks/          # Mock data for development
├── services/       # API layer (currently mocked)
├── store/          # State management (React Context)
├── components/     # Reusable UI components
├── pages/          # Page-level components
└── App.tsx         # Root component
```

## Key Components

- **TopBar** - Navigation and status
- **Scene** - Background and location display
- **StatusPanel** - Player stats display
- **NarrativeBox** - Story text with optional typewriter
- **ChoiceList** - Interactive choice buttons
- **FooterActions** - Inventory, log, evacuation
- **Drawers** - Side panels for inventory and event log

## Mock Mode

Currently runs in mock mode using `src/services/gameApi.ts` and `src/mocks/gameData.ts`.

To connect to real backend:
1. Update `gameApi.ts` to make real HTTP calls
2. Ensure backend is running on `http://localhost:3001`
3. Update API base URL in service files

## Keyboard Shortcuts

- `1-4` - Select choice (when choices are displayed)
- `ESC` - Close drawer panels

## Development

The UI is fully functional in mock mode, allowing frontend development without backend.

### Adding New Components

1. Create component folder in `src/components/`
2. Create `.tsx` and `.css` files
3. Export from folder
4. Use in `GamePage.tsx` or other components

### Adding Mock Content

Edit `src/mocks/gameData.ts` to add:
- New narratives
- New choice sets
- Event log entries
- Inventory items

## Styling

Uses vanilla CSS with:
- CSS custom properties (variables)
- Modular component styles
- Responsive breakpoints at 768px
- Dark theme throughout

## Next Steps

1. Connect to real backend API
2. Integrate LLM service for dynamic text
3. Add background images per location
4. Implement sound/music
5. Add settings panel
6. Enhance mobile experience
