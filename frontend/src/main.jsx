import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthContextProvider } from "./context/authContext.jsx";
import { GoogleOAuthProvider } from "@react-oauth/google"
const CLIENT_ID="22378356786-7lc62harj5csrpfhl3s20d1vha70f24q.apps.googleusercontent.com";
ReactDOM.createRoot(document.getElementById("root")).render(
  <>
    <ToastContainer />
    <AuthContextProvider>
      <GoogleOAuthProvider clientId={CLIENT_ID}>
      <App />
      </GoogleOAuthProvider>
    </AuthContextProvider>
  </>
);
