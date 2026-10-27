import mongoose from "mongoose";
import Product from "../models/Product.js";

const uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/kidsroom";
const kids = ["2-3Y", "4-5Y", "6-7Y", "8-9Y"];
const products = [
  { name: "Rainbow Tutu Dress", category: "girls", price: 29.99, emoji: "👗", sizes: kids, stock: 25, description: "Twirl-ready cotton dress with soft tulle." },
  { name: "Dino Print T-Shirt", category: "boys", price: 14.99, emoji: "🦖", sizes: kids, stock: 40, description: "Breathable organic cotton tee." },
  { name: "Denim Dungarees", category: "boys", price: 34.5, emoji: "👖", sizes: kids, stock: 18, description: "Sturdy, stylish and made for play." },
  { name: "Cozy Baby Onesie", category: "baby", price: 12.0, emoji: "🍼", sizes: ["0-3M", "3-6M", "6-12M"], stock: 50, description: "Ultra-soft snap onesie." },
  { name: "Sparkle Sneakers", category: "girls", price: 39.0, emoji: "👟", sizes: ["26", "28", "30", "32"], stock: 15, description: "Light-up sneakers with easy straps." },
  { name: "Sun Hat", category: "accessories", price: 9.99, emoji: "👒", sizes: ["S", "M", "L"], stock: 30, description: "UV-protective wide brim hat." },
];

await mongoose.connect(uri);
await Product.deleteMany({});
await Product.insertMany(products);
console.log(`Seeded ${products.length} products`);
await mongoose.disconnect();
