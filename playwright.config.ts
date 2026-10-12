import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser', timeout:30000, fullyParallel:true, workers:3,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:'http://127.0.0.1:4173',trace:'retain-on-failure',screenshot:'only-on-failure',...devices['Desktop Chrome'],channel:'chrome',launchOptions:{args:['--disable-gpu']}},
 webServer:{command:'npm run preview',url:'http://127.0.0.1:4173',reuseExistingServer:true,timeout:60000},
});
