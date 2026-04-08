#!/bin/bash
set -e

echo "🚀 Setting up StakeIQ MVP..."

# Backend setup
echo "\n📦 Installing backend dependencies..."
cd backend
npm install

# Create uploads directory
mkdir -p uploads/kyc

# Generate Prisma client
echo "\n🔧 Generating Prisma client..."
npx prisma generate

# Push schema to database (creates tables)
echo "\n🗄️  Creating database tables..."
npx prisma db push

# Seed database
echo "\n🌱 Seeding database with sample data..."
node src/seed.js

cd ..

# Frontend setup
echo "\n📦 Installing frontend dependencies..."
cd frontend
npm install

cd ..

echo "\n✅ Setup complete!"
echo "\n📋 To start the app:"
echo "  Terminal 1 (backend):  cd backend && npm run dev"
echo "  Terminal 2 (frontend): cd frontend && npm run dev"
echo "\n🌐 Frontend: http://localhost:5173"
echo "📡 Backend API: http://localhost:3001"
echo "\n🔑 Demo login:"
echo "  Phone: 08123456789"
echo "  PIN: 1234"
