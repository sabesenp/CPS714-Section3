# Payment & Billing Dashboard

A Next.js application for managing payments, subscriptions, and billing history. Built as a school project demonstrating modern web development practices with React, TypeScript, and Supabase.

## Features

- **Dashboard Overview**: View current balance, next payment, active subscription, and total payments
- **Payment Processing**: Add funds to account balance
- **Subscription Management**: View, upgrade, cancel, or reactivate subscriptions
- **Billing History**: Track all past transactions and payments
- **Real-time Updates**: Automatic refresh of dashboard data after actions

## Tech Stack

- **Framework**: Next.js 16.3 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Runtime**: React 19.2

## Quick Start

### Prerequisites

- Node.js 18+ and npm (or yarn/pnpm)
- A Supabase project with configured database tables

### Installation

1. Clone or navigate to the project directory:

   ```bash
   cd my-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root directory:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Create a production build
- `npm start` - Run the production server (requires build first)
- `npm run lint` - Run ESLint to check for code issues

## Database Setup

This application requires the following Supabase tables:

- **memberships**: User membership information (tier, status, balance, dates)
- **subscriptions**: Subscription plans and pricing
- **transactions**: Payment and billing history

See the [User Guide](./USER_GUIDE.md) for detailed setup instructions.

## Project Structure

```
my-app/
├── app/              # Next.js pages and components
├── lib/              # Utilities and services (Supabase, data operations)
├── public/           # Static assets
└── .env.local        # Environment variables (create this file)
```

## Documentation

For detailed installation, setup, and usage instructions, please see the [User Guide](./USER_GUIDE.md).

## Notes

- This is a school project demonstration
- Uses a hardcoded test user ID for demonstration purposes
- Currency displayed in Canadian Dollars (C$)
- Includes dark mode support via Tailwind CSS

## License

This project is created for educational purposes.
