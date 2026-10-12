import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('docs/audits',{recursive:true});
const chrome=await launch({chromePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',chromeFlags:['--headless','--disable-gpu']});
try{
 for(const [label,path,desktop] of [['home-mobile','/',false],['programme-mobile','/programmes/python-full-stack',false],['home-desktop','/',true]]){
  const result=await lighthouse(`http://127.0.0.1:4173${path}`,{port:chrome.port,output:'json',logLevel:'error',onlyCategories:['performance','accessibility','best-practices','seo'],...(desktop?{formFactor:'desktop',screenEmulation:{mobile:false,width:1440,height:1000,deviceScaleFactor:1,disabled:false},throttling:{rttMs:40,throughputKbps:10240,cpuSlowdownMultiplier:1,requestLatencyMs:0,downloadThroughputKbps:0,uploadThroughputKbps:0}}:{})});
  await writeFile(`docs/audits/${label}.json`,result.report);
  console.log(JSON.stringify({label,scores:Object.fromEntries(Object.entries(result.lhr.categories).map(([key,value])=>[key,value.score])),LCP:result.lhr.audits['largest-contentful-paint'].displayValue,CLS:result.lhr.audits['cumulative-layout-shift'].displayValue,TBT:result.lhr.audits['total-blocking-time'].displayValue,failed:Object.entries(result.lhr.audits).filter(([,v])=>v.score!==null&&v.score<.9).map(([key,v])=>({key,title:v.title,description:v.displayValue}))}));
 }
}finally{await chrome.kill();}
