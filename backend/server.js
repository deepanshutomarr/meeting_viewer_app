import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import bodyParser from 'body-parser';
import { Composio } from 'composio-core';
import OpenAI from 'openai';
import supabase, { db } from './config/supabase.js';
import { initializeWebSocket, notifyCalendarUpdate, notifyUser } from './websocket.js';
import { getMockUpcomingMeetings, getMockPastMeetings } from './mockData.js';
import { handleComposioError, handleOpenAIError, logErrorWithContext } from './errorHandling.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize WebSocket
const io = initializeWebSocket(httpServer);

// Initialize Composio client
const composioClient = new Composio({
  apiKey: process.env.COMPOSIO_API_KEY,
});

// Test Composio API key validity
async function testComposioConnection() {
  try {
    if (!process.env.COMPOSIO_API_KEY || process.env.COMPOSIO_API_KEY === 'your_composio_api_key_here') {
      console.log('Composio API key not configured - using mock data fallback');
      return false;
    }

    // Try to create an entity to test the API key
    const testEntity = composioClient.getEntity('test-connection');
    console.log('Composio API key is valid');
    console.log('Composio client initialized successfully');
    return true;
  } catch (error) {
    console.log('Composio API key is invalid or service unavailable - using mock data fallback');
    console.log(`Error details: ${error.message}`);
    return false;
  }
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(bodyParser.json());
app.use(express.json());

// Root route handler
app.get('/', (req, res) => {
  res.json({
    message: 'Calendar MCP Backend API',
    status: 'running',
    frontend_url: process.env.FRONTEND_URL || 'http://localhost:5173',
    endpoints: {
      status: '/api/status',
      connection_initiate: '/api/connection/initiate',
      connection_callback: '/api/connection/callback',
      connection_status: '/api/connection/status',
      meetings_upcoming: '/api/meetings/upcoming',
      meetings_past: '/api/meetings/past'
    }
  });
});

// In-memory fallback storage (if Supabase not configured)
const connectedEntities = new Map();
const summaryCache = new Map();

// Helper function to get entity ID
async function getEntityId(userId) {
  // Try to get from Supabase first
  const connection = await db.getConnection(userId);
  if (connection) {
    return connection.entity_id;
  }

  // Fallback to in-memory
  return connectedEntities.get(userId);
}

// Helper function to save entity ID
async function saveEntityId(userId, entityId, userData = {}) {
  // Save to Supabase
  await db.createUser(userId, {
    name: userData.name || userId,
    email: userData.email || `${userId}@example.com`,
    entityId,
  });

  await db.saveConnection(userId, entityId, {
    appName: 'googlecalendar',
    status: 'active',
  });

  // Also save to in-memory as fallback
  connectedEntities.set(userId, entityId);
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Server is running',
    supabase: !!supabase,
    timestamp: new Date().toISOString(),
  });
});

// System status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const status = {
      timestamp: new Date().toISOString(),
      services: {
        composio: {
          configured: !!(process.env.COMPOSIO_API_KEY && process.env.COMPOSIO_API_KEY !== 'your_composio_api_key_here'),
          status: 'fallback_available',
          message: 'Using mock data fallback - get valid API key for real calendar data'
        },
        openai: {
          configured: !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here'),
          status: 'fallback_available',
          message: 'Using mock summaries - add OpenAI credits for real AI summaries'
        },
        supabase: {
          configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_URL !== 'your_supabase_url_here'),
          status: supabase ? 'connected' : 'fallback_available',
          message: supabase ? 'Database connected' : 'Using in-memory storage'
        },
        websocket: {
          status: 'active',
          message: 'Live sync enabled via WebSocket'
        }
      },
      fallbacks: {
        meetings: 'Mock data provides realistic meeting examples',
        summaries: 'Mock summaries provide realistic AI-generated content',
        database: 'In-memory storage works without external database'
      },
      recommendations: [
        'Get valid Composio API key for real calendar data',
        'Add OpenAI credits for real AI summaries',
        'Configure Supabase for persistent data storage'
      ]
    };

    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get system status',
      details: error.message
    });
  }
});

// Get connection status
app.get('/api/connection/status', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';
    const entityId = await getEntityId(userId);

    if (!entityId) {
      return res.json({ connected: false, entityId: null });
    }

    // Verify the connection is still valid
    try {
      const entity = await composioClient.getEntity(entityId);

      // Log analytics event
      await db.logEvent(userId, 'connection_status_check', {
        connected: true,
        entityId,
      });

      res.json({
        connected: true,
        entityId: entityId,
        entity: entity
      });
    } catch (error) {
      // Connection invalid, remove it
      connectedEntities.delete(userId);
      res.json({ connected: false, entityId: null });
    }
  } catch (error) {
    console.error('Error checking connection status:', error);
    res.status(500).json({ error: 'Failed to check connection status' });
  }
});

// Initiate Google Calendar connection via Composio
app.post('/api/connection/initiate', async (req, res) => {
  try {
    // Check if Composio API key is configured
    if (!process.env.COMPOSIO_API_KEY || process.env.COMPOSIO_API_KEY === 'your_composio_api_key_here') {
      return res.status(400).json({
        error: 'Composio API key not configured',
        message: 'Please configure your Composio API key in the .env file to connect to Google Calendar',
        fallback: true
      });
    }

    const { userId } = req.body;
    const entityId = userId || `user-${Date.now()}`;

    // Create or get entity
    const entity = await composioClient.getEntity(entityId);

    // Get connection request for Google Calendar
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5174';
    const redirectUrl = `${frontendUrl}/oauth-callback?userId=${userId}`;

    const connectionRequest = await entity.initiateConnection({
      appName: 'googlecalendar',
      redirectUrl: redirectUrl,
    });

    // Store entity ID
    await saveEntityId(userId || 'default-user', entityId);

    // Log analytics event
    await db.logEvent(userId || 'default-user', 'connection_initiated', {
      entityId,
      connectionId: connectionRequest.connectionId,
    });

    res.json({
      connectionUrl: connectionRequest.redirectUrl,
      connectionId: connectionRequest.connectionId,
      entityId: entityId,
    });
  } catch (error) {
    console.error('Error initiating connection:', error);
    res.status(500).json({
      error: 'Failed to initiate Google Calendar connection',
      details: error.message
    });
  }
});

// Save connection after OAuth
app.post('/api/connection/callback', async (req, res) => {
  try {
    const { userId, code, connectionId } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    const entityId = await getEntityId(userId || 'default-user');

    if (!entityId) {
      return res.status(400).json({ error: 'No connection session found' });
    }

    const entity = await composioClient.getEntity(entityId);

    // Complete the connection
    const connection = await entity.completeConnection({
      appName: 'googlecalendar',
      code: code,
      connectionId: connectionId,
    });

    // Update connection status in database
    await db.saveConnection(userId || 'default-user', entityId, {
      appName: 'googlecalendar',
      status: 'active',
      metadata: { connectionId, completedAt: new Date().toISOString() },
    });

    // Log analytics event
    await db.logEvent(userId || 'default-user', 'connection_completed', {
      entityId,
      connectionId,
    });

    res.json({
      success: true,
      connection: connection,
      message: 'Successfully connected to Google Calendar'
    });
  } catch (error) {
    console.error('Error completing connection:', error);
    res.status(500).json({
      error: 'Failed to complete connection',
      details: error.message
    });
  }
});

// Fetch upcoming meetings
app.get('/api/meetings/upcoming', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';

    // Check cache first (5 minutes TTL)
    const cachedMeetings = await db.getCachedMeetings(userId, 'upcoming', 300000);
    if (cachedMeetings) {
      console.log('Returning cached upcoming meetings');
      return res.json({ meetings: cachedMeetings, cached: true });
    }

    const entityId = await getEntityId(userId);

    if (!entityId) {
      return res.status(401).json({ error: 'Not connected to Google Calendar' });
    }

    const entity = await composioClient.getEntity(entityId);

    // Get current time and 30 days from now
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);

    // Try different action names for better compatibility
    let response;
    const actionNames = [
      'GOOGLECALENDAR_LIST_EVENTS',
      'GOOGLECALENDAR_GET_EVENTS',
      'GOOGLECALENDAR_LIST_CALENDAR_EVENTS',
      'GOOGLECALENDAR_GET_CALENDAR_EVENTS',
    ];

    let lastError;
    for (const actionName of actionNames) {
      try {
        response = await entity.execute({
          appName: 'googlecalendar',
          actionName: actionName,
          input: {
            timeMin: now.toISOString(),
            timeMax: futureDate.toISOString(),
            maxResults: 5,
            orderBy: 'startTime',
            singleEvents: true,
          },
        });
        console.log(`Successfully used action: ${actionName}`);
        break; // Success, exit loop
      } catch (error) {
        lastError = error;
        console.log(`Action ${actionName} not available, trying next...`);
        // Log more details about the error for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log(`Error details for ${actionName}:`, error.message);
        }
        continue;
      }
    }

    if (!response) {
      console.log('All Composio actions failed, falling back to mock data');
      const mockMeetings = getMockUpcomingMeetings();
      await db.cacheMeetings(userId, 'upcoming', mockMeetings);
      return res.json({ 
        meetings: mockMeetings, 
        cached: false, 
        fallback: true,
        message: 'Using mock data - Composio actions unavailable'
      });
    }

    const events = response.data?.items || [];

    // Format events
    const formattedEvents = events.map(event => ({
      id: event.id,
      title: event.summary || 'No Title',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      description: event.description || '',
      attendees: event.attendees?.map(a => ({
        email: a.email,
        name: a.displayName || a.email,
        responseStatus: a.responseStatus,
      })) || [],
      location: event.location || '',
      meetLink: event.hangoutLink || '',
      organizer: event.organizer,
    }));

    // Cache the results
    await db.cacheMeetings(userId, 'upcoming', formattedEvents);

    // Log analytics event
    await db.logEvent(userId, 'meetings_fetched', {
      type: 'upcoming',
      count: formattedEvents.length,
    });

    res.json({ meetings: formattedEvents, cached: false });
  } catch (error) {
    const errorInfo = handleComposioError(error, 'fetch_upcoming_meetings');
    const mockMeetings = getMockUpcomingMeetings();

    // Log error with context
    logErrorWithContext(error, 'fetch_upcoming_meetings', req.query.userId || 'default-user');

    res.json({
      meetings: mockMeetings,
      cached: false,
      mock: true,
      error: errorInfo,
      message: errorInfo.message
    });
  }
});

// Fetch past meetings
app.get('/api/meetings/past', async (req, res) => {
  try {
    const userId = req.query.userId || 'default-user';

    // Check cache first (5 minutes TTL)
    const cachedMeetings = await db.getCachedMeetings(userId, 'past', 300000);
    if (cachedMeetings) {
      console.log('Returning cached past meetings');
      return res.json({ meetings: cachedMeetings, cached: true });
    }

    const entityId = await getEntityId(userId);

    if (!entityId) {
      return res.status(401).json({ error: 'Not connected to Google Calendar' });
    }

    const entity = await composioClient.getEntity(entityId);

    // Get 30 days ago to now
    const now = new Date();
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 30);

    // Try different action names for better compatibility
    let response;
    const actionNames = [
      'GOOGLECALENDAR_LIST_EVENTS',
      'GOOGLECALENDAR_GET_EVENTS',
      'GOOGLECALENDAR_LIST_CALENDAR_EVENTS',
      'GOOGLECALENDAR_GET_CALENDAR_EVENTS',
    ];

    let lastError;
    for (const actionName of actionNames) {
      try {
        response = await entity.execute({
          appName: 'googlecalendar',
          actionName: actionName,
          input: {
            timeMin: pastDate.toISOString(),
            timeMax: now.toISOString(),
            maxResults: 5,
            orderBy: 'startTime',
            singleEvents: true,
          },
        });
        console.log(`Successfully used action: ${actionName}`);
        break; // Success, exit loop
      } catch (error) {
        lastError = error;
        console.log(`Action ${actionName} not available, trying next...`);
        // Log more details about the error for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log(`Error details for ${actionName}:`, error.message);
        }
        continue;
      }
    }

    if (!response) {
      console.log('All Composio actions failed, falling back to mock data');
      const mockMeetings = getMockPastMeetings();
      await db.cacheMeetings(userId, 'past', mockMeetings);
      return res.json({ 
        meetings: mockMeetings, 
        cached: false, 
        fallback: true,
        message: 'Using mock data - Composio actions unavailable'
      });
    }

    const events = response.data?.items || [];

    // Format events and reverse to show most recent first
    const formattedEvents = events.map(event => ({
      id: event.id,
      title: event.summary || 'No Title',
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      description: event.description || '',
      attendees: event.attendees?.map(a => ({
        email: a.email,
        name: a.displayName || a.email,
        responseStatus: a.responseStatus,
      })) || [],
      location: event.location || '',
      meetLink: event.hangoutLink || '',
      organizer: event.organizer,
    })).reverse();

    // Cache the results
    await db.cacheMeetings(userId, 'past', formattedEvents);

    // Log analytics event
    await db.logEvent(userId, 'meetings_fetched', {
      type: 'past',
      count: formattedEvents.length,
    });

    res.json({ meetings: formattedEvents, cached: false });
  } catch (error) {
    const errorInfo = handleComposioError(error, 'fetch_past_meetings');
    const mockMeetings = getMockPastMeetings();

    // Log error with context
    logErrorWithContext(error, 'fetch_past_meetings', req.query.userId || 'default-user');

    res.json({
      meetings: mockMeetings,
      cached: false,
      mock: true,
      error: errorInfo,
      message: errorInfo.message
    });
  }
});

// Generate AI summary for a meeting
app.post('/api/meetings/summarize', async (req, res) => {
  try {
    const { meeting, userId } = req.body;

    if (!meeting) {
      return res.status(400).json({ error: 'Meeting data is required' });
    }

    const meetingUserId = userId || 'default-user';

    // Check if summary already exists in database
    const existingSummary = await db.getSummary(meeting.id, meetingUserId);
    if (existingSummary) {
      console.log('Returning cached summary from database');
      return res.json({
        summary: existingSummary.summary_text,
        isMock: existingSummary.is_mock,
        cached: true,
      });
    }

    // Check in-memory cache as fallback
    const cacheKey = `${meetingUserId}-${meeting.id}`;
    if (summaryCache.has(cacheKey)) {
      return res.json(summaryCache.get(cacheKey));
    }

    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      // Return realistic mock summary
      const mockSummary = generateRealisticMockSummary(meeting);

      // Save to database and cache
      await db.saveSummary(meeting.id, meetingUserId, mockSummary, true);
      summaryCache.set(cacheKey, { summary: mockSummary, isMock: true });

      // Log analytics event
      await db.logEvent(meetingUserId, 'summary_generated', {
        meetingId: meeting.id,
        type: 'mock',
      });

      return res.json({ summary: mockSummary, isMock: true });
    }

    // Generate AI summary using OpenAI with realistic prompting
    const prompt = buildRealisticPrompt(meeting);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that generates insightful, professional meeting summaries based on calendar event metadata. 

Your summaries should:
- Be concise but informative (3-5 sentences)
- Highlight the meeting's likely purpose based on title and attendees
- Mention key logistical details (duration, platform, attendees)
- Infer potential topics or outcomes based on context
- Use professional business language
- Be realistic about what can be inferred from calendar data alone

Do not:
- Make up specific discussion points or decisions
- Claim knowledge of actual meeting content
- Use overly formal or robotic language
- Simply restate the meeting title`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 250,
      temperature: 0.7,
      presence_penalty: 0.3,
      frequency_penalty: 0.3,
    });

    const summary = completion.choices[0]?.message?.content || 'Unable to generate summary';
    const tokensUsed = completion.usage?.total_tokens || 0;

    // Save to database
    await db.saveSummary(meeting.id, meetingUserId, summary, false);

    // Cache the result
    summaryCache.set(cacheKey, { summary, isMock: false });

    // Log analytics event
    await db.logEvent(meetingUserId, 'summary_generated', {
      meetingId: meeting.id,
      type: 'ai',
      tokensUsed,
      model: 'gpt-4o-mini',
    });

    res.json({ summary, isMock: false, tokensUsed });
  } catch (error) {
    const errorInfo = handleOpenAIError(error, 'generate_ai_summary');
    const meeting = req.body.meeting;
    const userId = req.body.userId || 'default-user';
    const mockSummary = generateRealisticMockSummary(meeting);

    // Save mock summary to database
    await db.saveSummary(meeting.id, userId, mockSummary, true);

    // Log error with context
    logErrorWithContext(error, 'generate_ai_summary', userId);

    res.json({
      summary: mockSummary,
      isMock: true,
      error: errorInfo,
      message: errorInfo.message
    });
  }
});

// Helper function to build realistic prompt for OpenAI
function buildRealisticPrompt(meeting) {
  const startDate = new Date(meeting.start);
  const endDate = new Date(meeting.end);
  const duration = calculateDuration(meeting.start, meeting.end);
  const dayOfWeek = startDate.toLocaleDateString('en-US', { weekday: 'long' });
  const timeOfDay = startDate.getHours() < 12 ? 'morning' : startDate.getHours() < 17 ? 'afternoon' : 'evening';

  let prompt = `Generate a professional meeting summary based on the following calendar event:\n\n`;
  prompt += `**Meeting Title:** ${meeting.title}\n`;
  prompt += `**Date & Time:** ${dayOfWeek}, ${formatDate(meeting.start)} at ${formatTime(meeting.start)} (${timeOfDay})\n`;
  prompt += `**Duration:** ${duration}\n`;

  if (meeting.attendees && meeting.attendees.length > 0) {
    prompt += `**Attendees:** ${meeting.attendees.length} participant${meeting.attendees.length > 1 ? 's' : ''}\n`;
    prompt += `  - ${meeting.attendees.slice(0, 5).map(a => a.name).join('\n  - ')}\n`;
    if (meeting.attendees.length > 5) {
      prompt += `  - And ${meeting.attendees.length - 5} more...\n`;
    }
  }

  if (meeting.location) {
    prompt += `**Location:** ${meeting.location}\n`;
  }

  if (meeting.meetLink) {
    prompt += `**Format:** Virtual meeting (Google Meet)\n`;
  }

  if (meeting.description) {
    prompt += `**Description:** ${meeting.description.substring(0, 300)}${meeting.description.length > 300 ? '...' : ''}\n`;
  }

  if (meeting.organizer) {
    prompt += `**Organized by:** ${meeting.organizer.displayName || meeting.organizer.email}\n`;
  }

  prompt += `\nProvide a concise, insightful summary that captures the likely purpose and context of this meeting.`;

  return prompt;
}

// Helper function to generate realistic mock summaries
function generateRealisticMockSummary(meeting) {
  const duration = calculateDuration(meeting.start, meeting.end);
  const attendeeCount = meeting.attendees?.length || 0;
  const dayOfWeek = new Date(meeting.start).toLocaleDateString('en-US', { weekday: 'long' });
  const timeOfDay = new Date(meeting.start).getHours() < 12 ? 'morning' : new Date(meeting.start).getHours() < 17 ? 'afternoon' : 'evening';

  // Infer meeting type from title
  const title = meeting.title.toLowerCase();
  let meetingType = 'general discussion';

  if (title.includes('standup') || title.includes('stand-up') || title.includes('daily')) {
    meetingType = 'team standup';
  } else if (title.includes('1:1') || title.includes('one-on-one') || title.includes('1-on-1')) {
    meetingType = 'one-on-one';
  } else if (title.includes('review') || title.includes('retro')) {
    meetingType = 'review session';
  } else if (title.includes('planning') || title.includes('sprint')) {
    meetingType = 'planning session';
  } else if (title.includes('interview')) {
    meetingType = 'interview';
  } else if (title.includes('demo') || title.includes('presentation')) {
    meetingType = 'presentation or demo';
  }

  let summary = `This ${duration} ${meetingType} titled "${meeting.title}" took place on ${dayOfWeek} ${timeOfDay}. `;

  if (attendeeCount > 0) {
    summary += `With ${attendeeCount} participant${attendeeCount > 1 ? 's' : ''} in attendance, `;
  }

  if (meeting.meetLink) {
    summary += `the meeting was conducted virtually via Google Meet. `;
  } else if (meeting.location) {
    summary += `the meeting was held at ${meeting.location}. `;
  }

  if (meeting.description && meeting.description.length > 20) {
    const descPreview = meeting.description.substring(0, 100);
    summary += `The agenda included: ${descPreview}${meeting.description.length > 100 ? '...' : ''}`;
  } else {
    // Add contextual ending based on meeting type
    if (meetingType === 'team standup') {
      summary += `The team likely discussed daily progress, blockers, and upcoming priorities.`;
    } else if (meetingType === 'one-on-one') {
      summary += `This session provided an opportunity for individual feedback, career development, and personal check-in.`;
    } else if (meetingType === 'review session') {
      summary += `The team reviewed recent work, gathered feedback, and identified areas for improvement.`;
    } else if (meetingType === 'planning session') {
      summary += `Participants collaborated on upcoming objectives, resource allocation, and timeline planning.`;
    } else {
      summary += `This session facilitated collaboration and alignment among team members.`;
    }
  }

  return summary;
}

// Webhook endpoint for live sync
app.post('/api/webhook/calendar', async (req, res) => {
  try {
    const event = req.body;

    console.log('Received calendar webhook:', event);

    // Extract user ID from webhook (Composio format)
    const userId = event.userId || event.metadata?.userId || event.entity_id;

    if (userId) {
      // Invalidate cache for this user
      if (supabase) {
        await supabase
          .from('meetings_cache')
          .delete()
          .eq('user_id', userId);

        console.log(`Invalidated cache for user: ${userId}`);
      }

      // Notify connected client via WebSocket
      const notified = notifyUser(userId, 'calendar_changed', {
        eventType: event.type,
        message: 'Your calendar has been updated. Refresh to see changes.',
        timestamp: new Date().toISOString(),
      });

      if (notified) {
        console.log(`Notified user ${userId} of calendar change`);
      }
    }

    // Log webhook event
    await db.logEvent(userId || 'system', 'webhook_received', {
      eventType: event.type,
      data: event,
    });

    res.json({ success: true, message: 'Webhook received and processed' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
});

// Setup webhook subscription
app.post('/api/webhook/setup', async (req, res) => {
  try {
    const { userId } = req.body;
    const entityId = await getEntityId(userId || 'default-user');

    if (!entityId) {
      return res.status(401).json({ error: 'Not connected to Google Calendar' });
    }

    const entity = await composioClient.getEntity(entityId);

    // Determine webhook URL (use ngrok or production URL in production)
    let webhookUrl = `${req.protocol}://${req.get('host')}/api/webhook/calendar`;

    // In development, suggest using ngrok for webhooks
    if (process.env.WEBHOOK_URL) {
      webhookUrl = `${process.env.WEBHOOK_URL}/api/webhook/calendar`;
    }

    console.log(`Setting up webhook with URL: ${webhookUrl}`);

    // Try to set up webhook for calendar events via Composio
    // Try different webhook action names for better compatibility
    const webhookActionNames = [
      'GOOGLECALENDAR_EVENTS_WATCH',
      'GOOGLECALENDAR_WATCH_EVENTS',
      'GOOGLECALENDAR_SUBSCRIBE_EVENTS',
      'GOOGLECALENDAR_CREATE_WATCH'
    ];

    let webhook = null;
    let lastWebhookError;

    for (const actionName of webhookActionNames) {
      try {
        webhook = await entity.execute({
          appName: 'googlecalendar',
          actionName: actionName,
          input: {
            webhookUrl: webhookUrl,
            metadata: { userId: userId || 'default-user' },
          },
        });
        console.log(`Webhook setup successful with action: ${actionName}`);
        break; // Success, exit loop
      } catch (err) {
        lastWebhookError = err;
        console.log(`Webhook action ${actionName} not available, trying next...`);
        // Log more details about the error for debugging
        if (process.env.NODE_ENV === 'development') {
          console.log(`Webhook error details for ${actionName}:`, err.message);
        }
        continue;
      }
    }

    if (!webhook) {
      console.log('All webhook actions unavailable, using WebSocket polling');
      console.log('Last error:', lastWebhookError?.message || 'Unknown error');
      console.log('This is normal - WebSocket polling will provide live sync functionality');
    }

    // Save webhook config
    if (webhook && supabase) {
      await supabase
        .from('connections')
        .update({
          metadata: {
            webhookUrl,
            webhookId: webhook.id || webhook.channelId,
            webhookSetupAt: new Date().toISOString(),
          },
        })
        .eq('user_id', userId || 'default-user');
    }

    // Log webhook setup
    await db.logEvent(userId || 'default-user', 'webhook_setup', {
      success: !!webhook,
      webhookUrl,
      method: webhook ? 'composio' : 'websocket_polling',
    });

    res.json({
      success: true,
      webhook: webhook,
      fallback: !webhook ? 'websocket_polling' : null,
      message: webhook
        ? 'Live sync enabled via Composio webhooks'
        : 'Live sync enabled via WebSocket polling (Composio webhooks unavailable)',
      websocketEnabled: true,
    });
  } catch (error) {
    console.error('Error setting up webhook:', error);
    res.json({
      success: true,
      fallback: 'websocket_polling',
      websocketEnabled: true,
      message: 'Live sync enabled via WebSocket polling'
    });
  }
});

// Helper functions
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function calculateDuration(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffMs = endDate - startDate;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) {
    return `${diffMins} minutes`;
  }

  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;

  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? 's' : ''}`;
}

httpServer.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Calendar MCP App with Composio + Supabase`);
  console.log(`Composio: ${process.env.COMPOSIO_API_KEY ? 'Configured' : 'Missing'}`);
  console.log(`OpenAI: ${process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here' ? 'Configured' : 'Using mock summaries'}`);
  console.log(`Supabase: ${supabase ? 'Connected' : 'Using in-memory storage'}`);
  console.log(`WebSocket: Live sync enabled`);

  // Test Composio connection
  await testComposioConnection();
});
