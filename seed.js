// seed.js - Seed script for After-School Lessons coursework
// Usage: node seed.js

const { MongoClient } = require('mongodb');

// === CONFIGURATION ===
const uri = "mongodb+srv://MICHAEL:1Q2W3E@cluster0.0jkcsmn.mongodb.net/";
const dbName = "AFTER_SCHOOL_LESSONS";
const lessonsCollectionName = "Lessons";
const ordersCollectionName = "Orders";

// === LESSONS DATA ===
const lessonsData = [
  { id: 1, subject: 'Math',        location: 'Hendon',      price: 100, spaces: 5, icon: 'fa-solid fa-calculator' },
  { id: 2, subject: 'English',     location: 'Colindale',   price: 80,  spaces: 5, icon: 'fa-solid fa-book' },
  { id: 3, subject: 'Science',     location: 'Brent Cross', price: 90,  spaces: 5, icon: 'fa-solid fa-flask' },
  { id: 4, subject: 'Art',         location: 'Golders G',   price: 95,  spaces: 5, icon: 'fa-solid fa-palette' },
  { id: 5, subject: 'Music',       location: 'Hendon',      price: 85,  spaces: 5, icon: 'fa-solid fa-music' },
  { id: 6, subject: 'Coding',      location: 'Colindale',   price: 120, spaces: 5, icon: 'fa-solid fa-laptop-code' },
  { id: 7, subject: 'Dance',       location: 'Brent Cross', price: 70,  spaces: 5, icon: 'fa-solid fa-person-dance' },
  { id: 8, subject: 'French',      location: 'Golders G',   price: 75,  spaces: 5, icon: 'fa-solid fa-language' },
  { id: 9, subject: 'History',     location: 'Hendon',      price: 65,  spaces: 5, icon: 'fa-solid fa-landmark' },
  { id: 10, subject: 'Sports',     location: 'Colindale',   price: 60,  spaces: 5, icon: 'fa-solid fa-basketball' }
];

async function seed() {
  // ✅ Fixed: removed unsupported option
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log("Connected to MongoDB cluster.");

    const db = client.db(dbName);

    // === LESSONS COLLECTION ===
    const lessonsCol = db.collection(lessonsCollectionName);
    
    // Optional: Clear collection first
    await lessonsCol.deleteMany({});
    console.log(`Cleared existing documents from ${lessonsCollectionName}`);

    // Insert lessons
    const lessonsResult = await lessonsCol.insertMany(lessonsData);
    console.log(`Inserted ${lessonsResult.insertedCount} lessons into ${lessonsCollectionName}`);

    // === ORDERS COLLECTION ===
    const ordersCol = db.collection(ordersCollectionName);
    
    // Optional: Clear orders
    await ordersCol.deleteMany({});
    console.log(`Cleared existing documents from ${ordersCollectionName}`);

    console.log("Database seeding complete.");
  } catch (err) {
    console.error("Error during seeding:", err);
  } finally {
    await client.close();
    console.log("MongoDB connection closed.");
  }
}

seed();
