#!/bin/bash
# Techboloy Med — Setup Script

set -e

echo "🏥 Techboloy Med — Setup"
echo "========================"

# Load nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Backend
echo ""
echo "📦 Installing backend dependencies..."
cd backend && npm install

echo ""
echo "🔧 Generating Prisma client..."
npx prisma generate

echo ""
echo "✅ Backend ready."

# Frontend
echo ""
echo "📦 Installing frontend dependencies..."
cd ../frontend && npm install

echo ""
echo "✅ Frontend ready."

echo ""
echo "=============================="
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit backend/.env with your DATABASE_URL, JWT_SECRET, OPENAI_API_KEY"
echo "2. Run: cd backend && npm run db:push && npm run db:seed"
echo "3. Run: cd backend && npm run dev (in one terminal)"
echo "4. Run: cd frontend && npm run dev (in another terminal)"
echo "5. Open: http://localhost:5173"
echo "=============================="
