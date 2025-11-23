# User Guide

## Table of Contents

1. [Installation](#installation)
2. [Setup](#setup)
3. [Usage](#usage)
4. [Features](#features)
5. [Troubleshooting](#troubleshooting)

---

## Installation

### Prerequisites

Before installing this application, make sure you have the following installed on your system:

- **Node.js** (version 18 or higher)
- **npm** (comes with Node.js) or **yarn** or **pnpm**

### Installation Steps

1. **Clone or navigate to the project directory**

   ```bash
   cd my-app
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

   This will install all required packages including Next.js, React, Supabase, and Tailwind CSS.

3. **Verify installation**

   ```bash
   npm list
   ```

   You should see all dependencies listed without errors.

---

## Setup

### Environment Variables

This application requires Supabase credentials to connect to the database. You need to create a `.env.local` file in the root directory of the project.

1. **Create the environment file**
   Create a new file named `.env.local` in the `my-app` folder.

2. **Add your Supabase credentials**

   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

   Replace `your_supabase_project_url` and `your_supabase_anon_key` with your actual Supabase credentials.

3. **Where to find your Supabase credentials**
   - Log into your Supabase project dashboard
   - Go to Settings → API
   - Copy the "Project URL" for `NEXT_PUBLIC_SUPABASE_URL`
   - Copy the "anon public" key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Database Setup

Make sure your Supabase database has the following tables configured:

- **memberships** table with columns:
  - `id` (primary key)
  - `user_id` (UUID)
  - `tier` (text)
  - `status` (text)
  - `balance` (number)
  - `current_period_start` (timestamp)
  - `current_period_end` (timestamp)
  - `created_at` (timestamp)

- **subscriptions** table with columns:
  - `tier` (text, foreign key to memberships.tier)
  - `Cost` (number)

- **transactions** table for billing history (referenced by the BillingHistory component)

---

## Usage

### Running the Development Server

To start the development server:

```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000)

### Available Scripts

- **`npm run dev`** - Starts the development server
- **`npm run build`** - Creates an optimized production build
- **`npm start`** - Runs the production server (requires `npm run build` first)
- **`npm run lint`** - Runs ESLint to check for code issues

### Accessing the Application

1. Open your web browser
2. Navigate to `http://localhost:3000`
3. You should see the Payment & Billing dashboard

---

## Features

### Dashboard Overview

The main dashboard displays four summary cards:

1. **Current Balance**
   - Shows your account balance
   - Displays "Credit / Prepaid" if positive, "Balance Due" if negative

2. **Next Payment**
   - Amount due for next payment
   - Date of next payment

3. **Active Subscription**
   - Current subscription plan name
   - Billing cycle information

4. **Total Payments (2025)**
   - Total amount paid in 2025
   - Number of transactions

### Current Subscription Panel

Located on the left side of the dashboard:

- **View subscription details**: Plan name, price, billing cycle, member since date, and next renewal date
- **Upgrade subscription**: Change to a higher tier plan
- **Cancel subscription**: Cancel your current subscription
- **Reactivate subscription**: Reactivate a canceled subscription

### Make a Payment Form

Located on the right side of the dashboard:

- **Enter payment amount**: Type the amount you want to add to your balance
- **Submit payment**: Click the payment button to process the transaction
- Payments are added to your account balance

### Billing History

Located at the bottom of the dashboard:

- **View transaction history**: See all past payments and transactions
- **Transaction details**: Includes date, amount, and transaction type
- **Automatic totals**: Total payments and transaction count are automatically calculated

---

## Troubleshooting

### Common Issues

#### Application won't start

**Problem**: `npm run dev` fails or shows errors

**Solutions**:

- Make sure all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be 18+)
- Delete `node_modules` and `package-lock.json`, then run `npm install` again

#### Database connection errors

**Problem**: Error message about Supabase environment variables

**Solutions**:

- Verify `.env.local` file exists in the root directory
- Check that environment variable names are correct:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Ensure there are no extra spaces or quotes in the `.env.local` file
- Restart the development server after adding/changing environment variables

#### "User ID Missing" or "No Membership Found"

**Problem**: Dashboard shows error messages about missing data

**Solutions**:

- Verify your Supabase database has a membership record for the test user ID: `49f7c14c-1c83-49fc-8701-38043efdb920`
- Check that the database tables are properly set up with correct column names
- Verify the relationship between `memberships` and `subscriptions` tables is configured

#### Build errors

**Problem**: `npm run build` fails

**Solutions**:

- Check for TypeScript errors: `npm run lint`
- Ensure all environment variables are set
- Verify all imports are correct
- Check console for specific error messages

### Getting Help

If you encounter issues not covered here:

1. Check the browser console for error messages (F12 → Console tab)
2. Check the terminal where the dev server is running for server errors
3. Verify your Supabase project is active and accessible
4. Review the Next.js documentation: <https://nextjs.org/docs>

---

## Additional Notes

- This application uses **TypeScript** for type safety
- **Tailwind CSS** is used for styling with dark mode support
- The application assumes a specific user ID is being used (hardcoded for testing purposes)
- All currency values are displayed in Canadian Dollars (C$)
- The application is designed as a school project demonstration

---

## Project Structure

```
my-app/
├── app/              # Next.js app directory (pages and components)
│   ├── page.tsx      # Main dashboard page
│   ├── PaymentForm.tsx
│   ├── SubscriptionPanel.tsx
│   └── BillingHistory.tsx
├── lib/              # Utility functions and services
│   ├── supabase.js   # Supabase client configuration
│   └── dataService.ts # Database operations
├── public/           # Static assets
├── .env.local        # Environment variables (create this)
└── package.json      # Project dependencies and scripts
```

---

*Last updated: January 2025*
