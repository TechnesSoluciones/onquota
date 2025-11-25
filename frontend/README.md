# OnQuota Frontend

Next.js 14 frontend for OnQuota SaaS platform.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts
- **HTTP Client**: Axios

## Prerequisites

- Node.js 18+
- npm or yarn

## Setup

### 1. Install dependencies

```bash
npm install
# or
yarn install
```

### 2. Configure environment

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_APP_NAME=OnQuota
```

### 3. Run development server

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
frontend/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Auth route group
│   ├── (dashboard)/       # Dashboard route group
│   ├── layout.tsx         # Root layout
│   └── page.tsx          # Home page
├── components/            # React components
│   ├── ui/               # UI components (shadcn/ui)
│   ├── forms/            # Form components
│   ├── charts/           # Chart components
│   └── layouts/          # Layout components
├── hooks/                # Custom React hooks
├── lib/                  # Utility libraries
│   ├── api/             # API client
│   └── utils/           # Utility functions
├── store/               # Zustand stores
├── types/               # TypeScript types
├── styles/              # Global styles
│   └── globals.css      # Global CSS with Tailwind
└── public/              # Static assets
```

## Available Scripts

### Development

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run type-check   # Run TypeScript compiler check
npm run format       # Format code with Prettier
```

### Testing

```bash
npm run test              # Run tests
npm run test:watch        # Run tests in watch mode
npm run test:coverage     # Run tests with coverage
```

## Code Style

This project uses:
- **ESLint** for linting
- **Prettier** for code formatting
- **TypeScript** for type safety

Format before committing:
```bash
npm run format
```

## Adding UI Components

We use shadcn/ui for UI components. To add a new component:

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add form
```

## Environment Variables

- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_APP_NAME`: Application name

## Building for Production

```bash
npm run build
npm run start
```

## License

Proprietary - OnQuota 2025
