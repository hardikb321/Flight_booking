import React from "react";
import HeroSection from "../components/Home/HeroSection";
import TopPlaces from "../components/Home/TopPlaces";
import ValuesWeProvide from "../components/Home/ValuesWeProvide";
import Testimonials from "../components/Home/Testimonials";
import LetGetToKnow from "../components/Home/LetGetToKnow";
import BookTicketBox from "../components/BookTicketBox";
import HomeTicketBookingBox from "../components/HomeTicketBookingBox";
import { useGoogleLogin, googleLogout } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";

const Home = () => {
  // Define your backend URL
  const BACKENDURL = "http://localhost:5001"; // Adjust this to your backend URL

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        console.log("Google OAuth response:", tokenResponse);
        
        const { code } = tokenResponse;
        
        // Exchange code for tokens via your backend
        const response = await fetch(BACKENDURL + "/api/v1/create-tokens", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ code }),
        });
        
        const data = await response.json();
        
        console.log("Backend response:", data);
        
        if (data.status === true) {
          console.log("Tokens received:", {
            access_token: data.data.access_token ? "✓ Present" : "✗ Missing",
            refresh_token: data.data.refresh_token ? "✓ Present" : "✗ Missing",
            expires_in: data.data.expires_in,
            
          });
          
          
          
          
          
          // Optionally store in localStorage (but remember the artifact restriction)
          // localStorage.setItem('google_tokens', JSON.stringify(data.data));
          
        } else {
          console.error("Backend error:", data.message);
        }
        
      } catch (error) {
        console.error("Fetch error:", error);
      }
    },
    onError: (error) => {
      console.log('Login Failed:', error);
    },
    scope: 'openid email profile https://www.googleapis.com/auth/calendar',
    flow: 'auth-code',
    prompt: 'consent', // Ensure refresh_token is returned
    access_type: 'offline', // Required to receive refresh token
  });

  return (
    <section className="px-[30px] md:px-[30px]">
      <HeroSection />
      <ValuesWeProvide />
      <HomeTicketBookingBox />
      <TopPlaces />
      <Testimonials />
      <LetGetToKnow />
      
      {/* Custom Google Login Button */}
      <button
        onClick={() => login()}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Sign in with Google (with Calendar Access)
      </button>
      
      
    </section>
  );
};

export default Home;