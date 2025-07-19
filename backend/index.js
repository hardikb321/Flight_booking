import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import authRoute from "./Routes/auth.js";
import flightRoute from "./Routes/flights.js";
import bookingRoute from "./Routes/booking.js";
import ticketRoute from "./Routes/tickets.js";
import multer from "multer";
import { createCanvas, loadImage } from "canvas";
import jsQR from "jsqr";
import { google } from "googleapis";

dotenv.config();

const app = express();

const corsOptions = {
  origin: true,
};
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Important: Make sure express.json() is before your routes
app.use(express.json());
app.use(cors(corsOptions));

app.get("/", (req, res) => {
  res.send("api is working");
});

const GOOGLE_CLIENT_ID="22378356786-7lc62harj5csrpfhl3s20d1vha70f24q.apps.googleusercontent.com"
const GOOGLE_SECRET_KEY="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"
const refresh_token=process.env.REFRESH_TOKEN

mongoose.set("strictQuery", false);
const connectDB = async () => {
  try {
    console.log('🔍 Debugging MongoDB connection...');
    console.log('MONGO_URL from env:', process.env.MONGO_URL);
    await mongoose.connect(process.env.MONGO_URL);
    console.log(`MongoDB connected`);
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
};

app.post("/api/v1/decode-qr", upload.single("image"), async (req, res) => {
  try {
    const imageData = req.file.buffer;
    const qrData = await decodeQRFromImage(imageData);
    if (qrData) {
      res.json({ status: true, data: qrData });
    } else {
      res.status(404).json({ status: false, message: "No QR code detected" });
    }
  } catch (error) {
    console.error("Error decoding QR code:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.post("/api/v1/create-tokens", async (req, res) => {
  try {
    console.log("Request body:", req.body);
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ 
        status: false, 
        message: "Authorization code is required" 
      });
    }
    
    console.log("Received authorization code:", code);
    
    // Initialize Google OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_SECRET_KEY,
      'http://localhost:5173',
    );
    
    try {
      // Exchange authorization code for tokens
      const { tokens } = await oauth2Client.getToken(code);
      
      console.log("Tokens received from Google:", {
        access_token: tokens.access_token ? "✓ Present" : "✗ Missing",
        refresh_token: tokens.refresh_token ? "✓ Present" : "✗ Missing",
        scope: tokens.scope,
        expires_in: tokens.expiry_date
      });
      
      // Set credentials to the OAuth2 client
      oauth2Client.setCredentials(tokens);
      
      // Get user info using the access token
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
     
      
     

      
      // Return tokens and user info to frontend
      res.json({
        status: true,
        data: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_in: tokens.expiry_date,
          scope: tokens.scope,
          token_type: tokens.token_type || 'Bearer',
          
          message: "Tokens generated successfully"
        }
      });
      
    } catch (tokenError) {
      console.error("Error exchanging code for tokens:", tokenError);
      
      // Handle specific Google API errors
      if (tokenError.code === 400) {
        return res.status(400).json({
          status: false,
          message: "Invalid authorization code or code already used"
        });
      }
      
      return res.status(500).json({
        status: false,
        message: "Failed to exchange authorization code for tokens"
      });
    }
    
  } catch (error) {
    console.error("Error in token generation:", error);
    res.status(500).json({ 
      status: false, 
      message: "Internal server error" 
    });
  }
});

// New endpoint for creating Google Calendar events
app.post("/api/v1/create-calendar-event", async (req, res) => {
  try {
    console.log("Creating calendar event with body:", req.body);
    
    const { 
      summary, 
      description, 
      startDateTime, 
      endDateTime, 
      location
    } = req.body;
    
    // Validate required fields
    if (!summary || !startDateTime || !endDateTime) {
      return res.status(400).json({
        status: false,
        message: "Summary, start time, and end time are required"
      });
    }
    
    // Initialize Google OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      GOOGLE_CLIENT_ID,
      GOOGLE_SECRET_KEY,
      'http://localhost:5173'
    );
    
    // Set credentials - use the default refresh token
    oauth2Client.setCredentials({
      refresh_token: refresh_token
    });
    
    // Initialize Google Calendar API
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    // Prepare event data
    const event = {
      summary: summary,
      description: description || '',
      location: location || '',
      start: {
        dateTime: startDateTime,
        timeZone: 'America/Los_Angeles', // You can make this configurable
      },
      end: {
        dateTime: endDateTime,
        timeZone: 'America/Los_Angeles',
      },
      colorId: '4', // Peacock blue color
    };
    
    try {
      // Create the event
      const response = await calendar.events.insert({
        calendarId: 'primary',
        resource: event,
      });
      
      console.log("Calendar event created successfully:", response.data.id);
      
      res.json({
        status: true,
        data: {
          eventId: response.data.id,
          eventLink: response.data.htmlLink,
          summary: response.data.summary,
          start: response.data.start,
          end: response.data.end,
          message: "Calendar event created successfully"
        }
      });
      
    } catch (calendarError) {
      console.error("Error creating calendar event:", calendarError);
      
      // Handle specific Google Calendar API errors
      if (calendarError.code === 401) {
        return res.status(401).json({
          status: false,
          message: "Unauthorized - Invalid or expired access token"
        });
      }
      
      if (calendarError.code === 403) {
        return res.status(403).json({
          status: false,
          message: "Forbidden - Insufficient permissions for Calendar API"
        });
      }
      
      return res.status(500).json({
        status: false,
        message: "Failed to create calendar event",
        error: calendarError.message
      });
    }
    
  } catch (error) {
    console.error("Error in calendar event creation:", error);
    res.status(500).json({
      status: false,
      message: "Internal server error"
    });
  }
});



async function decodeQRFromImage(imageData) {
  try {
    const image = await loadImage(imageData);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const imageDataCanvas = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(
      imageDataCanvas.data,
      imageDataCanvas.width,
      imageDataCanvas.height
    );
    if (code) {
      return code.data;
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error decoding QR code from image:", error);
    throw error;
  }
}

app.use("/api/v1/auth", authRoute);
app.use("/api/v1/flights", flightRoute);
app.use("/api/v1/bookings", bookingRoute);
app.use("/api/v1/tickets", ticketRoute);

app.listen(5001, () => {
  connectDB();
  console.log("Server is running on port 5001");
});