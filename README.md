# Web3 Password Manager

A decentralized password management system built with Sui blockchain, Walrus storage, and Seal encryption.

## Features

- 🔐 Secure password storage with Seal encryption
- 🌐 Decentralized storage using Walrus
- ⛓️ Sui blockchain integration
- 💎 Modern glassmorphism UI design
- 🔗 Sui wallet connectivity

## Prerequisites

Before running this project, make sure you have:

- **Node.js** (version 16 or higher)
- **npm** or **yarn** package manager
- **Sui Wallet** browser extension installed

## Getting Started

### 1. Install Dependencies

After downloading/cloning the source code, navigate to the project directory and install dependencies:

```bash
npm install
```

### 2. Start Development Server

Run the development server using Vite:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### 3. Connect Your Wallet

1. Make sure you have the Sui Wallet browser extension installed
2. Open the application in your browser
3. Click "Connect Wallet" to connect your Sui wallet
4. Follow the wallet prompts to authorize the connection

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the project for production
- `npm run preview` - Preview the production build locally

## Project Structure

```
src/
├── components/          # React components
│   ├── WalletConnection.tsx
│   ├── PasswordForm.tsx
│   └── PasswordList.tsx
├── services/           # Service layer
│   ├── suiService.ts
│   ├── sealService.ts
│   └── walrusService.ts
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── App.tsx            # Main application component
```

## Smart Contract

The application interacts with a Sui smart contract deployed at:
`0xbb115ee5a46c608b434083dd0970f8fcbeaa3f81b857603e32aebaa8f768d6c6`

## Development Notes

- The project uses **Vite** as the build tool for fast development
- **TypeScript** is configured with relaxed settings for easier development
- Mock implementations are provided for Seal and Walrus services
- The UI uses a glassmorphism design with backdrop blur effects

## Troubleshooting

### Common Issues

1. **Port already in use**: If port 5173 is busy, Vite will automatically use the next available port
2. **Wallet connection issues**: Ensure the Sui Wallet extension is installed and unlocked
3. **Build errors**: Run `npm install` to ensure all dependencies are properly installed

### Development Tips

- The development server supports hot module replacement (HMR)
- Changes to TypeScript files will automatically trigger recompilation
- The browser will automatically refresh when files are saved

## Next Steps

1. Install and set up the Sui Wallet browser extension
2. Get some test SUI tokens for development
3. Test wallet connection and basic functionality
4. Integrate real Seal and Walrus SDKs when available

---

Built with ❤️ using React, TypeScript, and the Sui ecosystem
