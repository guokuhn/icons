#!/bin/bash

# Start script for React client
# This script checks if the API server is running and starts the client

echo "🚀 Starting Iconify Private Library Client..."
echo ""

# Check if API server is running
echo "📡 Checking API server status..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ API server is running"
else
    echo "⚠️  API server is not running"
    echo "   Please start the API server first:"
    echo "   cd packages/api && npm run dev"
    echo ""
    read -p "Do you want to continue anyway? (y/n) " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo ""
echo "🎨 Starting React client..."
echo "   The app will be available at http://localhost:5173"
echo ""

cd packages/client && npm run dev
