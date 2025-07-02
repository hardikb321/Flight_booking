# Flight Booking System with Queue Management

Welcome to the Flight Booking System project! This web application focuses on providing a simple and efficient way to search and book flights through a user-friendly interface. It introduces a queue-based backend system to handle booking requests fairly and reliably. Below you'll find detailed information on how to set up, use, and contribute to this project.

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Demo](#demo)
- [Installation](#installation)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Introduction

In the fast-paced digital age, the Flight Booking System provides a modern and minimal solution to traditional ticketing systems. Built using the MERN stack (MongoDB, Express.js, React.js, Node.js), this application allows users to search for and book flights efficiently. A key enhancement is the integration of a **queue mechanism** to ensure fair processing of booking requests, especially under load.

## Features

- **User Authentication**: Register and log in securely.
- **Flight Search and Booking**: Search for flights based on source, destination, and date, and book them using a queue-backed system.
- **Queue-Based Booking**: Ensures orderly and conflict-free ticket processing under simultaneous user requests.
- **Responsive Design**: Offers a consistent experience across desktops, laptops, tablets, and smartphones.

> ✨ Note: QR code verification, admin panel, and payment integration have been removed in this version for simplicity and to focus solely on the booking system.

## Demo

Check out the live demo of the Flight Booking System [here](https://abvssystem.web.app/).

## Installation

To run this project locally, follow these steps:

1. Clone the repository:

```bash
git clone https://github.com/PiyushPb/Airplane-Ticket-Booking.git
```

2. Navigate to the project directory:

```bash
cd airplane-ticket-booking
```

3. There are 2 directories: `frontend` and `backend`.

For frontend:

```bash
cd frontend
npm install
```

For backend:

```bash
cd backend
npm install
```

4. Set up environment variables:
   - Create a `.env` file inside the `backend` directory.
   - Add environment variables for MongoDB connection and JWT token:

```env
MONGO_URL=<your-mongodb-uri>
JWT_TOKEN=<your-jwt-secret>
```

5. Start the development server:

For backend:

```bash
npm run dev
```

For frontend (in a separate terminal):

```bash
npm run dev
```

6. Open your browser and visit `http://localhost:5173` to access the application.

## Usage

Once the application is running, users can:

- Register or log in to their accounts.
- Search for flights based on source, destination, and date.
- Book tickets using the queue system to handle concurrent requests fairly.
- View their booked flights through the user dashboard.




