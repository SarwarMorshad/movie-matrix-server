# 🎬 Movie Matrix Server

<div align="center">

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=JSON%20web%20tokens&logoColor=white)

**A powerful RESTful API backend for the Movie Matrix application**

[Features](#-features) • [API Documentation](#-api-documentation) • [Installation](#-installation) • [Environment Variables](#-environment-variables)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [API Documentation](#-api-documentation)
  - [Movie Routes](#movie-routes)
  - [Review Routes](#review-routes)
  - [Watchlist Routes](#watchlist-routes)
  - [User Routes](#user-routes)
  - [Statistics Routes](#statistics-routes)
- [Database Schema](#-database-schema)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

**Movie Matrix Server** is a comprehensive backend API built with Node.js and Express.js that powers a movie management platform. It provides a complete set of RESTful endpoints for managing movies, user reviews, watchlists, and user interactions.

### Key Capabilities

- 🎥 Full CRUD operations for movie management
- ⭐ User review and rating system with automatic average calculation
- 📝 Personal watchlist management
- 👤 User authentication and management
- 📊 Real-time statistics and analytics
- 🔒 Secure data handling with Firebase Admin integration

---

## ✨ Features

### Movie Management

- ✅ Add, update, and delete movies
- ✅ Get all movies or filter by user
- ✅ View detailed movie information with reviews
- ✅ Top-rated movies listing
- ✅ Recently added movies feed

### Review System

- ✅ Add, update, and delete reviews
- ✅ Automatic rating aggregation
- ✅ Review moderation support
- ✅ User-specific review management
- ✅ Prevent duplicate reviews per user

### Watchlist

- ✅ Add/remove movies to personal watchlist
- ✅ View complete watchlist with movie details
- ✅ Watchlist count statistics

### Statistics & Analytics

- ✅ Total movies count
- ✅ Total users count
- ✅ Total reviews count
- ✅ User-specific watchlist count

---

## 🛠 Tech Stack

| Technology         | Purpose                         |
| ------------------ | ------------------------------- |
| **Node.js**        | Runtime environment             |
| **Express.js**     | Web framework                   |
| **MongoDB**        | NoSQL database                  |
| **Firebase Admin** | Authentication & authorization  |
| **JSON Web Token** | Secure token generation         |
| **CORS**           | Cross-origin resource sharing   |
| **dotenv**         | Environment variable management |

---

## 🚀 Installation

### Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account or local MongoDB installation
- Firebase project (for authentication)

### Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/SarwarMorshad/movie-matrix-server.git
   cd movie-matrix-server
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:

   ```env
   DB_USERNAME=your_mongodb_username
   DB_PASSWORD=your_mongodb_password
   PORT=3000
   ```

4. **Start the server**

   ```bash
   npm start
   ```

   The server will run on `http://localhost:3000`

---

## 🔐 Environment Variables

Create a `.env` file with the following variables:

```env
# MongoDB: either a full connection string...
MONGODB_URI=mongodb+srv://user:password@cluster0.example.mongodb.net/?appName=Cluster0
# ...or the older username/password pair (used when MONGODB_URI is not set)
DB_USERNAME=your_mongodb_username
DB_PASSWORD=your_mongodb_password
DB_NAME=movieMatrixDB

# Firebase Admin (verifies the ID tokens sent by the client). Use ONE of:
# base64 of the service-account JSON (recommended on Vercel)
FIREBASE_SERVICE_ACCOUNT=base64-encoded-service-account-json
# or a path to the JSON file (handy locally)
FIREBASE_SERVICE_ACCOUNT_PATH=../serviceAccountKey.json

# Server Configuration
PORT=3000
```

To make the base64 value for Vercel from the downloaded key file:

```bash
node -e "console.log(require('fs').readFileSync('serviceAccountKey.json').toString('base64'))"
```

⚠️ **Never commit your `.env` file or `serviceAccountKey.json` to version control!**

### 🔒 Authentication

Routes that change data, or read personal data, need a Firebase ID token:

```
Authorization: Bearer <firebase-id-token>
```

| Access | Routes |
| --- | --- |
| Public | `GET /movies`, `/movies/:id`, `/movies-top-rated`, `/movies-recent`, `/reviews/:movieId`, `/stats/*-count` |
| Logged in | `POST /movies`, `POST /reviews`, `GET /my-movies`, `GET /my-reviews`, `POST /users`, `GET /users/me`, watchlist routes |
| Owner or admin | `PUT/DELETE /movies/:id`, `PUT/DELETE /reviews/:id` |

Identity always comes from the token: `addedBy`, `userEmail` and watchlist emails sent in the body are ignored. A user is an admin when their document in the `users` collection has `role: "admin"`.

---

## 📡 API Documentation

### Base URL

```
http://localhost:3000
```

---

### Movie Routes

#### Get All Movies

```http
GET /movies
```

**Response:** Array of all movies

---

#### Get Single Movie

```http
GET /movies/:id
```

**Parameters:**

- `id` (path) - Movie ID

**Response:** Movie object with reviews, average rating, and review count

---

#### Get My Movies

```http
GET /my-movies?email={userEmail}
```

**Query Parameters:**

- `email` (required) - User's email

**Response:** Array of movies added by the user

---

#### Get Top Rated Movies

```http
GET /movies-top-rated
```

**Response:** Top 5 highest-rated movies

---

#### Get Recently Added Movies

```http
GET /movies-recent
```

**Response:** Latest 6 movies

---

#### Add Movie

```http
POST /movies
```

**Request Body:**

```json
{
  "title": "Inception",
  "genre": "Sci-Fi",
  "releaseYear": 2010,
  "director": "Christopher Nolan",
  "cast": ["Leonardo DiCaprio", "Tom Hardy"],
  "rating": 8.8,
  "duration": "148 min",
  "plotSummary": "A thief who steals corporate secrets...",
  "posterUrl": "https://example.com/poster.jpg",
  "language": "English",
  "country": "USA",
  "addedBy": "user@example.com"
}
```

---

#### Update Movie

```http
PUT /movies/:id
```

**Parameters:**

- `id` (path) - Movie ID

**Request Body:** Same as Add Movie

---

#### Delete Movie

```http
DELETE /movies/:id
```

**Parameters:**

- `id` (path) - Movie ID

**Note:** Also deletes all associated reviews

---

### Review Routes

#### Get Reviews for a Movie

```http
GET /reviews/:movieId
```

**Parameters:**

- `movieId` (path) - Movie ID

**Response:** Array of approved reviews

---

#### Get My Reviews

```http
GET /my-reviews?email={userEmail}
```

**Query Parameters:**

- `email` (required) - User's email

---

#### Add Review

```http
POST /reviews
```

**Request Body:**

```json
{
  "movieId": "60d5ec49f1b2c8b1f8c4e1a1",
  "rating": 8.5,
  "comment": "Great movie!",
  "userEmail": "user@example.com",
  "userName": "John Doe",
  "userPhoto": "https://example.com/photo.jpg"
}
```

**Validations:**

- Rating must be between 1-10
- Users can only review a movie once
- Automatically updates movie's average rating

---

#### Update Review

```http
PUT /reviews/:id
```

**Parameters:**

- `id` (path) - Review ID

**Request Body:**

```json
{
  "rating": 9.0,
  "comment": "Updated comment",
  "userEmail": "user@example.com"
}
```

---

#### Delete Review

```http
DELETE /reviews/:id?email={userEmail}
```

**Parameters:**

- `id` (path) - Review ID
- `email` (query) - User's email

---

### Watchlist Routes

#### Get User's Watchlist

```http
GET /watchlist/:email
```

**Parameters:**

- `email` (path) - User's email

**Response:** Array of movies in watchlist with full details

---

#### Add to Watchlist

```http
POST /watchlist
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "movieId": "60d5ec49f1b2c8b1f8c4e1a1"
}
```

---

#### Remove from Watchlist

```http
DELETE /watchlist/:email/:movieId
```

**Parameters:**

- `email` (path) - User's email
- `movieId` (path) - Movie ID

---

### User Routes

#### Save User

```http
POST /users
```

**Request Body:**

```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "photoURL": "https://example.com/photo.jpg"
}
```

**Note:** Prevents duplicate user creation

---

### Statistics Routes

#### Get Total Movies Count

```http
GET /stats/movies-count
```

#### Get Total Users Count

```http
GET /stats/users-count
```

#### Get Total Reviews Count

```http
GET /stats/reviews-count
```

#### Get Watchlist Count

```http
GET /stats/watchlist-count/:email
```

---

## 💾 Database Schema

### Collections

#### movies

```javascript
{
  _id: ObjectId,
  title: String,
  genre: String,
  releaseYear: Number,
  director: String,
  cast: Array<String>,
  rating: Number,
  duration: String,
  plotSummary: String,
  posterUrl: String,
  language: String,
  country: String,
  addedBy: String (email),
  reviewCount: Number
}
```

#### reviews

```javascript
{
  _id: ObjectId,
  movieId: String,
  rating: Number,
  comment: String,
  userEmail: String,
  userName: String,
  userPhoto: String,
  createdAt: Date,
  updatedAt: Date,
  moderated: Boolean
}
```

#### watchlist

```javascript
{
  _id: ObjectId,
  email: String,
  movieId: String,
  addedAt: Date
}
```

#### users

```javascript
{
  _id: ObjectId,
  email: String,
  name: String,
  photoURL: String
}
```

---

## 🌐 Deployment

This project is configured for deployment on **Vercel**.

### Deploy to Vercel

1. Install Vercel CLI:

   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:

   ```bash
   vercel login
   ```

3. Deploy:

   ```bash
   vercel
   ```

4. Set environment variables in Vercel dashboard:
   - `DB_USERNAME`
   - `DB_PASSWORD`

### Alternative Deployment Options

- **Heroku**
- **Railway**
- **Render**
- **AWS EC2**
- **DigitalOcean**

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the **ISC License**.

---

## 👨‍💻 Author

**Sarwar Morshad**

- GitHub: [@SarwarMorshad](https://github.com/SarwarMorshad)

---

## 🙏 Acknowledgments

- Express.js team for the amazing framework
- MongoDB team for the robust database
- Firebase team for authentication services
- All contributors and users of Movie Matrix

---

<div align="center">

**⭐ Star this repository if you find it helpful!**

Made with ❤️ for movie enthusiasts

</div>
