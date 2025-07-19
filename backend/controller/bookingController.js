// Import required modules and schemas
import Booking from "../models/bookingSchema.js";
import User from "../models/userSchema.js";
import Flight from "../models/flightSchema.js";
import Stripe from "stripe";
import Airline from "../models/airlineSchema.js";
import Ticket from "../models/ticketSchema.js";

export const getCheckoutSession = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    const flight = await Flight.findById(req.params.flightId).populate(
      "airline"
    );

    if (!flight) {
      return res
        .status(404)
        .json({ success: false, message: "Flight not found" });
    }

    if (!flight.bookedSeats) {
      flight.bookedSeats = [];
    }

    const { bookingUsersData, selectedSeats, createCalendarEvent } = req.body;
    const bookingUID = generateUID();

    let ticket = await Ticket.findOne({ uid: bookingUID });

    if (!ticket) {
      ticket = new Ticket({ uid: bookingUID, tickets: [] });
    }

    const numPassengers = Object.keys(bookingUsersData).length;

    // Create bookings for each passenger
    for (let i = 1; i <= numPassengers; i++) {
      const userData = bookingUsersData[`passenger${i}`];
      const seat = selectedSeats[i - 1];

      const booking = new Booking({
        flight: flight._id,
        user: user._id,
        seat,
        fName: userData.firstName,
        lName: userData.lastName,
        dob: userData.dob,
        passportNumber: userData.passportNumber,
        state: userData.state,
        phoneNumber: userData.phoneNumber,
        email: userData.email,
        passportSizePhoto: userData.passportSizePhoto,
      });

      const savedBooking = await booking.save();
      ticket.tickets.push(savedBooking._id);
    }

    user.bookings.push(ticket._id);
    await Promise.all([ticket.save(), user.save()]);

    flight.bookedSeats.push(...selectedSeats);
    await flight.save();

    // 🔥 STRIPE MOCKING LOGIC
    let session;
    
    if (process.env.NODE_ENV === "development") {
      // 🟢 MOCK SESSION FOR DEVELOPMENT
      console.log("🧪 Using MOCK Stripe session for development");
      
      session = {
        id: `mock_session_${bookingUID}`,
       url: `http://localhost:5173/checkout-page?session_id=mock_session_{bookingUID}&success=true`,
        payment_status: "paid",
        customer_email: user.email,
        client_reference_id: req.params.flightId,
        amount_total: flight.price * numPassengers * 100,
        currency: "inr",
        // Mock metadata for testing
        metadata: {
          flightId: req.params.flightId,
          userId: user._id.toString(),
          ticketId: ticket._id.toString(),
          numPassengers: numPassengers.toString()
        }
      };
      
      // Simulate slight delay like real API
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } else {
      // 🔴 REAL STRIPE FOR PRODUCTION
      console.log("💳 Using REAL Stripe session for production");
      
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      
      session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        success_url: `${process.env.CLIENT_SITE_URL}checkout-page`,
        cancel_url: `${process.env.CLIENT_SITE_URL}`,
        customer_email: user.email,
        client_reference_id: req.params.flightId,
        line_items: [
          {
            price_data: {
              currency: "inr",
              unit_amount: flight.price * 100,
              product_data: {
                name: `${flight.airline.airlineName} - ${flight.from} to ${flight.to}`,
                description: `Departure: ${flight.departDate} ${flight.departTime}, Arrival: ${flight.arriveDate} ${flight.arriveTime}`,
                images: [flight.airline.airlineLogo],
              },
            },
            quantity: numPassengers,
          },
        ],
      });
    }

    // 📅 CREATE CALENDAR EVENT IF REQUESTED
    let calendarEventResult = null;
    
    if (createCalendarEvent) {
      try {
        console.log("📅 Creating calendar event for flight booking...");
        
        // Create start and end times for the calendar event
        const departureDateTime = new Date(`${flight.departDate}T${flight.departTime}`);
        const arrivalDateTime = new Date(`${flight.arriveDate}T${flight.arriveTime}`);
        
        // Create reminder event 2 hours before departure
        const reminderDateTime = new Date(departureDateTime.getTime() - 2 * 60 * 60 * 1000);
        const reminderEndDateTime = new Date(reminderDateTime.getTime() + 30 * 60 * 1000); // 30 minutes duration
        
        const eventData = {
          summary: `Flight Reminder: ${flight.airline.airlineName} ${flight.flightNumber}`,
          description: `Flight Details:
• Airline: ${flight.airline.airlineName}
• Flight Number: ${flight.flightNumber}
• From: ${flight.from}
• To: ${flight.to}
• Departure: ${flight.departDate} at ${flight.departTime}
• Arrival: ${flight.arriveDate} at ${flight.arriveTime}
• Seats: ${selectedSeats.join(', ')}
• Passengers: ${numPassengers}
• Booking ID: ${bookingUID}

Remember to:
- Arrive at the airport 2 hours early for domestic flights
- Bring valid ID and boarding pass
- Check baggage requirements`,
          startDateTime: reminderDateTime.toISOString(),
          endDateTime: reminderEndDateTime.toISOString(),
          location: `${flight.from} Airport`
        };
        
        // Make internal API call to create calendar event
        const calendarResponse = await fetch('http://localhost:5001/api/v1/create-calendar-event', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventData)
        });
        
        const calendarData = await calendarResponse.json();
        
        if (calendarData.status) {
          console.log("✅ Calendar event created successfully:", calendarData.data.eventId);
          calendarEventResult = {
            status: true,
            message: "Calendar event created successfully",
            data: {
              eventId: calendarData.data.eventId,
              eventLink: calendarData.data.eventLink,
              summary: calendarData.data.summary,
              reminderTime: reminderDateTime.toISOString()
            }
          };
        } else {
          throw new Error(calendarData.message || "Failed to create calendar event");
        }
        
      } catch (calendarError) {
        console.error("❌ Error creating calendar event:", calendarError);
        calendarEventResult = {
          status: false,
          message: `Calendar event creation failed: ${calendarError.message}`
        };
      }
    }

    const response = {
      success: true,
      message: process.env.NODE_ENV === "development" 
        ? "Mock Stripe checkout session created" 
        : "Stripe checkout session created",
      session,
    };
    
    // Add calendar event result to response if it was requested
    if (createCalendarEvent && calendarEventResult) {
      response.calendarEvent = calendarEventResult;
    }

    res.status(200).json(response);
    
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Function to generate a UID
function generateUID() {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let uid = "";
  for (let i = 0; i < 10; i++) {
    uid += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return uid;
}