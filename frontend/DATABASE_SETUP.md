# Database Setup Guide

This application supports two database configurations:

1. **Hosted Supabase** (default) - Cloud-hosted PostgreSQL via Supabase
2. **Local Supabase** (optional) - Local PostgreSQL via Supabase CLI

## Option 1: Hosted Supabase (Recommended for Production)

### Setup Steps

1. Create a Supabase project at https://supabase.com
2. Get your project URL and anon key from the project settings
3. Create a `.env.local` file in the `frontend` directory:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_USE_LOCAL_SUPABASE=false
```

4. Run the database schema setup:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the SQL from `scripts/reset-database.sql`

## Option 2: Local Supabase (Recommended for Development)

### Prerequisites

- Docker and Docker Compose installed
- Supabase CLI installed

### Setup Steps

1. **Install Supabase CLI** (if not already installed):

```bash
# macOS
brew install supabase/tap/supabase

# npm
npm install -g supabase

# Or download from https://github.com/supabase/cli/releases
```

2. **Initialize Supabase locally** (if not already done):

```bash
cd frontend
supabase init
```

3. **Start local Supabase**:

```bash
supabase start
```

This will start:
- PostgreSQL database (port 54322)
- PostgREST API (port 54321)
- Supabase Studio (port 54323)
- Auth service
- Storage service

4. **Create `.env.local` file**:

```bash
NEXT_PUBLIC_USE_LOCAL_SUPABASE=true
# Optionally override the default local URL
# NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
# NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

5. **Set up the database schema**:

```bash
# Option 1: Use Supabase CLI
supabase db reset

# Option 2: Run SQL directly
supabase db execute -f scripts/reset-database.sql

# Option 3: Use Supabase Studio
# Open http://localhost:54323 and use the SQL Editor
```

6. **Verify the setup**:

```bash
# Check if services are running
supabase status

# Access Supabase Studio
open http://localhost:54323
```

### Local Supabase Defaults

When `NEXT_PUBLIC_USE_LOCAL_SUPABASE=true`, the application uses these defaults:

- **API URL**: `http://localhost:54321`
- **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0`
- **PostgreSQL**: `postgresql://postgres:postgres@localhost:54322/postgres`

### Useful Commands

```bash
# Start local Supabase
supabase start

# Stop local Supabase
supabase stop

# View logs
supabase logs

# Reset database (drops all data)
supabase db reset

# Access PostgreSQL directly
supabase db psql
```

## Configuration Priority

The application checks for database configuration in this order:

1. **Environment variables** (`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - If both are set, uses hosted Supabase
2. **Local Supabase flag** (`NEXT_PUBLIC_USE_LOCAL_SUPABASE=true`)
   - If set to `true`, uses local Supabase defaults
3. **Error** - If neither is configured, the application will throw an error

## Troubleshooting

### Local Supabase not starting

- Ensure Docker is running
- Check if ports 54321-54323 are available
- Try `supabase stop` then `supabase start`

### Connection errors

- Verify your `.env.local` file is in the `frontend` directory
- Check that environment variables are prefixed with `NEXT_PUBLIC_` for client-side access
- Restart your Next.js development server after changing environment variables

### Database schema issues

- Make sure you've run `scripts/reset-database.sql`
- Check Supabase Studio (http://localhost:54323) to verify tables exist
- Review the SQL script for any errors

## Migration from Hosted to Local (or vice versa)

1. Export data from current database (if needed)
2. Update `.env.local` with new configuration
3. Run database schema setup on new database
4. Import data (if needed)
5. Restart the application

