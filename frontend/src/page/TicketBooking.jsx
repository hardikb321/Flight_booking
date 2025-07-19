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

  const handleFlightBooking = async (e) => {
    e.preventDefault();

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

      

      // If no conflicts or conflicts were ignored, proceed with booking
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
    }
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
    </div>
  );
};

export default TicketBooking;
