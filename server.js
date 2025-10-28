import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Initialize database table
async function initDatabase() {
  try {
    // Create table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS waitlist (
        id SERIAL PRIMARY KEY,
        twitter_id VARCHAR(255) UNIQUE NOT NULL,
        twitter_username VARCHAR(255) NOT NULL,
        twitter_display_name VARCHAR(255),
        wallet_address VARCHAR(42),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('✅ Database table initialized');

    // Add wallet_address column if it doesn't exist (for existing tables)
    await pool.query(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'waitlist' AND column_name = 'wallet_address'
        ) THEN
          ALTER TABLE waitlist ADD COLUMN wallet_address VARCHAR(42);
          RAISE NOTICE 'Added wallet_address column';
        END IF;

        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'waitlist' AND column_name = 'updated_at'
        ) THEN
          ALTER TABLE waitlist ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
          RAISE NOTICE 'Added updated_at column';
        END IF;
      END $$;
    `);
    console.log('✅ Database schema updated');

  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}

initDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initiate Twitter OAuth
app.get('/api/auth/initiate', (req, res) => {
  const clientId = process.env.TWITTER_CLIENT_ID;
  const redirectUri = `${process.env.APP_URL}/api/auth/callback`;
  
  if (!clientId) {
    return res.status(500).json({ error: 'Server configuration error - missing client ID' });
  }

  // Generate random state for CSRF protection
  const state = Math.random().toString(36).substring(7);
  
  // For OAuth 2.0 without PKCE
  const scopes = 'tweet.read users.read';
  const authUrl = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;

  res.json({ authUrl });
});

// Twitter OAuth callback
app.get('/api/auth/callback', async (req, res) => {
  const { code, state } = req.query;

  if (!code) {
    return res.redirect('/?error=no_code');
  }

  try {
    const redirectUri = `${process.env.APP_URL}/api/auth/callback`;
    
    // Exchange code for access token
    const tokenResponse = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`
        ).toString('base64')}`
      },
      body: new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return res.redirect('/?error=token_exchange_failed');
    }

    const tokens = await tokenResponse.json();

    // Get user info from Twitter
    const userResponse = await fetch('https://api.twitter.com/2/users/me', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('Failed to fetch user data');
      return res.redirect('/?error=user_fetch_failed');
    }

    const userData = await userResponse.json();
    const user = userData.data;

    // Store in database
    await pool.query(
      `INSERT INTO waitlist (twitter_id, twitter_username, twitter_display_name) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (twitter_id) DO UPDATE 
       SET twitter_username = $2, twitter_display_name = $3`,
      [user.id, user.username, user.name || user.username]
    );

    console.log(`✅ User added to waitlist: @${user.username}`);

    // Redirect back to frontend with success
    res.redirect(`/?success=true&username=${encodeURIComponent(user.username)}&displayName=${encodeURIComponent(user.name || user.username)}`);
  } catch (error) {
    console.error('OAuth error:', error);
    res.redirect('/?error=auth_failed');
  }
});

// Get waitlist count
app.get('/api/waitlist/count', async (req, res) => {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM waitlist');
    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error('Error getting count:', error);
    res.status(500).json({ error: 'Failed to get count' });
  }
});

// Get all waitlist entries
app.get('/api/waitlist/all', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT twitter_username, twitter_display_name, wallet_address, created_at FROM waitlist ORDER BY created_at DESC'
    );
    res.json({ users: result.rows });
  } catch (error) {
    console.error('Error getting waitlist:', error);
    res.status(500).json({ error: 'Failed to get waitlist' });
  }
});

// Save wallet address
app.post('/api/wallet/save', async (req, res) => {
  const { twitter_username, wallet_address } = req.body;

  if (!twitter_username || !wallet_address) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate Ethereum address format
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/;
  if (!ethAddressRegex.test(wallet_address)) {
    return res.status(400).json({ error: 'Invalid wallet address format' });
  }

  try {
    await pool.query(
      `UPDATE waitlist 
       SET wallet_address = $1, updated_at = NOW() 
       WHERE twitter_username = $2`,
      [wallet_address, twitter_username]
    );

    console.log(`✅ Wallet saved for @${twitter_username}: ${wallet_address}`);
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving wallet:', error);
    res.status(500).json({ error: 'Failed to save wallet address' });
  }
});

// Serve React app for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
