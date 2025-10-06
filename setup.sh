#!/bin/bash

echo "🚀 HeavyRent Admin Panel Setup Script"
echo "====================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js is installed: $(node --version)"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm is installed: $(npm --version)"

# Navigate to admin panel directory
cd admin-panel

echo "📦 Installing dependencies..."
npm install

echo ""
echo "🔧 Setup Complete!"
echo ""
echo "Next Steps:"
echo "1. Update Firebase configuration in src/firebase.ts"
echo "2. Create admin user in Firebase Auth"
echo "3. Add admin role to user document in Firestore"
echo "4. Run 'npm start' to start development server"
echo ""
echo "📚 For detailed instructions, see README.md"
echo ""
echo "🎉 Happy coding!"

