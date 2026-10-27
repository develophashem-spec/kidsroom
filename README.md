# KidsRoom

E-commerce store for kids' fashion built with Next.js and MongoDB (Mongoose).
Browse by category, pick the right size/fit, add to cart and order online.

## Setup
```
npm install
cp .env.example .env.local   # set MONGODB_URI (and optional ADMIN_KEY for POST /api/products)
npm run seed                 # load sample products (MONGODB_URI env var or local default)
npm run dev
```
Open http://localhost:3000.
