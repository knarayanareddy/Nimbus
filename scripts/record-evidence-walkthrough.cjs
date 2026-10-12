// Rehearsed, continuous public browser footage. Cursor/chapter overlays only.
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { chromium } = require('playwright')
const root = path.resolve(process.env.NIMBUS_VIDEO_DIR || path.join(__dirname, '../docs/media/walkthrough-capture'))
const out = path.join(root, 'redo-full-capture')
require('ts-node').register({ project: path.join(__dirname, '../tsconfig.offchain.json') })
const { canonicalJson, verifyReceipt } = require('../lib/evidence')
const { createHash } = require('node:crypto')
const narration = JSON.parse(fs.readFileSync(path.resolve(process.env.NIMBUS_NARRATION_FILE || path.join(__dirname,'../docs/media/demo-v2-narration.json')),'utf8')).segments
const base = process.env.NIMBUS_BASE_URL || 'https://nimbus-worldsfair-2026.hermes-cf-bot.workers.dev'
const pause = ms => new Promise(resolve => setTimeout(resolve, ms)) // editorial choreography, never a success condition
async function main() {
  fs.mkdirSync(out, { recursive: true })
  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1,
    recordVideo: { dir: out, size: { width: 1440, height: 810 } }, reducedMotion: 'no-preference' })
  const origin = performance.now(), startedAt = new Date().toISOString()
  const page = await context.newPage(), events = [], failures = []
  page.on('pageerror', error => failures.push(error.message))
  page.on('response', async response => {
    if (response.url().endsWith('/api/evidence') && response.request().method() === 'POST') {
      events.push({ time: (performance.now() - origin)/1000, type: 'actual-api-response', status: response.status() })
    }
  })
  let closed = false
  try {
    await context.tracing.start({screenshots:true,snapshots:true,sources:false})
    await page.goto(base + '/evidence', { waitUntil: 'networkidle' })
    await page.getByRole('heading', { name: 'Rainfall Evidence Lab' }).waitFor()
    await page.evaluate(() => document.fonts.ready)
    // These additions show the actual mouse events, not invented application states.
    await page.evaluate(() => {
      const pointer = document.createElement('div')
      pointer.id = 'film-cursor'; pointer.setAttribute('aria-hidden','true')
      Object.assign(pointer.style, { position:'fixed', left:'64px', top:'150px', zIndex:'2147483647', pointerEvents:'none', width:'30px', height:'36px', filter:'drop-shadow(0 2px 3px #0009)', transform:'translate(-2px,-2px)' })
      pointer.innerHTML = '<svg viewBox="0 0 30 36" width="30" height="36"><path d="M3 2L3 28L10 21L16 33L22 30L16 18L27 18Z" fill="white" stroke="#0b1220" stroke-width="2" stroke-linejoin="round"/></svg>'
      document.body.appendChild(pointer)
      const chapter = document.createElement('div'); chapter.id='film-chapter'; chapter.setAttribute('aria-hidden','true')
      Object.assign(chapter.style,{ position:'fixed', left:'24px', top:'90px', zIndex:'2147483646', pointerEvents:'none', borderLeft:'3px solid #34d399', padding:'8px 12px', color:'#eefcf7', background:'#07121ee8', borderRadius:'6px', font:'600 15px system-ui', boxShadow:'0 6px 28px #0006' })
      chapter.textContent='Clima Protect / Nimbus'; document.body.appendChild(chapter)
      document.addEventListener('mousemove', e => {pointer.style.left=e.clientX+'px'; pointer.style.top=e.clientY+'px'},true)
      document.addEventListener('mousedown', e => {
        const ring=document.createElement('div'); ring.setAttribute('aria-hidden','true')
        Object.assign(ring.style,{position:'fixed',left:(e.clientX-17)+'px',top:(e.clientY-17)+'px',width:'34px',height:'34px',border:'2px solid #34d399',borderRadius:'50%',pointerEvents:'none',zIndex:'2147483646'})
        document.body.appendChild(ring); const animation=ring.animate([{transform:'scale(.4)',opacity:1},{transform:'scale(1.7)',opacity:0}],{duration:650}); animation.onfinish=()=>ring.remove()
      },true)
    })
    const readyAt=(performance.now()-origin)/1000
    const mark = (type, details={}) => events.push({ time:(performance.now()-origin)/1000, type, ...details })
    async function chapter(text) { await page.evaluate(t => {document.getElementById('film-chapter').textContent=t},text); mark('chapter',{text}) }
    async function moveTo(locator) {
      const box=await locator.boundingBox(); assert.ok(box,'Actual control must be in the viewport')
      const start=await page.evaluate(()=>{const p=document.getElementById('film-cursor');return {x:parseFloat(p.style.left),y:parseFloat(p.style.top)}})
      for(let i=1;i<=30;i++){const t=i/30,e=t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;await page.mouse.move(start.x+(box.x+box.width/2-start.x)*e,start.y+(box.y+box.height/2-start.y)*e);await pause(18)}
      await pause(160)
      return box
    }
    async function click(locator) {const label=await locator.innerText().catch(()=>locator.getAttribute('id'));const b=await moveTo(locator);await page.mouse.click(b.x+b.width/2,b.y+b.height/2);mark('real-click',{target:label})}
    async function scrollTo(locator,top=150) {
      const y=await locator.evaluate((el,t)=>el.getBoundingClientRect().top+window.scrollY-t,top)
      await page.evaluate(y=>window.scrollTo({top:y,behavior:'smooth'}),y)
      await page.waitForFunction(y=>Math.abs(window.scrollY-Math.max(0,Math.min(y,document.documentElement.scrollHeight-innerHeight)))<3,y)
      mark('real-scroll',{target:y})
    }

    const beats=[];let exportedPath,exportedReceipt,badPath;const evidenceRuns=[]
    const save=()=>fs.writeFileSync(path.join(out,'capture-progress.json'),JSON.stringify({source:base,readyAt,events,beats,evidenceRuns,pageErrors:failures},null,2)+'\n')
    async function typeNumber(locator,value){await scrollTo(locator,220);await click(locator);await locator.press('Meta+A');await locator.pressSequentially(String(value),{delay:110});mark('real-input-change',{id:await locator.getAttribute('id'),value});await pause(350)}
    async function replay(){
      const responseEvent=page.waitForResponse(r=>r.url().endsWith('/api/evidence')&&r.request().method()==='POST')
      const button=page.getByRole('button',{name:'Replay historical rainfall',exact:true});await scrollTo(button,300);await click(button)
      const response=await responseEvent;assert.ok(response.ok(),await response.text());const data=await response.json();verifyReceipt(data)
      assert.equal(data.receipt.evidence.provenance,'live-archive');evidenceRuns.push({thresholdMmX100:data.receipt.terms.thresholdMmX100,observedMmX100:data.receipt.result.observedMmX100,triggered:data.receipt.result.triggered,digest:data.digest})
      await page.getByRole('region',{name:'Rainfall replay result'}).waitFor();await scrollTo(page.getByRole('region',{name:'Rainfall replay result'}),150);return data
    }
    async function importFile(file,expectedRole,expectedText){
      const button=page.getByRole('button',{name:'Verify imported receipt',exact:true});await scrollTo(button,225)
      const chooser=page.waitForEvent('filechooser');await click(button);await (await chooser).setFiles(file)
      const state=page.getByRole(expectedRole).filter({hasText:expectedText});await state.waitFor();await scrollTo(state,160);mark('actual-verification-result',{text:await state.innerText(),file:path.basename(file)});return state
    }
    async function beat(id,label,actions,inspect){
      const start=(performance.now()-origin)/1000;await chapter(label);const row={id,label,start,audio:narration[id-1].audio,text:narration[id-1].text,audioDuration:narration[id-1].duration};beats.push(row);save()
      await actions()
      // Natural inspection while narration finishes; no montage or forced freeze.
      while((performance.now()-origin)/1000-start < row.audioDuration+.4){if(inspect)await inspect();else await pause(700)}
      row.end=(performance.now()-origin)/1000;save();console.log('Completed beat',id,label,'duration',(row.end-row.start).toFixed(1))
    }
    const title=page.getByRole('heading',{name:'Rainfall Evidence Lab'})
    await beat(1,'Clima Protect / Nimbus',async()=>{
      await pause(1400);await moveTo(title);await pause(700);await moveTo(page.getByLabel('Region',{exact:true}));await pause(700)
      await moveTo(page.getByLabel('Start date (UTC)',{exact:true}));await pause(600);await moveTo(page.getByLabel('End date (UTC, exclusive)',{exact:true}));await pause(600)
    },async()=>{await moveTo(page.getByLabel('Threshold (mm)',{exact:true}));await pause(700);await moveTo(page.getByLabel('Hypothetical payout (test USDC)',{exact:true}));await pause(650)})
    await beat(2,'1 / Replay real rainfall',async()=>{
      const method=page.getByLabel('Index method',{exact:true});await scrollTo(method,175);await click(method);await method.press('Escape');await method.selectOption('Sum');await pause(450)
      await typeNumber(page.getByLabel('Threshold (mm)',{exact:true}),80);const a=await replay();assert.equal(a.receipt.result.observedMmX100,460);assert.equal(a.receipt.result.triggered,true)
      await moveTo(page.getByText('4.60 mm',{exact:true}));await pause(900)
    },async()=>{await moveTo(page.getByRole('cell',{name:'2026-09-04',exact:true}));await pause(500);await moveTo(page.getByRole('cell',{name:'0.10',exact:true}).first());await pause(600)})
    await beat(3,'2 / Compare the policy terms',async()=>{
      await typeNumber(page.getByLabel('Threshold (mm)',{exact:true}),3);const b=await replay();assert.equal(b.receipt.result.observedMmX100,460);assert.equal(b.receipt.result.triggered,false)
      await moveTo(page.getByText('Threshold not met',{exact:true}));await pause(900)
      await typeNumber(page.getByLabel('Threshold (mm)',{exact:true}),80);const c=await replay();assert.equal(c.receipt.result.triggered,true);await moveTo(page.getByText('Threshold met',{exact:true}));await pause(800)
    })
    await beat(4,'3 / Inspect and export the evidence',async()=>{
      const provenance=page.getByRole('heading',{name:'Evidence provenance'});await scrollTo(provenance,155);await moveTo(provenance);await pause(500)
      await moveTo(page.getByText('Source / model',{exact:true}));await pause(800);await moveTo(page.getByText('Queried coordinates',{exact:true}));await pause(800)
      await moveTo(page.getByText('SHA-256 receipt digest',{exact:true}));await pause(600)
      const event=page.waitForEvent('download');await click(page.getByRole('button',{name:'Download receipt',exact:true}));const downloaded=await event;exportedPath=path.join(out,downloaded.suggestedFilename());await downloaded.saveAs(exportedPath);assert.equal(await downloaded.failure(),null)
      exportedReceipt=JSON.parse(fs.readFileSync(exportedPath,'utf8'));verifyReceipt(exportedReceipt);mark('actual-download',{filename:downloaded.suggestedFilename(),digest:exportedReceipt.digest})
      const bad=JSON.parse(JSON.stringify(exportedReceipt));bad.receipt.result.observedMmX100=99999;bad.digest=createHash('sha256').update(canonicalJson(bad.receipt)).digest('hex');assert.throws(()=>verifyReceipt(bad));badPath=path.join(out,'tampered-receipt-rehashed.json');fs.writeFileSync(badPath,JSON.stringify(bad,null,2)+'\n')
    },async()=>{await moveTo(page.getByText('Grid coordinates · timezone · units',{exact:true}));await pause(750);await moveTo(page.getByText('SHA-256 receipt digest',{exact:true}));await pause(650)})
    await beat(5,'4 / Verify — and reject a forged result',async()=>{
      const valid=await importFile(exportedPath,'status','Receipt verified');await moveTo(valid);await pause(1100)
      const invalid=await importFile(badPath,'alert','independent replay');await moveTo(invalid);await pause(1600)
      assert.equal(await page.getByRole('region',{name:'Rainfall replay result'}).count(),0)
    },async()=>{await moveTo(page.getByRole('alert').filter({hasText:'independent replay'}));await pause(800)})
    await beat(6,'5 / From verified terms to a quote',async()=>{
      await importFile(exportedPath,'status','Receipt verified')
      const link=page.getByRole('link',{name:'Continue to buy settings',exact:true});await scrollTo(link,350);await click(link);await page.getByRole('heading',{name:'Buy Parametric Cover'}).waitFor();mark('actual-policy-handoff',{url:page.url()})
      assert.match(page.url(),/region=KEN-NRB-001/);assert.match(page.url(),/threshold=80/);assert.match(page.url(),/payout=500/)
      const headings=['Select peril type','Choose index method','Set observation window','Set threshold & payout']
      for(const heading of headings){const next=page.getByRole('button',{name:'Continue',exact:true});await scrollTo(next,380);await click(next);await page.getByRole('heading',{name:heading,exact:true}).waitFor();await scrollTo(page.getByRole('heading',{name:heading,exact:true}),175);await pause(650)}
      const responseEvent=page.waitForResponse(r=>r.url().includes('/api/quotes/calculate?'))
      const quote=page.getByRole('button',{name:'Get Quote',exact:true});await scrollTo(quote,350);await click(quote);const response=await responseEvent;assert.ok(response.ok());const pricing=await response.json();assert.equal(pricing.premium,23)
      await page.getByRole('heading',{name:/Review/}).waitFor();await scrollTo(page.getByRole('heading',{name:/Review/}),170);mark('actual-quote-response',{premium:pricing.premium,url:response.url()});fs.writeFileSync(path.join(out,'actual-quote-response.json'),JSON.stringify(pricing,null,2)+'\n')
    })
    await beat(7,'Clima Protect / Verifiable climate protection',async()=>{
      await moveTo(page.getByRole('heading',{name:/Review/}));await pause(900)
    },async()=>{
      const card=page.getByText('23',{exact:true});if(await card.count())await moveTo(card.first());else await page.mouse.move(820,445,{steps:24});await pause(850)
      await page.mouse.move(1025,585,{steps:28});await pause(850)
      await page.mouse.wheel(0,120);await pause(500);await page.mouse.wheel(0,-120);await pause(500)
    })
    const finishedAt=(performance.now()-origin)/1000;assert.deepEqual(failures,[]) // render trim ends here, before trace-stop/video-close overhead
    const video=page.video();await context.tracing.stop({path:path.join(out,'actual-interactions.trace.zip')});await context.close();closed=true;const raw=await video.path()
    const summary={source:base,startedAt,kind:'continuous-real-browser-playthrough',raw,readyAt,finishedAt,usableSeconds:finishedAt-readyAt,beats,events,evidenceRuns,exportedReceiptDigest:exportedReceipt.digest,pageErrors:failures,noApiMocks:true,noScreenshotInputs:true,filmingOverlays:['actual-event cursor/ripples','chapter labels'],productionNotes:'Separate written judges notes retain deployment/oracle/pricing/security limits; no purchase click or wallet signing was simulated.'}
    fs.writeFileSync(path.join(out,'capture-summary.json'),JSON.stringify(summary,null,2)+'\n');console.log(JSON.stringify({raw,seconds:summary.usableSeconds,beats:beats.length,evidenceRuns,verifiedDownload:exportedReceipt.digest}))
  }catch(error){savePartial(error);throw error}finally{if(!closed)await context.close();await browser.close()}
  function savePartial(error){fs.writeFileSync(path.join(out,'capture-failure.json'),JSON.stringify({error:error.message,events,pageErrors:failures},null,2)+'\n')}
}
main().catch(error=>{console.error(error);process.exit(1)})
