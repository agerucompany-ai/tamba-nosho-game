// =====================================================================
// v84: オープニング(目標とゲームの説明) + 画面のUIを光らせるチュートリアル
//  研究メモ(各作品の最初の5分):
//  - 牧場物語 再会のミネラルタウン: 町長が出迎え→「この牧場を任せる」を数タップ→すぐ操作。細かい遊び方は必要になった時に。
//  - 牧場物語 オリーブタウン: 町長ビクターが10タップ前後で「町を盛り上げてほしい」と目的を言い→畑に出て道具はその場の吹き出し。
//  - あつまれどうぶつの森: たぬきちが移住の理由→最初の目標(テント・DIY)を1つだけ渡す。案内役は常に同じ人。
//  - ルーンファクトリー: 案内役が「なぜここにいるか」を短く→畑で実際に操作しながら覚える。
//  共通の型: ①案内役が「なぜ来たか」「何を目指すか」を短く ②遊び方は実物のボタンを指して数枚 ③最初の目標を1つ手渡して即操作。
//  → 合計12タップ(1文 50字前後)。いつでもスキップ可。メニューからもう一度見られる。
// =====================================================================
(function(){
const DESK=()=>typeof IS_DESKTOP!=='undefined'&&IS_DESKTOP;
const CSS=`
#v84op{position:fixed;inset:0;z-index:70;display:none;user-select:none;-webkit-user-select:none;cursor:pointer;}
#v84op.on{display:block;}
#v84spot{position:fixed;border-radius:18px;box-shadow:0 0 0 200vmax rgba(14,24,10,.62);transition:left .35s,top .35s,width .35s,height .35s,border-radius .35s,box-shadow .35s;pointer-events:none;}
#v84spot.hl{outline:3px solid #ffd23e;outline-offset:2px;animation:v84sp 1.1s ease-in-out infinite;}
#v84spot.dark{box-shadow:0 0 0 200vmax rgba(14,24,10,.74);}
@keyframes v84sp{50%{outline-color:#fff6b0;outline-offset:6px;}}
#v84fing{position:fixed;font-size:34px;line-height:1;pointer-events:none;display:none;filter:drop-shadow(0 3px 3px rgba(0,0,0,.35));}
#v84fing.u{animation:v84fu .8s ease-in-out infinite;} #v84fing.d{animation:v84fd .8s ease-in-out infinite;}
#v84fing.l{animation:v84fl .8s ease-in-out infinite;} #v84fing.r{animation:v84fr .8s ease-in-out infinite;}
@keyframes v84fu{50%{transform:translateY(-8px);}} @keyframes v84fd{50%{transform:translateY(8px);}}
@keyframes v84fl{50%{transform:translateX(-8px);}} @keyframes v84fr{50%{transform:translateX(8px);}}
#v84skip{position:absolute;right:10px;top:-15px;z-index:3;pointer-events:auto;font-family:inherit;font-weight:800;font-size:11.5px;line-height:1;color:#fff;background:rgba(60,40,20,.78);border:2px solid #fff;border-radius:999px;padding:6px 11px;cursor:pointer;box-shadow:0 2px 0 rgba(0,0,0,.25);}
#v84card{position:fixed;left:50%;top:calc(58px + env(safe-area-inset-top));transform:translateX(-50%);width:min(92vw,440px);max-height:calc(100% - 330px - env(safe-area-inset-top) - env(safe-area-inset-bottom));overflow:hidden;display:none;background:linear-gradient(#fffef6,#fbf0d9);border:3px solid #fff;border-radius:20px;box-shadow:0 0 0 2px rgba(138,90,43,.45),0 14px 30px rgba(0,0,0,.35);padding:12px 14px;color:#4a2e12;text-align:center;}
#v84card.on{display:block;animation:v84in .35s ease;}
@keyframes v84in{from{opacity:0;transform:translate(-50%,10px);}to{opacity:1;transform:translate(-50%,0);}}
#v84card h3{font-size:15px;font-weight:800;color:#2e7a28;margin:0 0 6px;letter-spacing:.04em;}
#v84card img.grp{width:100%;max-height:26vh;object-fit:contain;display:block;margin:0 auto;}
#v84card .lead{font-size:12.5px;font-weight:700;margin-top:4px;line-height:1.5;}
#v84card .cyc{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:3px 2px;font-size:13px;font-weight:800;margin:4px 0;}
#v84card .cyc span.n{background:#fff;border:2px solid #e6d3a8;border-radius:12px;padding:4px 7px;white-space:nowrap;}
#v84card .cyc span.a{color:#c07a20;font-size:13px;}
#v84card .gl{display:flex;align-items:center;gap:8px;text-align:left;background:#fff;border:2px solid #e6d3a8;border-radius:12px;padding:6px 10px;margin:5px 0;font-size:13.5px;font-weight:800;}
#v84card .gl .ic{font-size:22px;flex:0 0 auto;}
#v84card .gl small{display:block;font-size:11px;color:#8a6a45;font-weight:700;}
#v84card .note{font-size:11.5px;color:#8a6a45;font-weight:700;margin-top:6px;}
#v84box{position:fixed;left:10px;right:10px;bottom:calc(128px + env(safe-area-inset-bottom));max-width:560px;margin:0 auto;display:flex;align-items:flex-end;pointer-events:none;}
#v84img{width:104px;height:104px;object-fit:contain;flex:0 0 auto;margin-right:-20px;position:relative;z-index:2;filter:drop-shadow(0 4px 6px rgba(0,0,0,.35));}
#v84body{flex:1;min-width:0;background:linear-gradient(#fffef8,#fbf0d9);border:3px solid #fff;border-radius:18px;padding:12px 14px 20px 28px;box-shadow:0 0 0 2px rgba(138,90,43,.45),0 10px 24px rgba(0,0,0,.35);min-height:96px;position:relative;}
#v84name{display:inline-block;background:linear-gradient(#ffa95e,#ec7a2e);color:#fff;font-weight:800;font-size:12px;padding:3px 12px;border-radius:999px;margin:-25px 0 5px -8px;box-shadow:0 2px 0 #b2531a;border:2px solid #fff;white-space:nowrap;}
#v84text{font-size:14.5px;line-height:1.6;color:#4a2e12;font-weight:700;min-height:46px;}
#v84text b{color:#c0561a;}
#v84next{position:absolute;right:12px;bottom:4px;font-size:11px;font-weight:800;color:#b2531a;animation:v84fd .9s ease-in-out infinite;}
#v84dots{position:absolute;left:28px;bottom:6px;display:flex;gap:3px;}
#v84dots i{width:6px;height:6px;border-radius:50%;background:#e6d3a8;display:block;}
#v84dots i.on{background:#ec7a2e;}
@media (max-height:640px){#v84card img.grp{max-height:20vh;} #v84img{width:84px;height:84px;} #v84box{bottom:calc(112px + env(safe-area-inset-bottom));}}
`;
const NAME={atsushi:'あつし  ·  牧場',yusuke:'ゆうすけ  ·  牧草・栗・米',naoto:'なおと  ·  加工・堆肥'};
function steps(replay){
  const d=DESK();
  const S=[
   {g:'atsushi',card:'welcome',t:'ようこそ丹波へ！丹波農商で牧場をやってる<b>あつし</b>だ。都会から農業をしに来てくれたんだってな。'},
   {g:'atsushi',card:'welcome',t:'この田んぼと元手の<b>1,000万円</b>。今日から君に、丹波農商の新しい農場をまかせるぞ！'},
   {g:'yusuke',card:'cycle',t:'ゆうすけです。丹波は<b>牛・米・牧草・堆肥・栗</b>がぐるっとつながる農業ができる土地なんだ。'},
   {g:'atsushi',card:'goal',t:'目指すは<b>丹波いちばんの農場</b>！この4つがそろえばゴールだ。8つの章で順番に案内するぜ。'},
   {g:'naoto',hl:'player',t:d?'加工と堆肥のなおと。遊び方を説明するね。<b>クリックした場所へ歩く</b>よ。WASDでも動ける。':'加工と堆肥のなおと。遊び方を説明するね。<b>画面を指でなぞると歩く</b>。ちょんとタップした場所へも歩くよ。'},
   {g:'naoto',hl:'#useBtn',t:d?'物や人に近づいて<b>「使う」</b>(Eキー)で作業。餌やりも田植えも加工も、ぜんぶこれ！':'物や人に近づいて<b>「使う」</b>を押すと作業する。餌やりも田植えも加工も、ぜんぶこのボタン！'},
   {g:'naoto',hl:'#weekBtn',t:'時間は自分で進めるよ。<b>「次の週へ」</b>で1週間たつ。その週の作業が済んでから押せばOK。'},
   {g:'yusuke',hl:'#day',t:'いまは<b>1年目の4月1週</b>。季節で作業が変わるよ。田植えは春、牧草刈りは5月と9月、稲刈りは10月。'},
   {g:'naoto',hl:'#money',t:'最初の稼ぎは<b>🥔ポテサラ加工</b>。大倉庫で週1回作って売れる。これが元手を増やす第一歩！'},
   {g:'naoto',hl:'#quest',t:'迷ったら<b>画面の上</b>を見て。いまの目標が出る。<b>光る矢印と足元の道しるべ</b>の先で「使う」だよ。'},
   {g:'naoto',hl:'#menuOpenBtn',t:'<b>メニュー</b>ではお金・牛・機械を見られる。押すボタンは光って教えるよ。この説明もここから見直せる。'},
   replay?{g:'naoto',t:'説明はここまで！いまの目標は<b>画面の上</b>に出ているよ。がんばってね！'}
         :{g:'naoto',t:'じゃあ最初の仕事！東の<b>大倉庫で🥔ポテサラ</b>を作って売ろう。光る矢印について行ってね！'},
  ];
  return S;
}
let E=null,cur=null;
function el(id){return document.getElementById(id);}
function build(){
  if(E)return;
  const st=document.createElement('style');st.textContent=CSS;document.head.appendChild(st);
  const o=document.createElement('div');o.id='v84op';
  o.innerHTML='<div id="v84spot"></div><div id="v84fing"></div><div id="v84card"></div>'+
    '<div id="v84box"><img id="v84img" alt=""><div id="v84body"><div id="v84name"></div><div id="v84text"></div><div id="v84dots"></div><div id="v84next">▼ タップで次へ</div><button id="v84skip">スキップ ▶▶</button></div></div>';
  document.body.appendChild(o);
  E={o,spot:el('v84spot'),fing:el('v84fing'),card:el('v84card'),img:el('v84img'),name:el('v84name'),text:el('v84text'),dots:el('v84dots'),skip:el('v84skip')};
  o.addEventListener('pointerdown',e=>{e.stopPropagation();});
  o.addEventListener('touchstart',e=>{e.stopPropagation();},{passive:true});
  o.addEventListener('click',e=>{e.stopPropagation();if(e.target===E.skip)return;advance();});
  E.skip.addEventListener('click',e=>{e.stopPropagation();finish(true);});
  // 説明中はゲームのキー操作を止める(Enter/スペースで次へ)
  addEventListener('keydown',e=>{if(!cur)return;e.stopImmediatePropagation();e.preventDefault();
    if(e.key==='Enter'||e.key===' '||e.code==='Space')advance();else if(e.key==='Escape')finish(true);},true);
}
function cardHTML(k){
  if(k==='welcome')return '<h3>🌾 丹波農商 牧場物語</h3><img class="grp" src="art/title_chars_nh.webp" alt=""><div class="lead">兵庫県丹波市の「リアル牧場物語」。<br>あなたは新しく農業をはじめに来た新人です。</div>';
  if(k==='cycle')return '<h3>♻ 丹波の循環型農業</h3><div class="cyc"><span class="n">🐂 牛</span><span class="a">→フン→</span><span class="n">🏭 堆肥</span><span class="a">→</span><span class="n">🌾 米・🌿 牧草</span><span class="a">→エサ→</span><span class="n">🐂 牛</span></div>'+
    '<div class="cyc"><span class="n">🌰 栗</span><span class="n">🥔 加工</span><span class="n">🍚 精米</span><span class="a">で売って稼ぐ</span></div><div class="lead">ひとつの事業のあまりが、次の事業の元になる。<br>これを全部まわせる農場が目標です。</div>';
  if(k==='goal'){
    // 最終章(第8章)の目標と同じ物(V83_Qから取る)
    const pick=id=>{try{return V83_Q.find(q=>q.id===id).s;}catch(e){return '';}};
    const row=(id,sub)=>{const s=pick(id);const m=s.match(/^(\S+)\s(.*)$/)||[0,'',s];return '<div class="gl"><span class="ic">'+m[1]+'</span><div>'+m[2]+'<small>'+sub+'</small></div></div>';};
    return '<h3>🏆 ゴール(第8章 丹波いちばんの農場へ)</h3>'+row('land','🌰栗園・棚田などを不動産屋で')+row('newBarn','北の第二牛舎か新築牛舎')+row('cows10','セリで買い足して10頭体制')+row('cert','加工以外の売上 累計2,000万円〜')+
      '<div class="note">第1章「ポテサラと田植え」から1つずつ案内します</div>';
  }
  return '';
}
function rectOf(sel){
  if(sel==='player'){
    try{const v=new THREE.Vector3(player.x,player.y+0.9,player.z).project(camera);
      const x=(v.x+1)/2*innerWidth,y=(1-v.y)/2*innerHeight;return {left:x-46,top:y-70,width:92,height:120,round:true};}catch(e){return null;}
  }
  const n=document.querySelector(sel);if(!n||!n.offsetParent&&getComputedStyle(n).position!=='fixed')return null;
  const r=n.getBoundingClientRect();if(!r.width)return null;
  return {left:r.left,top:r.top,width:r.width,height:r.height,round:sel==='#useBtn'};
}
function place(){
  if(!cur)return;
  const s=cur.list[cur.i];const r=s.hl?rectOf(s.hl):null;
  const sp=E.spot,f=E.fing;
  if(r){const p=6;sp.className='hl';sp.style.left=(r.left-p)+'px';sp.style.top=(r.top-p)+'px';sp.style.width=(r.width+p*2)+'px';sp.style.height=(r.height+p*2)+'px';sp.style.borderRadius=r.round?'50%':'16px';
    // 指さし: 上半分の物は下から👆、下の物は横から
    const cx=r.left+r.width/2,cy=r.top+r.height/2;f.style.display='block';
    if(cy<innerHeight*0.5){f.className='u';f.textContent='👆';f.style.left=(Math.min(innerWidth-44,Math.max(4,cx-17)))+'px';f.style.top=(r.top+r.height+10)+'px';}
    else if(s.hl==='player'){f.className='d';f.textContent='👇';f.style.left=(cx-17)+'px';f.style.top=(r.top-40)+'px';}
    else if(cx>innerWidth*0.6){f.className='l';f.textContent='👉';f.style.left=(r.left-48)+'px';f.style.top=(cy-17)+'px';}
    else{f.className='r';f.textContent='👈';f.style.left=(r.left+r.width+10)+'px';f.style.top=(cy-17)+'px';}
  }else{sp.className=s.card?'dark':'';sp.style.left='50%';sp.style.top='50%';sp.style.width='0px';sp.style.height='0px';f.style.display='none';}
}
let typeT=null,placeRaf=0;
function show(){
  const s=cur.list[cur.i];
  try{hideTalk();}catch(e){}
  E.img.src='art/p_'+s.g+'.webp';E.name.textContent=NAME[s.g]||s.g;
  E.dots.innerHTML=cur.list.map((_,k)=>'<i class="'+(k<=cur.i?'on':'')+'"></i>').join('');
  if(s.card){const h=cardHTML(s.card);if(E.card.dataset.k!==s.card){E.card.innerHTML=h;E.card.dataset.k=s.card;E.card.classList.remove('on');void E.card.offsetWidth;}E.card.classList.add('on');}
  else{E.card.classList.remove('on');E.card.dataset.k='';}
  place();
  // 文字送り(1秒に約40字)。途中タップで全文
  clearInterval(typeT);const full=s.t;const plain=full.replace(/<[^>]+>/g,'');let n=0;cur.typing=true;
  const render=k=>{let out='',c=0;for(const part of full.split(/(<[^>]+>)/)){if(part.startsWith('<')){out+=part;continue;}if(c>=k)continue;out+=part.slice(0,k-c);c+=part.length;}return out;};
  E.text.innerHTML='';
  typeT=setInterval(()=>{n+=2;E.text.innerHTML=render(n);if(n>=plain.length){clearInterval(typeT);cur.typing=false;}},50);
  try{if(cur.i>0)sfx(660,.04);}catch(e){}
}
function advance(){
  if(!cur)return;
  if(cur.typing){clearInterval(typeT);E.text.innerHTML=cur.list[cur.i].t;cur.typing=false;return;}
  cur.i++;if(cur.i>=cur.list.length){finish(false);return;}
  show();
}
function loop(){if(!cur)return;place();placeRaf=requestAnimationFrame(loop);}
function finish(skipped){
  if(!cur)return;const c=cur;cur=null;clearInterval(typeT);cancelAnimationFrame(placeRaf);
  E.o.classList.remove('on');E.card.classList.remove('on');
  window.v84Active=false;window.v84Hold=false;
  try{localStorage.setItem('tamba_v84_op','1');}catch(e){}
  if(!c.replay){
    // 最初の目標(第1章)を手渡す: 章カード→ナビ開始
    try{const qv=v83QState();qv.ch[1]=1;const q=v83Current();if(q)qv.said[q.id]=1;}catch(e){}
    try{v83Banner('第1章',V83_CHAPTERS[0].t,true);}catch(e){}
    setTimeout(()=>{try{toast(skipped?'📖 ゲームの説明はメニューからいつでも見られるよ':'🎯 画面上の目標と光る矢印について行こう！');}catch(e){}},1800);
    if(DESK())setTimeout(()=>{try{showPCGuide();}catch(e){}},2600);
  }
  try{updateQuest();}catch(e){}
}
// 公開: 説明を始める(replay=メニューから見直し)
window.v84Opening=function(replay){
  build();if(cur)return;
  try{closeMenu();}catch(e){}
  try{hidePCGuide();}catch(e){}
  window.v84Active=true;window.v84Hold=true;
  cur={i:0,list:steps(!!replay),replay:!!replay,typing:false};
  E.o.classList.add('on');show();loop();
};
// 読み込み完了時に呼ぶ(新規=オープニング / 続きから=初回だけ小さく案内)
window.v84AfterLoad=function(isNew){
  if(isNew){setTimeout(()=>window.v84Opening(false),500);return true;}
  let seen=null;try{seen=localStorage.getItem('tamba_v84_tip');}catch(e){}
  if(!seen){try{localStorage.setItem('tamba_v84_tip','1');}catch(e){}
    setTimeout(()=>{try{toast('📖 ゲームの説明は「メニュー」→「ゲームの説明をもう一度見る」で見られるよ');}catch(e){}},4200);}
  return false;
};
// 説明中は章の導入会話・NPCの話しかけを出さない(説明が終わってから第1章を渡す)
if(typeof v83UpdateQuest==='function'){
  const orig=v83UpdateQuest;
  window.v83UpdateQuest=function(){
    if(window.v84Hold&&typeof state!=='undefined'&&state){try{const qv=v83QState();const q=v83Current();if(q){qv.ch[q.ch]=1;qv.said[q.id]=1;}}catch(e){}}
    return orig.apply(this,arguments);
  };
}
})();
