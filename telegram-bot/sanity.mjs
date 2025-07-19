// sanity.mjs
import dotenv from 'dotenv';
dotenv.config();

import { createClient } from '@sanity/client';

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  useCdn: false,
  apiVersion: '2025-06-30',
});

if (!process.env.SANITY_PROJECT_ID || !process.env.SANITY_DATASET) {
  throw new Error('Missing SANITY_PROJECT_ID or SANITY_DATASET in environment variables');
}

export default client;
