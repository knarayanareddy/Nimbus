const fs=require('node:fs')
const path=require('node:path')
const http=require('node:http')
const assert=require('node:assert/strict')
const {chromium}=require('playwright')
const root=path.resolve(__dirname,'..'),output=path.resolve(process.env.NIMBUS_DEMO_CHECK_DIR || path.join(root,'test-results','demo-media'))
async function main(){
 fs.mkdirSync(output,{recursive:true})
 let server;let base=process.env.NIMBUS_ASSET_BASE_URL
 if(!base){
  server=http.createServer((req,res)=>{
   const url=new URL(req.url,'http://localhost');const file=path.join(root,'public',url.pathname==='/'?'clima-protect-demo.html':url.pathname)
   if(!file.startsWith(path.join(root,'public')+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return}
   const size=fs.statSync(file).size,mime={'.html':'text/html','.mp4':'video/mp4','.vtt':'text/vtt','.srt':'text/plain','.pdf':'application/pdf'}[path.extname(file)]||'application/octet-stream'
   res.setHeader('Content-Type',mime);res.setHeader('Accept-Ranges','bytes')
   const range=/bytes=(\d+)-(\d*)/.exec(req.headers.range||'')
   if(range){const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),size-1):size-1;res.writeHead(206,{'Content-Range':`bytes ${start}-${end}/${size}`,'Content-Length':end-start+1});fs.createReadStream(file,{start,end}).pipe(res)}
   else{res.writeHead(200,{'Content-Length':size});fs.createReadStream(file).pipe(res)}
  });await new Promise(r=>server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${server.address().port}`
 }
 const browser=await chromium.launch(),results=[]
 try{
  for(const viewport of [{width:1280,height:900},{width:390,height:844}]){
   const page=await browser.newPage({viewport}),errors=[];page.on('pageerror',e=>errors.push(e.message))
   await page.goto(base+'/clima-protect-demo.html')
   await page.waitForFunction(()=>{const v=document.getElementById('demo');return v&&v.readyState>=1&&v.textTracks.length===1})
   const meta=await page.evaluate(()=>{const v=document.getElementById('demo');return {src:v.currentSrc,sourcePath:v.dataset.source,duration:v.duration,width:v.videoWidth,height:v.videoHeight,captionTracks:v.textTracks.length,provider:document.body.innerText.includes('ElevenLabs'),overflow:document.documentElement.scrollWidth>innerWidth}})
   assert.ok(meta.src.startsWith('blob:'));assert.equal(meta.sourcePath,'/clima-protect-demo-v2.mp4');assert.ok(Math.abs(meta.duration-111.7)<.15);assert.equal(meta.width,1440);assert.equal(meta.height,810);assert.equal(meta.captionTracks,1);assert.ok(meta.provider);assert.equal(meta.overflow,false)
   await page.evaluate(async()=>{const v=document.getElementById('demo');v.muted=true;await v.play()});await page.waitForFunction(()=>document.getElementById('demo').currentTime>1)
   await page.getByRole('button',{name:'Policy quote',exact:true}).click();await page.waitForFunction(()=>document.getElementById('demo').currentTime>80&&document.getElementById('demo').currentTime<90)
   await page.evaluate(async()=>{const v=document.getElementById('demo');v.pause();v.currentTime=95;v.textTracks[0].mode='showing';await new Promise(r=>v.addEventListener('seeked',r,{once:true}))})
   await page.waitForFunction(()=>{const t=document.getElementById('demo').textTracks[0];return t.cues&&t.cues.length===30})
   if(viewport.width===1280)await page.locator('video').screenshot({path:path.join(output,'redo-player-caption-review.png')})
   assert.deepEqual(errors,[]);results.push({viewport,...meta,playback:true,chapterSeek:true,cues:30});await page.close()
  }
  fs.writeFileSync(path.join(output,process.env.NIMBUS_ASSET_BASE_URL?'redo-public-player-check.json':'redo-local-player-check.json'),JSON.stringify(results,null,2)+'\n');console.log(JSON.stringify({base,checks:results}))
 }finally{await browser.close();if(server)await new Promise(r=>server.close(r))}
}
main().catch(e=>{console.error(e);process.exit(1)})
