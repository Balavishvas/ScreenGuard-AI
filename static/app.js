const video=document.querySelector('#video'),canvas=document.querySelector('#canvas'),empty=document.querySelector('#empty');
const connection=document.querySelector('#connection'),riskEl=document.querySelector('#risk'),meter=document.querySelector('#meter'),statusEl=document.querySelector('#status');
const findingsEl=document.querySelector('#findings'),eventsEl=document.querySelector('#events'),countEl=document.querySelector('#count'),summary=document.querySelector('#summary'),source=document.querySelector('#source'),fps=document.querySelector('#fps'),stage=document.querySelector('.stage');
let stream=null, socket=null, timer=null, mode='camera', busy=false, lastRisk=-1;

function logEvent(text, level='info'){const row=document.createElement('div');row.className='event';row.innerHTML='<b>'+new Date().toLocaleTimeString([], {hour12:false})+'</b><span>'+text+'</span>';eventsEl.prepend(row);while(eventsEl.children.length>5)eventsEl.lastElementChild.remove();}

function render(data){
  const risk=Number(data.risk)||0; riskEl.textContent=risk; meter.style.width=risk+'%';
  meter.style.background=risk>=65?'var(--danger)':risk>0?'var(--amber)':'var(--acid)';
  statusEl.textContent=data.status||'CLEAR'; countEl.textContent=data.findings?.length||0;
  summary.textContent=risk===0?'No obvious sensitive content in the latest frame.':risk>=65?'Something visible deserves attention before you share this feed.':'A possible exposure is visible. Take a quick look.';
  findingsEl.innerHTML='';
  if(!data.findings?.length){findingsEl.innerHTML='<div class="muted">Nothing suspicious in the latest frame.</div>'}
  else data.findings.forEach(f=>{const d=document.createElement('div');d.className='finding';d.innerHTML='<strong>'+f.kind+'</strong><span class="confidence">'+f.confidence+'%</span><small>'+escapeHtml(f.detail)+'</small>';findingsEl.appendChild(d)});
  if(lastRisk!==risk && data.findings?.length){logEvent((data.findings[0].kind||'Finding')+' detected');lastRisk=risk}
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

async function start(){
  stop();
  try{
    stream=mode==='camera'?await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720}},audio:false}):await navigator.mediaDevices.getDisplayMedia({video:true,audio:false});
    video.srcObject=stream; await video.play(); empty.style.display='none'; stage.classList.add('live'); connection.parentElement.classList.add('live');
    source.textContent='source: '+(mode==='camera'?'camera':'shared screen'); fps.textContent='live';
    socket=new WebSocket((location.protocol==='https:'?'wss://':'ws://')+location.host+'/ws/analyze');
    socket.onopen=()=>{connection.textContent='local analysis';logEvent('Local detector connected')};
    socket.onmessage=e=>{busy=false;render(JSON.parse(e.data))};
    socket.onerror=()=>logEvent('Detector connection error');
    timer=setInterval(sendFrame,900);
  }catch(err){logEvent('Feed permission was cancelled');stop()}
}
function sendFrame(){if(!socket||socket.readyState!==1||busy||video.readyState<2)return;busy=true;canvas.width=Math.min(video.videoWidth,1280);canvas.height=Math.round(video.videoHeight*(canvas.width/video.videoWidth));const c=canvas.getContext('2d');c.drawImage(video,0,0,canvas.width,canvas.height);socket.send(canvas.toDataURL('image/jpeg',.72))}
function stop(){if(timer)clearInterval(timer);timer=null;if(socket){socket.close();socket=null}if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}video.srcObject=null;stage.classList.remove('live');empty.style.display='grid';fps.textContent='idle';source.textContent='source: —';connection.textContent='local session';connection.parentElement.classList.remove('live');riskEl.textContent='0';meter.style.width='0';statusEl.textContent='READY';findingsEl.innerHTML='<div class="muted">No findings yet.</div>';summary.textContent='Start a feed to run the local detector.';busy=false;lastRisk=-1}
document.querySelectorAll('.mode').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.mode').forEach(x=>x.classList.remove('active'));btn.classList.add('active');mode=btn.dataset.mode;start()}));
document.querySelector('#stop').addEventListener('click',stop);
