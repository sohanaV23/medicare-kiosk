# MediVoice Medical Kiosk

MediVoice is an interactive, multi-lingual patient registration and intake kiosk. It supports English and Telugu, and features a secure local database stream, webcam-based patient photo and ID capturing, voice-guided forms, and monthly registry organization.

## Features

- **Multi-lingual Support**: Complete user flows in English and Telugu.
- **Voice-Guided Input**: Intelligent speech recognition and text-to-speech feedback for a touch-free experience.
- **Biometric Captures**: In-browser camera utility to capture patient photos and document images (e.g., Aadhaar cards).
- **Gemini Integration**: Server-side AI orchestration for extracting patient details from spoken words and text input.
- **Local Database backup**: Automated backup stream to keep registration logs synchronized.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- A Gemini API Key

### Installation

1. Install project dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables. Create a `.env` file in the root directory (referencing `.env.example`):
   ```env
   PORT=3000
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

## Development and Scripts

- `npm run dev`: Starts the Vite development server for the frontend and concurrently runs the backend server.
- `npm run build`: Builds the static assets for production.

