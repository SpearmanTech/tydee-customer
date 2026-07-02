import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "@/firebase/firebase";
import { Alert } from "react-native";

export const runDatabaseSeed = async () => {
  // 1. The Master Catalog
  // Add, edit, or remove anything in this array. This is your single source of truth for now.
  const masterServicesList = [
    // --- Beauty & Grooming ---
    { name: "Makeup Artist (Glam)", category: "Beauty", base_price: 800, duration: "60 mins", description: "Full face makeup including lashes for events or shoots." },
    { name: "Nail Tech (Full Set)", category: "Beauty", base_price: 450, duration: "60 mins", description: "Acrylic or Gel full set with optional nail art." },
    { name: "Braiding (Knotless)", category: "Hair", base_price: 600, duration: "180 mins", description: "Standard knotless braids. Hair not included in base price." },
    { name: "Hair Styling & Install", category: "Hair", base_price: 400, duration: "120 mins", description: "Wig installs, silk presses, and styling." },
    { name: "Mobile Barbering", category: "Grooming", base_price: 250, duration: "45 mins", description: "Premium mobile haircut and beard trim at your location." },

    // --- Cleaning & Home ---
    { name: "General/Basic Cleaning", category: "Cleaning", base_price: 350, price_per_room: 50, duration: "180 mins", description: "Standard surface cleaning, sweeping, and mopping for homes." },
    { name: "Spring Clean", category: "Cleaning", base_price: 600, price_per_room: 100, duration: "300 mins", description: "Deep cleaning including inside cupboards, windows, and heavy scrubbing." },
    { name: "Oven Cleaning", category: "Cleaning", base_price: 250, duration: "90 mins", description: "Intensive degreasing and deep clean of internal oven and racks." },
    { name: "Gutter Cleaning", category: "Outdoor", base_price: 450, duration: "120 mins", description: "Clearing leaves and debris from roof gutters." },

    // --- Trades & Maintenance ---
    { name: "Leak Repair", category: "Plumbing", base_price: 550, duration: "60 mins", description: "Fixing dripping taps, leaking pipes, and toilet mechanisms." },
    { name: "Geyser Service", category: "Plumbing", base_price: 850, duration: "90 mins", description: "Element replacement, thermostat checks, and general geyser maintenance." },
    { name: "Electrical Fault Finding", category: "Electrical", base_price: 650, duration: "60 mins", description: "Diagnosing tripping mains, dead outlets, and wiring issues." }
  ];

  try {
    const batch = writeBatch(db);

    masterServicesList.forEach((service) => {
      // Create a URL-friendly, unique ID (e.g., "Makeup Artist (Glam)" -> "makeup-artist-glam")
      const docId = service.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric chars with dashes
        .replace(/(^-|-$)+/g, "");   // Remove leading/trailing dashes

      // Point to the flat "services" collection
      const serviceRef = doc(collection(db, "services"), docId);
      
      // Stage the data in the batch
      batch.set(serviceRef, {
        id: docId, // Save the ID inside the document too, it makes querying easier later
        ...service,
        isActive: true, // A helpful flag if you ever want to temporarily hide a service
        updatedAt: new Date().toISOString()
      });
    });

    // Execute the bulk write
    await batch.commit();
    Alert.alert("Database Seeded", `Successfully injected ${masterServicesList.length} services into Firestore!`);
    
  } catch (error) {
    console.error("Seeding failed:", error);
    Alert.alert("Seed Error", "Check the console for details.");
  }
}; 