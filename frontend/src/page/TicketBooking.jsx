import React, { useEffect, useState, useContext } from "react";
import Header from "../components/TicketBookingForm/Header";
import FormHeader from "../components/TicketBookingForm/FormHeader";
import TravellerDetail from "../components/TicketBookingForm/TravellerDetail";
import SeatReservation from "../components/TicketBookingForm/SeatReservation";
import ReviewTicket from "../components/TicketBookingForm/ReviewTicket";
import FareSummary from "../components/TicketBookingForm/FareSummary";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { BACKENDURL } from "../Config/Config";
import { authContext } from "../context/authContext";
import uploadImageToCloudinary from "../utils/uploadImageToCloudinary";
import airplaneLoader from "../assets/images/airplaneLoader.gif";

// Schedule Conflict Modal Component
const ScheduleConflictModal = ({ 
  isOpen, 
  onClose, 
  onBookAnyway, 
  conflictingEvents,
  flightDetails 
}) => {
  if (!isOpen) return null;

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
              <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Schedule Conflict Detected</h3>
              <p className="text-sm text-gray-600">Your flight conflicts with existing calendar events</p>
            </div>
          </div>

          {/* Flight Details */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Flight Details:</h4>
            <p className="text-sm text-blue-800">
              <strong>Departure:</strong> {formatDateTime(`${flightDetails.departDate}T${flightDetails.departTime}`)}
            </p>
            <p className="text-sm text-blue-800">
              <strong>Arrival:</strong> {formatDateTime(`${flightDetails.arriveDate}T${flightDetails.arriveTime}`)}
            </p>
          </div>

          {/* Conflicting Events */}
          <div className="mb-6">
            <h4 className="font-medium text-gray-900 mb-3">Conflicting Events:</h4>
            <div className="space-y-2">
              {conflictingEvents.map((event, index) => (
                <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start">
                    <div className="w-2 h-2 bg-red-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                    <div className="flex-1">
                      <h5 className="font-medium text-red-900">{event.summary || 'Untitled Event'}</h5>
                      <p className="text-sm text-red-700 mt-1">
                        {formatDateTime(event.start.dateTime || event.start.date)} - {' '}
                        {formatDateTime(event.end.dateTime || event.end.date)}
                      </p>
                      {event.description && (
                        <p className="text-sm text-red-600 mt-1">{event.description}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Warning Message */}
          <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Booking this flight may cause scheduling conflicts. 
              We recommend checking your calendar before proceeding.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onBookAnyway}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Book Anyway
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TicketBooking = () => {
  const { isUserLoggedIn } = useContext(authContext);
  const history = useNavigate();

  let { id } = useParams();
  const [currentActiveForm, setCurrentActiveForm] = useState(0);
  const [numberOfPassengers, setNumberOfPassengers] = useState(0);
  const [selectedSeats, setSelectedSeats] = useState({});
  const [formData, setFormData] = useState({});
  const [currentFlight, setCurrentFlight] = useState({});
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [conflictingEvents, setConflictingEvents] = useState([]);

  const checkScheduleConflict = async () => {
    try {
      console.log("🔍 Checking for schedule conflicts...");
      
      // Get current flight details
      const flightDepartureDateTime = new Date(`${currentFlight.departDate}T${currentFlight.departTime}`);
      const flightArrivalDateTime = new Date(`${currentFlight.arriveDate}T${currentFlight.arriveTime}`);
      
      // Add buffer time (2 hours before departure and 1 hour after arrival)
      const bufferStartTime = new Date(flightDepartureDateTime.getTime() - 2 * 60 * 60 * 1000);
      const bufferEndTime = new Date(flightArrivalDateTime.getTime() + 1 * 60 * 60 * 1000);
      
      console.log("Flight Schedule:");
      console.log("- Departure:", flightDepartureDateTime.toISOString());
      console.log("- Arrival:", flightArrivalDateTime.toISOString());
      console.log("- Buffer Start:", bufferStartTime.toISOString());
      console.log("- Buffer End:", bufferEndTime.toISOString());
      
      // Fetch existing calendar events for the conflict check period
      const token = localStorage.getItem("token");
      const response = await fetch(
        `${BACKENDURL}/api/v1/get-calendar-events?startDate=${bufferStartTime.toISOString()}&endDate=${bufferEndTime.toISOString()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      const data = await response.json();
      
      if (!data.status) {
        console.log("⚠️ Could not fetch calendar events, proceeding without conflict check");
        return { hasConflict: false, conflictingEvents: [] };
      }
      
      const existingEvents = data.data;
      console.log(`📅 Found ${existingEvents.length} existing calendar events to check`);
      
      const conflicts = [];
      
      // Check for overlapping events
      for (const event of existingEvents) {
        if (!event.start || !event.end) continue;
        
        const eventStart = new Date(event.start.dateTime || event.start.date);
        const eventEnd = new Date(event.end.dateTime || event.end.date);
        
        // Check if there's any overlap
        const hasOverlap = (
          (bufferStartTime < eventEnd) && (bufferEndTime > eventStart)
        );
        
        if (hasOverlap) {
          console.log("❌ Conflict detected with event:", event.summary);
          console.log("- Event Start:", eventStart.toISOString());
          console.log("- Event End:", eventEnd.toISOString());
          conflicts.push(event);
        }
      }
      
      if (conflicts.length > 0) {
        console.log(`❌ Found ${conflicts.length} conflicting events`);
        return { hasConflict: true, conflictingEvents: conflicts };
      }
      
      console.log("✅ No schedule conflicts detected");
      return { hasConflict: false, conflictingEvents: [] };
      
    } catch (error) {
      console.error("Error checking schedule conflicts:", error);
      // If there's an error checking conflicts, don't block the booking
      return { hasConflict: false, conflictingEvents: [] };
    }
  };

  const proceedWithBooking = async () => {
    const token = localStorage.getItem("token");

    const selectedSeatsArray = Object.entries(selectedSeats).reduce(
      (acc, [row, seats]) => {
        seats.forEach((seat) => {
          acc.push(`${row}${seat}`);
        });
        return acc;
      },
      []
    );

    try {
      // Upload images to Cloudinary
      for (const passengerId in formData) {
        const passenger = formData[passengerId];
        if (passenger.passportSizePhoto) {
          // Upload image to Cloudinary
          const cloudinaryResponse = await uploadImageToCloudinary(
            passenger.passportSizePhoto
          );
          console.log(
            "Image uploaded successfully:",
            cloudinaryResponse.secure_url
          );
          // Update formData with Cloudinary URL
          formData[passengerId].passportSizePhoto =
            cloudinaryResponse.secure_url;
        }
      }

      // Proceed with booking
      const bookingData = {
        bookingUsersData: formData,
        selectedSeats: selectedSeatsArray,
        createCalendarEvent: true,
      };

      console.log("Booking data:", bookingData);

      // Send booking data to the backend
      const response = await fetch(
        BACKENDURL + "/api/v1/bookings/checkout-session/" + id,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(bookingData),
        }
      );

      const data = await response.json();
      console.log("Response:", data);

      if (data.success) {
        // Check if calendar event was created successfully
        if (data.calendarEvent && data.calendarEvent.status) {
          console.log("✅ Calendar event created:", data.calendarEvent.data);
          toast.success("Flight booked and calendar event created successfully!");
        } else if (data.calendarEvent && !data.calendarEvent.status) {
          console.log("❌ Calendar event creation failed:", data.calendarEvent.message);
          toast.warn("Flight booked but calendar event creation failed");
        }

        window.location.href = data.session.url;
      } else {
        toast.error(data.message || "An error occurred during booking");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while processing your booking");
    }
  };

  const handleFlightBooking = async (e) => {
    e.preventDefault();

    try {
      // STEP 1: Check for schedule conflicts
      const conflictCheck = await checkScheduleConflict();
      
      if (conflictCheck.hasConflict) {
        // Show modal with conflicting events
        setConflictingEvents(conflictCheck.conflictingEvents);
        setShowConflictModal(true);
        return; // Stop here and wait for user decision
      }

      // No conflicts, proceed with booking
      await proceedWithBooking();

    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred while processing your booking");
    }
  };

  const handleBookAnyway = () => {
    setShowConflictModal(false);
    proceedWithBooking();
  };

  const handleCancelBooking = () => {
    setShowConflictModal(false);
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    setTimeout(() => {
      fetch(BACKENDURL + "/api/v1/flights/getSingleFlight/" + id, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.success === false) {
            toast.error("Please log in to book tickets");
            history("/");
            return;
          }
          console.log(data);
          setCurrentFlight(data);
          setLoading(false);
        });
    }, 1000);
  }, []);

  if (!isUserLoggedIn) {
    toast.error("Please log in to book tickets");
    history("/");
    return null;
  }

  return (
    <div className="px-[30px] md:px-[30px]">
      <div>
        {loading ? (
          <div className="w-full min-h-[60vh] flex justify-center items-center">
            <div className="">
              <img src={airplaneLoader} alt="" className="" />
            </div>
          </div>
        ) : (
          <div className="max-w-[1800px] mx-auto py-5 flex flex-col lg:flex-row gap-5">
            <div className="w-full lg:w-[70%]">
              <Header currentFlight={currentFlight} />
              <FormHeader currentActiveForm={currentActiveForm} />
              <div>
                {currentActiveForm === 0 ? (
                  <SeatReservation
                    setCurrentActiveForm={setCurrentActiveForm}
                    numberOfPassengers={numberOfPassengers}
                    setNumberOfPassengers={setNumberOfPassengers}
                    selectedSeats={selectedSeats}
                    setSelectedSeats={setSelectedSeats}
                    reservedSeats={currentFlight.bookedSeats}
                  />
                ) : currentActiveForm === 1 ? (
                  <TravellerDetail
                    setCurrentActiveForm={setCurrentActiveForm}
                    numberOfPassengers={numberOfPassengers}
                    formData={formData}
                    setFormData={setFormData}
                  />
                ) : currentActiveForm === 2 ? (
                  <ReviewTicket
                    setCurrentActiveForm={setCurrentActiveForm}
                    selectedSeats={selectedSeats}
                    formData={formData}
                    price={currentFlight.price}
                    numberOfPassengers={numberOfPassengers}
                    handleFlightBooking={handleFlightBooking}
                  />
                ) : null}
              </div>
            </div>
            <div className="w-full lg:w-[30%] h-fit">
              <FareSummary
                price={currentFlight.price}
                numberOfPassengers={numberOfPassengers}
              />
            </div>
          </div>
        )}
      </div>

      {/* Schedule Conflict Modal */}
      <ScheduleConflictModal
        isOpen={showConflictModal}
        onClose={handleCancelBooking}
        onBookAnyway={handleBookAnyway}
        conflictingEvents={conflictingEvents}
        flightDetails={currentFlight}
      />
    </div>
  );
};

export default TicketBooking;