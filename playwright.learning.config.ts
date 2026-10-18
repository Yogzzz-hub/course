import { defineConfig } from '@playwright/test';
import { loadEnvFile } from 'node:process';
import { existsSync } from 'node:fs';
if(existsSync('.env.learning.local'))loadEnvFile('.env.learning.local');
export default defineConfig({
  testDir:'./tests/learning-browser',fullyParallel:false,workers:1,timeout:45000,
  outputDir:'./test-results-learning',
  expect:{timeout:15000},
  reporter:[['list'],['html',{outputFolder:'playwright-report/learning',open:'never'}]],
  // Functional API journeys do not need decorative animation; motion has its own browser suite.
  use:{baseURL:'http://127.0.0.1:5174',channel:'chrome',reducedMotion:'reduce',launchOptions:{args:['--disable-gpu']},trace:'retain-on-failure',screenshot:'only-on-failure'},
  webServer:[
    {command:'node server/index.ts',url:'http://127.0.0.1:8788/api/learning/health',env:{APP_ORIGIN:'http://127.0.0.1:5174',PORT:'8788'},timeout:30000,reuseExistingServer:false},
    {command:'npm run dev -- --port 5174 --strictPort',url:'http://127.0.0.1:5174',env:{VITE_LEARNING_PROXY_TARGET:'http://127.0.0.1:8788'},timeout:30000,reuseExistingServer:false},
  ],
});
