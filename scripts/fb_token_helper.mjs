/**
 * Facebook Token Diagnostic & Exchange Scratchpad Tool
 * 
 * Usage:
 *   1. Test current token in .env:
 *      node scripts/fb_token_helper.mjs test
 * 
 *   2. Test a new token candidate directly:
 *      node scripts/fb_token_helper.mjs test "YOUR_NEW_TOKEN"
 * 
 *   3. Generate a Never-Expiring Page Access Token:
 *      node scripts/fb_token_helper.mjs exchange <APP_ID> <APP_SECRET> <SHORT_LIVED_USER_TOKEN>
 */

import fs from 'fs';
import path from 'path';

// Helper to sanitize tokens from logs
function sanitize(msg, token) {
  if (!msg) return '';
  let str = String(msg);
  if (token && token.length > 8) {
    str = str.split(token).join('[REDACTED_TOKEN]');
  }
  return str.replace(/access_token=[a-zA-Z0-9%_-]+/gi, 'access_token=[REDACTED]');
}

// Load env vars from .env
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  const env = {};
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim();
      }
    }
  }
  return env;
}

const env = loadEnv();
const PAGE_ID = env.FACEBOOK_PAGE_ID || '1367390873123721';

async function testToken(tokenToTest) {
  const token = tokenToTest || env.FACEBOOK_PAGE_ACCESS_TOKEN;
  if (!token) {
    console.error('❌ No token found. Either provide one as an argument or set FACEBOOK_PAGE_ACCESS_TOKEN in .env');
    return;
  }

  console.log(`\n==================================================`);
  console.log(`🔍 DIAGNOSING FACEBOOK TOKEN FOR PAGE: ${PAGE_ID}`);
  console.log(`Token prefix: ${token.substring(0, 8)}... (Length: ${token.length})`);
  console.log(`==================================================\n`);

  // Step 1: Query Page Node
  console.log(`[1/3] Testing GET /${PAGE_ID}?fields=id,name...`);
  try {
    const pageUrl = `https://graph.facebook.com/v26.0/${PAGE_ID}?fields=id,name&access_token=${encodeURIComponent(token)}`;
    const pageRes = await fetch(pageUrl);
    const pageData = await pageRes.json();

    if (!pageRes.ok) {
      console.log(`❌ Page Node Failed (HTTP ${pageRes.status}):`);
      console.log(`   Message: ${pageData?.error?.message}`);
      console.log(`   Code: ${pageData?.error?.code}, Subcode: ${pageData?.error?.error_subcode || 'none'}`);
      console.log(`   Type: ${pageData?.error?.type}`);
      return;
    }

    console.log(`✅ Page Node Connected Successfully!`);
    console.log(`   Page Name: "${pageData.name}"`);
    console.log(`   Page ID:   ${pageData.id}`);

    // Step 2: Query Posts
    console.log(`\n[2/3] Testing GET /${PAGE_ID}/posts...`);
    const postsUrl = `https://graph.facebook.com/v26.0/${PAGE_ID}/posts?fields=id,message,created_time,permalink_url,full_picture&limit=5&access_token=${encodeURIComponent(token)}`;
    const postsRes = await fetch(postsUrl);
    const postsData = await postsRes.json();

    if (!postsRes.ok) {
      console.log(`❌ Posts Endpoint Failed (HTTP ${postsRes.status}):`);
      console.log(`   Message: ${postsData?.error?.message}`);
    } else {
      const count = Array.isArray(postsData.data) ? postsData.data.length : 0;
      console.log(`✅ Posts Endpoint Connected! (${count} posts retrieved)`);
    }

    // Step 3: Query Photos
    console.log(`\n[3/3] Testing GET /${PAGE_ID}/photos...`);
    const photosUrl = `https://graph.facebook.com/v26.0/${PAGE_ID}/photos?fields=id,name,created_time,images,link&limit=5&access_token=${encodeURIComponent(token)}`;
    const photosRes = await fetch(photosUrl);
    const photosData = await photosRes.json();

    if (!photosRes.ok) {
      console.log(`❌ Photos Endpoint Failed (HTTP ${photosRes.status}):`);
      console.log(`   Message: ${photosData?.error?.message}`);
    } else {
      const count = Array.isArray(photosData.data) ? photosData.data.length : 0;
      console.log(`✅ Photos Endpoint Connected! (${count} photos retrieved)`);
    }

    console.log(`\n🎉 SUMMARY: Token is VALID and operational for Meta Graph API v26.0!`);
  } catch (err) {
    console.error('❌ Network error testing token:', err.message);
  }
}

async function exchangeToken(appId, appSecret, userToken) {
  if (!appId || !appSecret || !userToken) {
    console.error('❌ Missing arguments. Usage:');
    console.error('   node scripts/fb_token_helper.mjs exchange <APP_ID> <APP_SECRET> <SHORT_LIVED_USER_TOKEN>');
    return;
  }

  console.log(`\n🔄 Exchanging short-lived user token for long-lived user token...`);
  try {
    const exchangeUrl = `https://graph.facebook.com/v26.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(appId)}&client_secret=${encodeURIComponent(appSecret)}&fb_exchange_token=${encodeURIComponent(userToken)}`;
    const exRes = await fetch(exchangeUrl);
    const exData = await exRes.json();

    if (!exRes.ok) {
      console.error(`❌ Exchange failed:`, exData?.error?.message);
      return;
    }

    const longLivedUserToken = exData.access_token;
    console.log(`✅ Long-lived user token obtained (expires in ~60 days).`);

    console.log(`\n🔄 Retrieving permanent Page Access Token for Page ID: ${PAGE_ID}...`);
    const pageUrl = `https://graph.facebook.com/v26.0/${PAGE_ID}?fields=access_token,name&access_token=${encodeURIComponent(longLivedUserToken)}`;
    const pageRes = await fetch(pageUrl);
    const pageData = await pageRes.json();

    if (!pageRes.ok) {
      console.error(`❌ Failed to retrieve Page access token:`, pageData?.error?.message);
      console.error(`   Ensure the user has 'pages_read_engagement' and 'pages_show_list' permissions.`);
      return;
    }

    if (!pageData.access_token) {
      console.error(`❌ Page token not returned for page "${pageData.name}". Ensure you have Admin/Editor role on this Page.`);
      return;
    }

    console.log(`\n🎉 SUCCESS! Permanent Page Access Token generated for "${pageData.name}"!`);
    console.log(`\nTo update your .env:`);
    console.log(`1. Open .env`);
    console.log(`2. Update: FACEBOOK_PAGE_ACCESS_TOKEN=${pageData.access_token.substring(0, 10)}...[TRUNCATED FOR SECURITY]`);
    
    // Save to a local secure file if requested, or prompt
    const updateEnv = process.argv.includes('--save');
    if (updateEnv) {
      const envPath = path.resolve(process.cwd(), '.env');
      let content = fs.readFileSync(envPath, 'utf8');
      if (content.includes('FACEBOOK_PAGE_ACCESS_TOKEN=')) {
        content = content.replace(/FACEBOOK_PAGE_ACCESS_TOKEN=.*/, `FACEBOOK_PAGE_ACCESS_TOKEN=${pageData.access_token}`);
      } else {
        content += `\nFACEBOOK_PAGE_ACCESS_TOKEN=${pageData.access_token}\n`;
      }
      fs.writeFileSync(envPath, content, 'utf8');
      console.log(`💾 Automatically updated .env with new Page Access Token!`);
    } else {
      console.log(`(Run with --save flag to write directly to .env)`);
    }
  } catch (err) {
    console.error('❌ Error during exchange:', err.message);
  }
}

const command = process.argv[2] || 'test';
if (command === 'test') {
  testToken(process.argv[3]);
} else if (command === 'exchange') {
  exchangeToken(process.argv[3], process.argv[4], process.argv[5]);
} else {
  console.log(`Unknown command: ${command}`);
  console.log(`Available commands: test, exchange`);
}
