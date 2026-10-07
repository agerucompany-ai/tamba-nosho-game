// =====================================================================
// v83: 章立てメインクエスト + ナビ(道しるべ・目的地マーカー・方角矢印) + 案内役の会話
//  研究メモ: 牧場物語/あつ森/ルンファクの序盤は「1つずつ・場所が分かる・案内役が話す・達成で小さなご褒美」
//  - 常に「次にやること」を1つだけ表示(章名+番号+一言+方角矢印+距離)
//  - 目的地の上に光る矢印、足元から目的地へ流れる光の道しるべ。別マップなら「街へ行く」ボタンを光らせる
//  - 季節の作業(田植え/牧草刈り/水管理/稲刈り/子牛出荷)はその週になったら割り込みで先頭に出る(待たせない)
//  - 既存セーブは進捗から自動判定(達成済みは報酬なしで既読扱い)。旧QUESTSの報酬済みも二重払いしない
// =====================================================================
const V83_GUIDE={atsushi:'あつし',yusuke:'ゆうすけ',naoto:'なおと'};
const V83_FARM='farm',V83_TOWN='town';
function v83HasCalfReady(){return (state.calves||[]).some(c=>(c.ageWeeks||0)>=ECON.CALF_SHIP_WEEKS);}
// v85: 大きな買い物の目標は、買っても手元に300万円残る時だけ出す(ナビどおりに全部買うと2年目に資金ショートで倒産した)
function v83Afford(n){return state.money>=n+3000000;}
function v83RiceSet(){try{return RICE_SET.every(k=>effN(k)>=1);}catch(e){return false;}}
// old: 旧QUESTSの番号(この番号未満が報酬済みなら二重払いしない)
const V83_CHAPTERS=[ // v88: 1吹き出し30字以内・3吹き出しまで。序盤(1〜3章)の案内役はあつし1人
 {n:1,t:'丹波の暮らしをはじめよう',g:'atsushi',intro:['まずは大倉庫で🥔ポテサラを作ろう！']},
 {n:2,t:'牛飼いデビュー',g:'atsushi',intro:['いよいよ牛を飼うぞ！🐂','牛舎を借りて、街のセリで牛を買おう。']},
 {n:3,t:'就農の手続き',g:'atsushi',intro:['牛が増えたら、お金も要るな。','街で就農の手続きをしよう。']},
 {n:4,t:'牧草を自給する',g:'yusuke',intro:['牧草担当のゆうすけです。','牧草を作れば、エサ代がタダになるよ。']},
 {n:5,t:'季節を回して稼ぐ',g:'yusuke',intro:['あとは季節の作業だよ。','やる週が来たら、ここで知らせるね。']},
 {n:6,t:'チームで回す',g:'naoto',intro:['加工担当のなおとです。','人を雇えば、仕事を任せられるよ。']},
 {n:7,t:'循環型農業',g:'naoto',intro:['牛のフンは堆肥になるんだ。','堆肥舎を建てて、肥料を作ろう。']},
 {n:8,t:'丹波いちばんの農場へ',g:'atsushi',intro:['ここからは規模拡大だ！','丹波いちばんを目指そうぜ！']},
];
const V83_Q=[
 // ---- 第1章 ----
 {id:'proc',ch:1,old:0,s:'🥔 ポテサラを作って売る',t:'東の🏭大倉庫の中の🥔ポテサラ加工場で「使う」(週1回)。丹波の野菜を加工して売り、最初の現金を稼ごう。',c:()=>state.procWeek>=0,r:200000,go:()=>({map:V83_FARM,x:44.9,z:32.4}),say:'大倉庫の光る所で「使う」だ！'},
 {id:'riceHand',ch:1,old:12,s:'🌾 田植えをする(今週だけ)',t:'今週(4月1週)だけ田植えができる。農場の南西の🌾田んぼで「使う」→田植え。機械がなければ手植え(小規模・苗代も小さい)。秋10月に稲刈りできるよ。',c:()=>state.riceField!=='none'||state.riceBags>0||state.soldRiceBags>0,when:()=>isRicePlantWeek()&&state.riceField==='none',r:150000,go:()=>({map:V83_FARM,x:16.5,z:35.75}),say:'田植えは今週だけ！田んぼで「使う」'},
 // ---- 第2章 牛飼いデビュー(v88: 制度の話は後回し。まず牛) ----
 {id:'barn',ch:2,old:3,s:'🏚 牛舎を借りる',t:'農場の🏚古い牛舎の南の入口で「使う」→借りる(月3万円)。',c:()=>hasBarn(),r:100000,go:()=>({map:V83_FARM,x:21.5,z:28.2}),say:'牛舎の入口で「使う」だ'},
 {id:'town',ch:2,s:'🏘 街へ行く',t:'左下の「🏘 街へ行く」ボタン、または農場の西の🌉橋を渡ると街に着くよ。',c:()=>!!(state.qv&&state.qv.flags.town)||state.newFarmer,r:0,go:()=>({map:V83_TOWN,x:61,z:31.5}),say:'街へ行こう！'},
 {id:'cow',hl:{btn:/預託で購入|購入/},ch:2,old:4,s:'🐂 セリで牛を買う',t:'街の🐂セリ市場で「使う」→メス牛を買う。与信100万円で買える(子牛の売上から返す)ので現金は減らないよ。',c:()=>state.cows.length>0||state.calves.length>0,when:()=>hasBarn(),r:300000,go:()=>({map:V83_TOWN,x:47.5,z:42.6}),say:'セリ市場で牛を買おう'},
 {id:'feed',ch:2,old:5,s:'🌾 牛に餌をやる',t:'牛舎の北の🌾牧草の山で「牧草をかかえる」→牛舎の中で「使う」(餌箱に入れる)と全頭に餌やり(週1回)。',c:()=>state.care.fedWeek>=0,when:()=>herdCount()>0,r:100000,go:()=>state.carryHay?({map:V83_FARM,x:18,z:15,lb:'餌箱'}):({map:V83_FARM,x:23,z:10.5,lb:'牧草の山'}),say:'牧草の山から運んで、牛にあげよう'},
 {id:'clean',ch:2,old:6,s:'🧹 牛舎を掃除する',t:'牛舎の中で「使う」→🧹「フンを撤去する」(週1回・牛舎の中ならどこでもOK)。汚れたままだと病気になりやすい。',c:()=>state.care.cleanWeek>=0,when:()=>herdCount()>0,r:100000,go:()=>({map:V83_FARM,x:20.5,z:13.5}),say:'牛舎の中で「使う」で掃除だ'},
 {id:'breed',hl:{btn:/種付け|牛メニューへ/},ch:2,old:7,s:'💉 種付けをする',t:'牛舎の入口で「使う」→🐂牛メニュー→母牛の「💉種付け」(1回1万円・成功率80%)。約10ヶ月後に子牛が生まれる。',c:()=>state.cows.some(c=>c.preg>=0||(c.births||0)>0),when:()=>state.cows.some(c=>!c.sick&&!c.retired&&c.preg<0&&c.bredWeek!==state.weekN),r:150000,go:()=>({map:V83_FARM,x:21.5,z:28.2}),act:['🐂 牛メニューを開く',()=>{menuTab='herd';openMenu();}],say:'牛メニューで種付けだ'},
 // ---- 第3章 就農の手続き ----
 {id:'newFarmer',hl:{row:/新規就農者/,btn:/認定/},ch:3,old:1,s:'🎓 農協で認定を受ける',t:'街の🚜農協で「使う」→メニューの🎓新規就農者の「認定を受ける」(光っているボタン)。',c:()=>state.newFarmer,r:300000,go:()=>({map:V83_TOWN,x:44.5,z:33.0}),say:'農協で「認定」を受けよう'},
 {id:'loan',hl:{row:/新規就農資金/,btn:/借りる/},ch:3,s:'🏦 銀行でお金を借りる',t:'街の🏦銀行で「使う」→新規就農資金の「借りる」(光っているボタン)。最初の3年は返済なし・無利息。牛や機械の元手にしよう。',c:()=>!!(state.startupLoan&&state.startupLoan.taken),when:()=>state.newFarmer,r:0,go:()=>({map:V83_TOWN,x:19.5,z:33.0}),say:'銀行で就農資金を借りよう'},
 // ---- 第4章 ----
 {id:'pasture',hl:{row:/西の牧草地/},ch:4,s:'🏠 牧草地を買う',t:'街の🏠不動産屋で「使う」→「西の牧草地(基本)」を買う。牛舎の東の空き地が柵付きの牧草地になる。',c:()=>state.land.pasture1,r:100000,go:()=>({map:V83_TOWN,x:27.8,z:33.0}),say:'不動産屋で牧草地を買おう'},
 {id:'grassSow',ch:4,old:2,s:'🌱 牧草のタネをまく',t:'牛舎の東の🌿牧草地で「使う」→作付け(10万円)。刈り取りは🌸5月1週と🍂9月3週。',c:()=>state.grassSown||state.grassStock>0,when:()=>state.land.pasture1,r:100000,go:()=>({map:V83_FARM,x:37,z:14.5}),say:'牧草地でタネをまこう'},
 {id:'grassSet',hl:{row:()=>{const m={tractor:'トラクター',dumper:'ダンプベッセル',baler:'ロールベーラー'};const miss=GRASS_SET.filter(k=>effN(k)<1).map(k=>m[k]).filter(Boolean);return new RegExp('^\\S*\\s*('+(miss.join('|')||'該当なし')+')');}},ch:4,s:'🚜 牧草の機械を買う',t:'牧草の刈り取りには🚜トラクター(最初からある)＋🛻ダンプベッセル＋🟡ロールベーラーの一式が必要。街の🚜農協で光っている行の機械を買おう。先に🏛役場で補助を申請すると牧草用は半額。刈り取りは🌸5月1週と🍂9月3週。',c:()=>grassSetsOwned()>=1,when:()=>(state.land.pasture1&&(state.grassSown||state.grassStock>0))&&v83Afford(4000000),r:100000,go:()=>({map:V83_TOWN,x:44.5,z:33.0}),say:'刈るには機械がいるよ'},
 // ---- 第5章(季節の作業=その週になったら割り込み) ----
 {id:'grassCut',ch:5,old:8,prio:true,s:'✂ 牧草を刈る(今週！)',t:'今週は牧草の刈り取り週。🌿牧草地で「使う」→✂刈り取り。ロールになって牛の餌の在庫になる。',c:()=>state.grassCutWeek>=0,when:()=>state.grassSown&&isGrassHarvestWeek()&&grassSetsOwned()>=1,r:150000,go:()=>({map:V83_FARM,x:37,z:14.5}),say:'今週は刈り取りだよ！'},
 {id:'water',ch:5,prio:true,s:'🚿 田んぼの水やり',t:'夏(5〜9月)は3〜4週おきに田んぼの水管理。🌾田んぼで「使う」。サボると収量が減るよ。',c:()=>(state.waterWeek||-1)>=0,when:()=>state.riceField==='planted'&&waterDue(),r:100000,go:()=>({map:V83_FARM,x:16.5,z:35.75}),say:'田んぼに水をやろう'},
 {id:'harvest',ch:5,old:13,prio:true,s:'🌾 稲刈りをする',t:'稲が実った！🌾田んぼで「使う」→収穫。米袋は大倉庫に貯蔵される。',c:()=>state.riceBags>0||state.soldRiceBags>0,when:()=>state.riceField==='ready',r:200000,go:()=>({map:V83_FARM,x:16.5,z:35.75}),say:'実りの秋！稲刈りだ'},
 {id:'riceShip',ch:5,old:14,s:'🍚 米を精米して売る',t:'大倉庫の🍚精米機で「使う」→精米して出荷(1袋3万円)。',c:()=>state.soldRiceBags>0,when:()=>state.riceBags>0,r:300000,go:()=>({map:V83_FARM,x:60.5,z:32}),say:'精米機で米を売ろう'},
 {id:'calfSell',ch:5,old:9,prio:true,s:'🐮 子牛をセリで売る',t:'週齢32週になった子牛を街の🐂セリ市場で売ろう(♀100万/♂120万・状態で±)。',c:()=>(state.calfSoldN||0)>0,when:()=>v83HasCalfReady(),r:300000,go:()=>({map:V83_TOWN,x:47.5,z:42.6}),say:'子牛をセリで売ろう'},
 // ---- 第6章 ----
 {id:'hire',hl:{btn:/雇う/},ch:6,old:10,s:'🤝 人を雇う',t:'大倉庫の奥の🏢事務所で「使う」→雇用(月給30万)→仕事を指示。雇用ボーナス180万円ももらえる。',c:()=>Object.values(state.staff).some(v=>v),when:()=>herdCount()>0||state.riceField!=='none',r:200000,go:()=>({map:V83_FARM,x:72.5,z:25.6}),say:'事務所で人を雇おう'},
 {id:'riceSet',hl:{row:()=>{const m={tractor:'トラクター',planter:'田植え機',combine:'コンバイン',dryer:'乾燥機'};const miss=RICE_SET.filter(k=>effN(k)<1).map(k=>m[k]).filter(Boolean);return new RegExp('^\\S*\\s*('+(miss.join('|')||'該当なし')+')');}},ch:6,old:11,s:'🚜 米の機械をそろえる',t:'街の🚜農協で、まだ持っていない🌱田植え機・🌾コンバイン・♨乾燥機をそろえる(🚜トラクターは最初から1台ある・光っている行の機械を買えばOK)。米用の機械は補助の対象外(定価)。乾燥機は中古でOK。',c:()=>v83RiceSet(),when:()=>v83Afford(9000000),r:500000,go:()=>({map:V83_TOWN,x:44.5,z:33.0}),say:'光る機械を買えばOK'},
 // ---- 第7章 ----
 {id:'shedSub',hl:{row:/堆肥舎/,btn:/申請/},ch:7,s:'🏛 役場で補助を申請',t:'街の🏛役場で「使う」→補助金の申請で「堆肥舎」を選ぶ。2週間ほどで承認→承認されてから建てると半額。',c:()=>state.compostShed||!!(state.subsidy&&state.subsidy.shed),when:()=>herdCount()>0,r:0,go:()=>({map:V83_TOWN,x:31.8,z:22.6}),say:'役場で補助を申請しよう'},
 {id:'shed',ch:7,old:16,s:'🏭 堆肥舎を建てる',t:'牛舎のすぐ南の🟫堆肥場で「使う」→🏭本格堆肥舎を建てる(補助の承認が下りてから建てると半額)。牛糞の処分費がゼロ・肥料の製造販売ができる。',c:()=>state.compostShed,when:()=>(herdCount()>0&&!(state.subsidy&&state.subsidy.shed&&state.subsidy.shed.st==='pending'))&&v83Afford(subApproved('shed')?7500000:15000000),r:300000,go:()=>({map:V83_FARM,x:V83_SHED.x+1.5,z:V83_SHED.z+1.5}),say:'牛舎の南に建てよう'},
 {id:'processor',hl:{row:/加工機/},ch:7,old:17,s:'🍱 加工機を買う',t:'街の🚜農協で🍱食品加工機を買うと、ポテサラなど加工品の売値が1.5倍に。',c:()=>effN('processor')>=1,when:()=>v83Afford(1500000),r:200000,go:()=>({map:V83_TOWN,x:44.5,z:33.0}),say:'加工機で売値が上がるよ'},
 // ---- 第8章 ----
 {id:'land',hl:{row:/栗園|棚田|畑/},ch:8,old:15,s:'🏠 土地を広げる',t:'街の🏠不動産屋で🌰栗園・棚田の拡張などを買って規模拡大しよう。',c:()=>state.land.orchard||state.land.rice2||state.land.grass2||state.land.field2||state.land.rice3,when:()=>v83Afford(2000000),r:200000,go:()=>({map:V83_TOWN,x:27.8,z:33.0}),say:'土地を広げよう'},
 {id:'newBarn',hl:{row:/北の第二牛舎|北へ増築/},ch:8,old:18,s:'⛰ 牛舎を増やす',t:'街の🏠不動産屋で「🏠 北の第二牛舎(大牛舎)」を建てよう(光っている行)。建てた後は同じ不動産屋から北の平原に別棟を増築できる。',c:()=>state.newBarns>0||state.land.barn2,when:()=>v83Afford(3000000),r:300000,go:()=>({map:V83_TOWN,x:27.8,z:33.0}),say:'牛舎を増やそう'},
 {id:'cert',hl:{row:/認定農業者/},ch:8,old:19,s:'🏅 認定農業者になる',t:'3年目以降、加工以外の売上が累計2,000万円を超えたら🚜農協で「認定農業者」に。スーパーL資金が借りられる。',c:()=>state.certFarmer,when:()=>{try{return certFarmerOk();}catch(e){return false;}},r:500000,go:()=>({map:V83_TOWN,x:44.5,z:33.0}),say:'認定農業者になろう'},
 {id:'cows10',hl:{btn:/預託で購入|購入/},ch:8,old:20,s:'🐂 母牛を10頭に',t:'🐂セリで母牛を買い足して10頭体制へ。世話は従業員に任せよう(1人で母牛60頭まで)。',c:()=>state.cows.length>=10,r:500000,go:()=>({map:V83_TOWN,x:47.5,z:42.6}),say:'母牛を10頭にしよう'},
 {id:'final',ch:8,s:'🌟 丹波いちばんへ',t:'牛・米・牧草・栗・加工・肥料の柱と設備投資で利益を最大化！📊事務所の経営分析で資金繰りもチェックしよう。',c:()=>false,r:0,go:()=>null,say:'ここからは自由に経営だ！'},
];
const V83_SHED={x:18.5,z:30};
// v85: 2年目以降の季節の作業。一度きりの目標を済ませた後も、その週になったらナビで案内する(2年目の田植えを誰も教えてくれなかった)
const V83_PADDY=()=>({map:V83_FARM,x:16.5,z:35.75});
const V83_SEASON=[
 {id:'s_fix',ch:5,hl:{btn:/修理/},s:'🔧 修理屋で機械を直す',t:'今週の作業に使う機械が壊れている。街の🔧修理屋で「使う」→修理(光っているボタン)。直したら作業に戻ろう。',when:()=>{const br=k=>{try{return machineBroken(k);}catch(e){return false;}};return (isRicePlantWeek()&&state.riceField==='none'&&(br('planter')||(br('tractor')&&effN('planter')>=1)))||(state.riceField==='ready'&&RICE_SET.some(br))||(state.grassSown&&isGrassHarvestWeek()&&state.grassCutWeek!==state.weekN&&GRASS_SET.some(br));},go:()=>({map:V83_TOWN,x:13.5,z:30.2}),say:'機械を直してもらおう'},
 {id:'s_plant',ch:5,s:'🌾 田植えの週だ！',t:'春の田植えは4月1週だけ。🌾田んぼで「使う」→田植え。🤝事務所で従業員に🌾米を指示しておけば自動でやってくれるよ。',when:()=>state.qv.done.riceHand&&isRicePlantWeek()&&state.riceField==='none'&&!staffWithJob('rice'),go:V83_PADDY,say:'今年も田植えの週だ！'},
 {id:'s_water',ch:5,s:'🚿 田んぼの水やり',t:'夏(5〜9月)は3〜4週おきに田んぼの水管理。🌾田んぼで「使う」。',when:()=>state.qv.done.water&&state.riceField==='planted'&&waterDue()&&!staffWithJob('rice'),go:V83_PADDY},
 {id:'s_harv',ch:5,s:'🌾 稲刈りをする',t:'稲が実った！🌾田んぼで「使う」→収穫。米袋は大倉庫へ。そのあと🍚精米機で出荷しよう。',when:()=>state.qv.done.harvest&&state.riceField==='ready'&&!staffWithJob('rice'),go:V83_PADDY},
 {id:'s_grass',ch:5,s:'✂ 牧草を刈る(今週！)',t:'今週は牧草の刈り取り週。🌿牧草地で「使う」→✂刈り取り。',when:()=>state.qv.done.grassCut&&state.grassSown&&isGrassHarvestWeek()&&state.grassCutWeek!==state.weekN&&grassSetsOwned()>=1&&!staffWithJob('grass'),go:()=>({map:V83_FARM,x:37,z:14.5})},
 {id:'s_breed',ch:5,hl:{btn:/種付け|牛メニューへ/},s:'💉 種付けをする',t:'牛舎の入口で「使う」→🐂牛メニュー→「💉種付け」。子牛が生まれないと牛の収入が入らないよ(1回1万円・成功率80%)。🤝従業員に🐂牛の世話を指示すれば自動。',when:()=>state.qv.done.breed&&!staffWithJob('cow')&&state.cows.some(c=>!c.sick&&!c.retired&&c.preg<0&&c.bredWeek!==state.weekN)&&committedCalves()<calfCap(),go:()=>({map:V83_FARM,x:21.5,z:28.2}),act:['🐂 牛メニューを開く',()=>{menuTab='herd';openMenu();}]},
 {id:'s_proc',ch:1,s:'🥔 今週のポテサラ',t:'大倉庫の🥔ポテサラ加工場で「使う」(週1回・利益7.5万円)。序盤のいちばん大事な収入だよ。🤝従業員に🥔加工を指示すれば自動。',when:()=>state.qv.done.proc&&state.procWeek!==state.weekN&&!staffWithJob('proc')&&curMap==='farm',go:()=>({map:V83_FARM,x:44.9,z:32.4})},
 {id:'s_calf',ch:5,s:'🐮 子牛をセリで売る',t:'週齢32週になった子牛を街の🐂セリ市場で売ろう。',when:()=>state.qv.done.calfSell&&v83HasCalfReady()&&!staffWithJob('cow'),go:()=>({map:V83_TOWN,x:47.5,z:42.6})},
];
for(const q of V83_SEASON){q.c=()=>false;q.r=0;}
 // 本格堆肥舎の柱の左上(牛舎の南入口のすぐ南西)
function v83QState(){
  if(!state.qv){
    state.qv={v:1,done:{},said:{},ch:{},flags:{},fresh:(state.weekN||0)===0&&!(state.questDone>0),v88:window.v84New?1:0,tips:{},ui:{}};
    // 既存セーブ: 旧クエストの報酬済み/いま達成している物は既読(報酬なし)
    for(const q of V83_Q){
      let d=false;try{d=q.c();}catch(e){}
      if(d||(q.old!=null&&q.old<(state.questDone||0)))state.qv.done[q.id]=1;
    }
    // 既に進んでいる章の導入会話は出さない(いまの章だけ出す)
    const cur=v83Current();
    for(const c of V83_CHAPTERS)if(cur&&c.n<cur.ch)state.qv.ch[c.n]=1;
  }
  if(state.qv.v88===undefined){ // v88以前の進行データ: 新しいチュートリアルは出さない(UIは全部出す)。章の並べ替えで導入会話が再び出ないよう済み扱い
    state.qv.v88=0;state.qv.tips=state.qv.tips||{};state.qv.ui=state.qv.ui||{};
    for(const c of V83_CHAPTERS)state.qv.ch[c.n]=1;
  }
  if(!state.qv.v85){state.qv.v85=1;if(!state.qv.fresh||(state.weekN||0)>0){for(const id of ['grassSet']){const q=V83_Q.find(x=>x.id===id);let d=false;try{d=q.c();}catch(e){}if(d)state.qv.done[id]=1;}}}
  return state.qv;
}
function v83Current(){
  const qv=state.qv;if(!qv)return null;
  const ok=q=>{if(qv.done[q.id])return false;try{return q.when?q.when():true;}catch(e){return false;}};
  for(const q of V83_Q)if(q.prio&&ok(q))return q;
  if(state.navSeason!==false)for(const q of V83_SEASON){try{if(q.when())return q;}catch(e){}} // v86: メニュー⚙でオフにできる
  for(const q of V83_Q)if(!q.prio&&ok(q))return q;
  return null;
}
function v83Upcoming(){ // 季節待ちなど
  const qv=state.qv;return V83_Q.filter(q=>!qv.done[q.id]&&q.when&&q.prio&&q.id!=='final');
}
let v83LastQ=null,v83QueueT=null;
function v83Say(key,lines,done){
  const cfg=CHARS[key];if(!cfg){if(done)done();return;}
  const n={key,cfg};let i=0;
  const next=()=>{if(i>=lines.length){if(done)done();return;}const l=lines[i++];showTalk(n,l);clearTimeout(v83QueueT);v83QueueT=setTimeout(next,Math.min(9000,3200+l.length*70));};
  next();
}
function v83Banner(title,sub,big){
  let el=document.getElementById('v83Clear');
  if(!el){el=document.createElement('div');el.id='v83Clear';document.body.appendChild(el);}
  el.className=big?'big':'';el.innerHTML='<div class="t">'+title+'</div>'+(sub?'<div class="s">'+sub+'</div>':'');
  el.classList.remove('on');void el.offsetWidth;el.classList.add('on');
  // 紙ふぶき
  for(let k=0;k<(big?40:22);k++){const c=document.createElement('i');c.className='v83cf';c.style.left=(50+(Math.random()-0.5)*70)+'vw';c.style.background=['#ffd23e','#ff7a5a','#5ac85a','#5aa8ff','#ff9ad5'][k%5];c.style.animationDelay=(Math.random()*0.25)+'s';c.style.setProperty('--dx',((Math.random()-0.5)*40)+'vw');document.body.appendChild(c);setTimeout(()=>c.remove(),2200);}
}
function v83UpdateQuest(){
  if(!state)return;
  const qv=v83QState();
  // 達成判定(順不同で拾う=先にやっても報酬はもらえる)
  for(const q of V83_Q){
    if(qv.done[q.id])continue;let d=false;try{d=q.c();}catch(e){}
    if(d){qv.done[q.id]=1;
      if(q.r)addSale(q.r,'grant');
      try{fanfare();}catch(e){}
      v83Banner('🎉 できた！',q.s.replace(/^\S+\s/,'').replace(/\(.*?\)/g,'')+(q.r?'<br><b>+'+man(q.r)+'</b>':'')); // v88: ほめる(短く)
    }
  }
  state.questDone=Object.keys(qv.done).length; // 実績などの互換用(数)
  const q=v83Current();
  // 章が変わったら導入(案内役の会話+章カード)
  if(q&&!qv.ch[q.ch]){
    qv.ch[q.ch]=1;const c=V83_CHAPTERS[q.ch-1];
    setTimeout(()=>{v83Banner('第'+c.n+'章',c.t,true);setTimeout(()=>v83Say(c.g,c.intro),1300);},q===v83LastQ?0:900);
    qv.said[q.id]=1;
  }else if(q&&q!==v83LastQ&&!qv.said[q.id]&&q.say){
    qv.said[q.id]=1;const c=V83_CHAPTERS[q.ch-1];setTimeout(()=>v83Say(c.g,[q.say]),2600);
  }
  v83LastQ=q;
  const el=document.getElementById('quest');
  if(el){
    if(q){const c=V83_CHAPTERS[q.ch-1];
      el.innerHTML='<span class="qch">'+c.n+'章</span><span class="qrow"><span id="qArrow">➤</span><b>'+q.s+'</b><span id="qDist"></span></span>';}
    else{const up=v83Upcoming();
      el.innerHTML='<span class="qch">⏭</span><span class="qrow"><b>季節を待とう(「次の週へ」で進める)</b></span>'+(up.length?'<span class="qup">次: '+up.map(u=>u.s).slice(0,2).join(' / ')+'</span>':'');}
  }
}
function v83ShowQuestInfo(){
  if(!state)return;v83QState();
  const q=v83Current(),qv=state.qv;
  const doneN=V83_Q.filter(x=>qv.done[x.id]).length;
  let body='';
  if(q){const c=V83_CHAPTERS[q.ch-1];
    body+='<b>第'+c.n+'章 '+c.t+'</b><br><br><b>▶ やること</b><br>'+q.t+(q.r?('<br><br>🎁 達成で <b>協力金 '+man(q.r)+'</b>'):'');
    const g=q.go&&q.go();
    if(g&&g.map!==curMap)body+='<br><br>📍 目的地は<b>'+(g.map==='town'?'🏘 丹波の街':'🌾 農場')+'</b>。'+(curMap==='tokyo'?'東京駅の🚄から丹波へ帰ろう。':'左下の「'+(g.map==='town'?'🏘 街へ行く':'🌾 農場へ')+'」ボタンで移動できるよ。');
    else if(g)body+='<br><br>📍 光る矢印と足元の道しるべの先へ。着いたら「使う」！';
  }else body+='<b>⏭ 季節を待とう</b><br>いまできるメインの目標はぜんぶ済んだ！「次の週へ」で時間を進めよう。';
  const up=v83Upcoming();
  if(up.length)body+='<br><br><b>🗓 季節が来たら</b><br>'+up.map(u=>'・'+u.s).join('<br>');
  body+='<br><br><small style="color:#8a6a45">メイン目標 '+doneN+'／'+V83_Q.length+' 達成</small>';
  const btns=[];
  if(q&&q.act)btns.push(q.act);
  btns.push([state.qv.navOff?'🧭 道しるべを表示する':'🧭 道しるべを隠す',()=>{state.qv.navOff=!state.qv.navOff;}]);
  btns.push([state.navSeason!==false?'🗓 毎週・毎年の作業の案内をオフ':'🗓 毎週・毎年の作業の案内をオン',()=>{toggleNavSeason();}]);
  showIconInfo({t:'🎯 いまの目標',b:body,btns});
}
// ---- 経路探索(歩ける床のグリッドでA*。壁・柵・水・高い段差・看板/木の当たり判定をよける) ----
function v83DecoBlocked(x,z,y){for(const c of decoColliders){if(Math.abs(c.y-y)>2.4)continue;if(Math.hypot(c.x-x,c.z-z)<c.r+0.62)return true;}
  // v85: 繋いだ牛も避ける(牛の後ろの通路へ案内して牛に突っ込み、動けなくなっていた)
  for(const n of npcs){if(!n.mesh.parent)continue;if(Math.abs(n.mesh.position.y-y)>2)continue;if(Math.hypot(n.mesh.position.x-x,n.mesh.position.z-z)<0.35+0.5)return true;} // v85: 人も避ける(牛舎の入口前のあつしに突っ込んで止まっていた)
  if(curMap==='farm')for(const m of cowMeshes){if(Math.abs(m.position.y-y)>2)continue;if(Math.hypot(m.position.x-x,m.position.z-z)<(m.userData.big?0.42:0.3)+0.5)return true;}
  return false;}
function v83Path(sx,sz,sy,tx,tz){
  const z0=(curMap==='farm'?ZMIN:0),W=WS,H=WS-z0;
  const id=(x,z)=>(z-z0)*W+x;
  const bx=Math.floor(sx),bz=Math.floor(sz),gx=Math.floor(tx),gz=Math.floor(tz);
  const N=W*H;const g=new Float32Array(N).fill(1e9),Y=new Float32Array(N),par=new Int32Array(N).fill(-1),closed=new Uint8Array(N);
  const open=[];const push=(i,f)=>{open.push([f,i]);let k=open.length-1;while(k>0){const pk=(k-1)>>1;if(open[pk][0]<=open[k][0])break;[open[pk],open[k]]=[open[k],open[pk]];k=pk;}};
  const pop=()=>{const top=open[0],last=open.pop();if(open.length){open[0]=last;let k=0;for(;;){const l=2*k+1,r=l+1;let m=k;if(l<open.length&&open[l][0]<open[m][0])m=l;if(r<open.length&&open[r][0]<open[m][0])m=r;if(m===k)break;[open[m],open[k]]=[open[k],open[m]];k=m;}}return top;};
  const s0=id(bx,bz);if(s0<0||s0>=N)return null;g[s0]=0;Y[s0]=sy;push(s0,0);
  let best=s0,bestH=1e9,it=0;
  const D=[[1,0,1],[-1,0,1],[0,1,1],[0,-1,1],[1,1,1.42],[1,-1,1.42],[-1,1,1.42],[-1,-1,1.42]];
  while(open.length&&it++<12000){
    const [,i]=pop();if(closed[i])continue;closed[i]=1;
    const x=i%W,z=Math.floor(i/W)+z0;
    const h=Math.hypot(gx-x,gz-z);if(h<bestH){bestH=h;best=i;}
    if(h<1.5)break;
    for(const [dx,dz,c] of D){
      const nx=x+dx,nz=z+dz;if(nx<0||nx>=W||nz<z0||nz>=WS)continue;
      const ni=id(nx,nz);if(closed[ni])continue;
      const ny=walkY(nx,nz,Y[i]);if(ny>WH)continue;
      if(dx&&dz){if(walkY(x+dx,z,Y[i])>WH||walkY(x,z+dz,Y[i])>WH)continue;} // 角の斜め抜け禁止
      if(v83DecoBlocked(nx+0.5,nz+0.5,ny))continue;
      // 壁ぎわは少し高コスト(真ん中を歩く)
      let wc=0;for(const [ax,az] of [[1,0],[-1,0],[0,1],[0,-1]])if(walkY(nx+ax,nz+az,ny)>WH)wc+=0.35;
      const ng=g[i]+c+wc;if(ng<g[ni]){g[ni]=ng;Y[ni]=ny;par[ni]=i;push(ni,ng+Math.hypot(gx-nx,gz-nz));}
    }
  }
  const pts=[];let c=best;while(c>=0){pts.push([c%W+0.5,Math.floor(c/W)+z0+0.5,Y[c]]);c=par[c];}
  pts.reverse();pts[0]=[sx,sz,sy];
  if(bestH<2.5)pts.push([tx,tz,pts[pts.length-1][2]]);
  return pts;
}
// ---- ナビ(3D) ----
let v83Nav=null,v83ChkT=0;
function v83NavInit(){
  if(v83Nav||typeof scene==='undefined'||!scene)return;
  const g=new THREE.Group();g.renderOrder=5;
  const mat=new THREE.MeshBasicMaterial({color:0xffb000,transparent:true,opacity:1,depthTest:false,toneMapped:false});
  const cone=new THREE.Mesh(new THREE.ConeGeometry(0.55,1.0,4),mat);cone.rotation.x=Math.PI;cone.position.y=0.4;
  const stem=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.6,0.22),mat);stem.position.y=1.05;
  const pin=new THREE.Group();pin.add(cone);pin.add(stem);pin.renderOrder=6;g.add(pin);
  const ring=new THREE.Mesh(new THREE.RingGeometry(0.75,1.0,32),new THREE.MeshBasicMaterial({color:0xffc400,transparent:true,opacity:0.95,side:THREE.DoubleSide,depthWrite:false,depthTest:false,toneMapped:false}));
  ring.rotation.x=-Math.PI/2;g.add(ring);
  // 足元の道しるべ(流れる三角)
  const sh=new THREE.Shape();sh.moveTo(0,0.32);sh.lineTo(0.26,-0.16);sh.lineTo(0,-0.04);sh.lineTo(-0.26,-0.16);sh.lineTo(0,0.32);
  const tg=new THREE.ShapeGeometry(sh);tg.rotateX(-Math.PI/2);
  const crumbs=new THREE.InstancedMesh(tg,new THREE.MeshBasicMaterial({color:0xffc000,transparent:true,opacity:0.95,depthWrite:false,depthTest:false,toneMapped:false}),14);
  crumbs.frustumCulled=false;crumbs.renderOrder=4;
  const tg2=tg.clone();tg2.scale(1.35,1,1.35);const crumbsW=new THREE.InstancedMesh(tg2,new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:0.9,depthWrite:false,depthTest:false,toneMapped:false}),14);crumbsW.frustumCulled=false;crumbsW.renderOrder=3;scene.add(crumbsW);
  scene.add(g);scene.add(crumbs);
  v83Nav={g,pin,ring,crumbs,crumbsW,t:0,m:new THREE.Matrix4(),q:new THREE.Quaternion(),v:new THREE.Vector3(),s:new THREE.Vector3(1,1,1),e:new THREE.Euler()};
}
function v83Route(g){ // 別マップなら出口(橋/門/駅)を案内
  if(!g)return curMap==='tokyo'?{x:70,z:38.5,lb:'🚄 丹波へ帰る',btn:true}:null; // v85: 東京で目標が無い時も帰り道は案内
  if(g.map===curMap)return {x:g.x,z:g.z,lb:g.lb,here:true};
  if(curMap==='farm')return {x:1.5,z:21.5,lb:'🏘 街へ(橋の西)',btn:true};
  if(curMap==='town')return g.map==='farm'?{x:64.5,z:31.5,lb:'🌾 農場へ(東の門)',btn:true}:{x:33,z:10.5,lb:'🚄 駅'};
  if(curMap==='tokyo')return {x:70,z:38.5,lb:'🚄 丹波へ帰る',btn:true};
  return null;
}
// メニューを開いた時、いまの目標で押すボタンを光らせる
let v83HlT=0;
function v83Highlight(q){
  const box=document.getElementById('menuBox'),menu=document.getElementById('menu');
  const fOpen=(()=>{const f=document.getElementById('fiscal');return !!f&&f.style.display==='flex';})();
  document.querySelectorAll('.v83hl').forEach(e=>{const inF=e.closest&&e.closest('#fiscalBox');if(inF?(!q||!fOpen):(!q||!q.hl||!box||!box.contains(e)))e.classList.remove('v83hl');});
  // v85: 支払い方法の確認(現金/融資)が開いたら「現金で」を光らせる(メニューで光るボタンを押した後に迷っていた)
  const fb=document.getElementById('fiscalBox'),fo=document.getElementById('fiscal');
  if(q&&fb&&fOpen&&/設備投資/.test(fb.textContent)){const c=[...fb.querySelectorAll('button')].find(b=>/現金で/.test(b.textContent));if(c){c.classList.add('v83hl');return;}}
  if(!q||!q.hl||!menu||menu.style.display==='none'||!box)return;
  let cands=[];
  const rowRe=typeof q.hl.row==='function'?q.hl.row():q.hl.row; // v85: まだ持っていない機械の行だけ光らせる(持っているトラクターを何度も買わせていた)
  if(rowRe){for(const r of box.querySelectorAll('.row,tr,p,div')){if(r.children.length>12)continue;if(!rowRe.test(r.textContent.trim()))continue;const bs=[...r.querySelectorAll('button')].filter(b=>!b.disabled&&(!q.hl.btn||q.hl.btn.test(b.textContent)));if(bs.length&&bs.length<=4){cands=bs;break;}}}
  if(!cands.length&&q.hl.btn)cands=[...box.querySelectorAll('button')].filter(b=>!b.disabled&&q.hl.btn.test(b.textContent)&&b.offsetParent).slice(0,1); // v85: 押せない(今週済み)ボタンは光らせない
  for(const b of cands){if(!b.classList.contains('v83hl')){b.classList.add('v83hl');if(!box.dataset.v83s){box.dataset.v83s=1;try{b.scrollIntoView({block:'center',behavior:'smooth'});}catch(e){}}}}
}
const _v83c=new THREE.Vector3(),_v83pp=new THREE.Vector3();let v83DeclT=0;
function v83Declutter(){
  if(!camera||!player)return;
  _v83pp.set(player.x,player.y+0.9,player.z).project(camera);
  for(const it of infoIcons){const sp=it.sp;if(!sp||!sp.isSprite)continue;
    if(!sp.userData.v83s)sp.userData.v83s=sp.scale.x;
    const d=sp.getWorldPosition(_v83c).distanceTo(camera.position);
    const k=Math.max(0.34,Math.min(1,d/13));sp.scale.setScalar(sp.userData.v83s*k);
    _v83c.project(camera);const sx=(_v83c.x-_v83pp.x)*innerWidth/2,sy=(_v83c.y-_v83pp.y)*innerHeight/2;
    const over=Math.abs(sx)<70&&sy>-40&&sy<150&&d<camera.position.distanceTo(_v83pp.set(player.x,player.y,player.z))+1;
    _v83pp.set(player.x,player.y+0.9,player.z).project(camera);
    if(sp.material){sp.material.transparent=true;sp.material.opacity=over?0.28:1;}}
  // 手前(カメラと主人公の間)にいるNPCは隠す=主人公や会話窓・ボタンと重ならない
  const pd=camera.position.distanceTo(_v83c.set(player.x,player.y+0.9,player.z));
  for(const n of npcs){if(!n.mesh.parent)continue;const d=n.mesh.position.distanceTo(camera.position);
    let hide=d<2.6;
    if(!hide&&d<pd-0.8){_v83c.copy(n.mesh.position);_v83c.y+=0.9;_v83c.project(camera);if(_v83c.y<_v83pp.y-0.05)hide=true;}
    n.mesh.visible=!hide;}
}
function v83NavTick(dt){
  v83DeclT+=dt;if(v83DeclT>0.1){v83DeclT=0;try{v83Declutter();}catch(e){}}
  if(!state||!state.qv)return;
  // v85: 餌やり・掃除などHUD更新を通らない操作でも、達成したらすぐ次の目標へ(以前は週が変わるまで古い目標が残り「何も起きない」状態になった)
  v83ChkT+=dt;if(v83ChkT>0.4){v83ChkT=0;let need=false;const qv=state.qv;
    for(const q of V83_Q){if(qv.done[q.id])continue;try{if(q.c()){need=true;break;}}catch(e){}}
    if(need||v83Current()!==v83LastQ){try{v83UpdateQuest();}catch(e){}}}
  try{v88Tick(dt);}catch(e){}
  v83NavInit();if(!v83Nav)return;
  const N=v83Nav;N.t+=dt;
  const q=v83Current();let r=null;
  v83HlT+=dt;if(v83HlT>0.3){v83HlT=0;try{v83Highlight(q);}catch(e){}const mn=document.getElementById('menu'),bx=document.getElementById('menuBox');if(mn&&bx&&mn.style.display==='none')delete bx.dataset.v83s;}
  try{r=v83Route(q&&q.go&&q.go());}catch(e){}
  if(curMap==='town'&&!state.qv.flags.town){state.qv.flags.town=1;try{v83UpdateQuest();}catch(e){}}
  const mb=document.getElementById('mapBtn');if(mb)mb.classList.toggle('v83pulse',!!(r&&r.btn));
  const show=!!r&&!state.qv.navOff&&!isGameOver;
  N.g.visible=show;N.crumbs.visible=show;N.crumbsW.visible=show;
  const ar=document.getElementById('qArrow'),ds=document.getElementById('qDist');
  if(!show){if(ar)ar.style.visibility='hidden';if(ds)ds.textContent='';return;}
  const gy=walkY(Math.floor(r.x),Math.floor(r.z),WH);const ty=(gy<=WH?gy:topY(Math.floor(r.x),Math.floor(r.z))+1);
  N.g.position.set(r.x,ty+0.05,r.z);
  N.pin.position.y=1.9+Math.sin(N.t*3.2)*0.25;N.pin.rotation.y=N.t*1.6;
  const pulse=1+0.15*Math.sin(N.t*4);N.ring.scale.set(pulse,pulse,pulse);
  const dx=r.x-player.x,dz=r.z-player.z;let dist=Math.hypot(dx,dz);
  const cell=Math.floor(player.x)+','+Math.floor(player.z)+'>'+r.x+','+r.z+'@'+curMap;
  N.pt=(N.pt||0)+dt;
  if(cell!==N.pkey||N.pt>1.2){N.pkey=cell;N.pt=0;try{N.path=v83Path(player.x,player.z,player.y,r.x,r.z);}catch(e){N.path=null;}}
  const P=(N.path&&N.path.length>1)?N.path:[[player.x,player.z,player.y],[r.x,r.z,ty]];
  P[0]=[player.x,player.z,player.y];
  // 経路長
  const seg=[];let tot=0;for(let i=1;i<P.length;i++){const l=Math.hypot(P[i][0]-P[i-1][0],P[i][1]-P[i-1][1]);seg.push(l);tot+=l;}
  if(N.path)dist=tot;
  N.dist=dist;N.next=P[Math.min(2,P.length-1)];
  const off=(N.t*1.8)%1.6;let k=0;
  for(let s=1.4+off;s<tot-1.0&&k<14;s+=1.6,k++){
    let a=s,i=0;while(i<seg.length-1&&a>seg[i]){a-=seg[i];i++;}
    const f=Math.min(1,a/(seg[i]||1)),A=P[i],B=P[i+1];
    const x=A[0]+(B[0]-A[0])*f,z=A[1]+(B[1]-A[1])*f;
    const yy=walkY(Math.floor(x),Math.floor(z),(A[2]+B[2])/2+0.6);const y=(yy<=WH?yy:A[2])+0.07;
    const yaw=Math.atan2(B[0]-A[0],B[1]-A[1]);
    const fade=Math.min(1,(s-1.2)/1.2)*Math.min(1,(tot-1.0-s)/1.5);
    N.e.set(0,yaw,0);N.q.setFromEuler(N.e);N.v.set(x,y,z);N.s.setScalar((1.0+0.6*Math.max(0,fade))*Math.max(0,Math.min(1,(N.v.distanceTo(camera.position)-3.5)/2.5)));
    N.m.compose(N.v,N.q,N.s);N.crumbs.setMatrixAt(k,N.m);N.v.y-=0.01;N.m.compose(N.v,N.q,N.s);N.crumbsW.setMatrixAt(k,N.m);
  }
  N.crumbs.count=k;N.crumbs.instanceMatrix.needsUpdate=true;N.crumbsW.count=k;N.crumbsW.instanceMatrix.needsUpdate=true;
  // HUDの方角矢印(画面上の向き)と距離
  if(ar&&camera){
    const a=new THREE.Vector3(player.x,player.y+0.8,player.z).project(camera);
    const b=new THREE.Vector3(r.x,ty+1,r.z).project(camera);
    let ang=Math.atan2(-(b.y-a.y),(b.x-a.x));if(b.z>1)ang+=Math.PI;
    ar.style.visibility='visible';ar.style.transform='rotate('+ang+'rad)';
  }
  if(ds)ds.textContent=dist<2.6?' ここ！「使う」':(r.here?' あと'+Math.round(dist)+'m':' '+r.lb+'へ');
}
// =====================================================================
// v88: 序盤は「やらせて覚える」。案内役はあつし1人、1回に教えるのは1つ。
//  - 画面のボタンは最初は少なく、使う時が来たら出す(段階的開示)。出た時にあつしが1行で教える
//  - 文字は1吹き出し30字以内。絵(矢印・光・道しるべ)で伝わることは文字にしない
//  - 新規ゲームだけ(state.qv.v88===1)。以前からのセーブはUIを全部出し、ヒントも出さない
// =====================================================================
(function(){
  const st=document.createElement('style');
  st.textContent=`body.v88h-week #weekBtnWrap,body.v88h-week #day,body.v88h-map #mapBtn,body.v88h-menu #menuBtn,body.v88h-menu #zoomBtns,body.v88h-menu #place{display:none!important;}
  .v88glow{animation:v88g 0.9s ease-in-out infinite!important;}
  @keyframes v88g{0%,100%{filter:drop-shadow(0 0 0 rgba(255,210,60,0));transform:scale(1);}50%{filter:drop-shadow(0 0 12px rgba(255,200,40,1));transform:scale(1.08);}}`;
  document.head.appendChild(st);
})();
const V88_GUIDE='atsushi';
function v88On(){return !!(typeof state!=='undefined'&&state&&state.qv&&state.qv.v88===1);}
function v88Say(line,sel){ // あつしが1行で教える+ボタンを光らせる
  try{const n={key:V88_GUIDE,cfg:CHARS[V88_GUIDE]};showTalk(n,line);}catch(e){}
  if(sel){const el=document.querySelector(sel);if(el){el.classList.add('v88glow');setTimeout(()=>el.classList.remove('v88glow'),6000);}}
}
function v88Unlocks(){ // 使う時が来たか
  const qv=state.qv,d=qv.done,q=v83Current();
  let rt=null;try{rt=q&&q.go?v83Route(q.go()):null;}catch(e){}
  return {
    map: curMap!=='farm'||!!(rt&&rt.btn)||!!d.town,
    week:(state.weekN||0)>0||!!d.breed||!q||q.id==='final'||(!rt&&!(q&&q.hl)),
    menu:(state.weekN||0)>0||!!d.loan,
  };
}
const V88_TIPS=[ // 1つずつ。出す条件と1行
  {id:'use',when:()=>{const q=v83Current();if(!q||q.id!=='proc'||curMap!=='farm')return false;const g=q.go();return Math.hypot(g.x-player.x,g.z-player.z)<3.2;},
   t:()=>(typeof IS_DESKTOP!=='undefined'&&IS_DESKTOP)?'ここで「使う」(Eキー)だ！':'ここで「使う」を押そう！',sel:'#useBtn'},
  {id:'map',when:()=>state.qv.ui.map,t:()=>'このボタンで街へ行けるぞ',sel:'#mapBtn'},
  {id:'quest',when:()=>!!state.qv.done.cow,t:()=>'上の目標をタップすると、くわしく出るぞ',sel:'#quest'},
  {id:'week',when:()=>state.qv.ui.week,t:()=>'仕事が済んだら「次の週へ」だ',sel:'#weekBtn'},
  {id:'menu',when:()=>state.qv.ui.menu,t:()=>'メニューで牛やお金を見られるぞ',sel:'#menuOpenBtn'},
];
let v88T=0,v88LastTip=-99;
function v88Tick(dt){
  if(typeof state==='undefined'||!state||!state.qv)return;
  const qv=state.qv;qv.ui=qv.ui||{};qv.tips=qv.tips||{};
  const on=v88On();
  const b=document.body;
  if(!on){b.classList.remove('v88h-week','v88h-map','v88h-menu');return;}
  v88T+=dt;if(v88T<0.4)return;v88T=0;
  const u=v88Unlocks();
  for(const k of ['map','week','menu'])if(u[k])qv.ui[k]=1;
  b.classList.toggle('v88h-week',!qv.ui.week);b.classList.toggle('v88h-map',!qv.ui.map);b.classList.toggle('v88h-menu',!qv.ui.menu);
  if(window.v84Active||window.v84Hold)return;
  const now=performance.now()/1000;if(now-v88LastTip<7)return; // 一度に1つ
  const talk=document.getElementById('talk');if(talk&&talk.classList.contains('on'))return;
  const mn=document.getElementById('menu'),fs=document.getElementById('fiscal');if((mn&&mn.style.display==='flex')||(fs&&fs.style.display==='flex'))return;
  for(const tp of V88_TIPS){if(qv.tips[tp.id])continue;let ok=false;try{ok=tp.when();}catch(e){}
    if(ok){qv.tips[tp.id]=1;v88LastTip=now;v88Say(tp.t(),tp.sel);break;}}
}
