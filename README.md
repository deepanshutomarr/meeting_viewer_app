# Katalyst Founding Engineer Task – Meeting Viewer App

## Tech Stack Used
- Frontend: React, Tailwind CSS, JavaScript
- Backend: Node.js, Express
- Calendar Integration: Composio MCP (Model Context Protocol)
- AI: OpenAI GPT-4o-mini, Mock fallbacks
- Database: Supabase (PostgreSQL)
- Real-time: WebSocket (Socket.io)
- Other tools: Axios, Lucide React, Vite

---

## Features Implemented
- [x] Login (Mock with enhanced user info - User ID, Name, Email)
- [x] Fetch past/upcoming meetings from Google Calendar via Composio MCP
- [x] Display meeting details (title, time, duration, attendees, description, location)
- [x] AI summary for past meetings (OpenAI + realistic mock fallbacks)
- [x] Real-time calendar sync via WebSocket
- [x] Professional error handling with graceful fallbacks
- [x] Responsive UI with modern design
- [x] Smart caching (5-minute meetings, permanent summaries)
- [x] Live sync notifications
- [x] Analytics and event tracking
- [x] Production-ready deployment structure

---

## Assumptions & Design Decisions
- **Composio MCP over vanilla Calendar API**: Chose Composio for simplified OAuth management, built-in error handling, and webhook support
- **Mock data fallbacks**: Implemented comprehensive fallback system for when APIs are unavailable or quota exceeded
- **Enhanced login system**: Added name and email collection for better user experience
- **Supabase integration**: Used for production-grade data persistence, caching, and analytics
- **WebSocket live sync**: Implemented real-time updates as bonus feature
- **Professional error handling**: Graceful fallbacks ensure app works even with API issues
- **Cost optimization**: Smart caching reduces API calls, mock summaries when OpenAI quota exceeded
- **Mobile-first design**: Responsive Tailwind CSS for all device sizes

---

## How to Run Locally

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Composio API key (free at https://app.composio.dev)
- OpenAI API key 
- Supabase account 

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd calendar-mcp-app
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Configure environment variables**
   
   Create a `.env` file in the `backend` directory:
   ```env
   # Required: Get from https://app.composio.dev
   COMPOSIO_API_KEY=your_composio_api_key_here
   
   # Optional: Get from https://platform.openai.com
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Optional: Get from https://supabase.com
   SUPABASE_URL=your_supabase_url_here
   SUPABASE_ANON_KEY=your_supabase_anon_key_here
   
   # Server Configuration
   PORT=3001
   FRONTEND_URL=http://localhost:5174
   NODE_ENV=development
   ```
   
   **Important:** Without a valid Composio API key, the app will show connection errors. Get your free API key from [app.composio.dev](https://app.composio.dev).

4. **Start the application**
   ```bash
   npm run dev
   ```
   
   This starts both backend (port 3001) and frontend (port 5173).

5. **Open your browser**
   
   Navigate to `http://localhost:5173`

### Usage

1. **Login**: Enter User ID, Full Name, and Email
2. **Connect Calendar**: Click "Connect Google Calendar" to link your Google account
3. **View Meetings**: See your real meetings or high-quality mock data
4. **AI Summaries**: Click on past meetings to generate AI summaries
5. **Live Updates**: Real-time sync when calendar changes

---

## Architecture

```
Frontend (React + Tailwind)
    ↓ REST API
Backend (Express + Composio MCP)
    ↓
Composio MCP Layer
    ↓
Google Calendar API
```

**Bonus Features:**
- WebSocket real-time sync
- Supabase database integration
- OpenAI AI summaries
- Professional error handling
- Smart caching system
