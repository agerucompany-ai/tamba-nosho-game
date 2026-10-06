// =====================================================================
// v83: キャラを「1枚の設計図」から統一(タイトル・会話・ゲーム内が同一人物)
//  - 3Dトゥーンモデル(c3/<key>.glb: Tripo+自前リグ, 顔は設計図を投影焼き込み)
//  - Mixamoの本物モーション(c3/anim_lib.glb: 待機/歩き/走り/うなずき)を実行時に各キャラの骨格へ
//  - 歩き/走りの再生速度=移動速度÷モーション固有の接地速度(足すべり防止)
//  - まばたき・前髪ごしの目/眉・作業モーション・話しかけるとうなずく
// =====================================================================
const V83_KEYS={hero:1,atsushi:1,yusuke:1,naoto:1,ryunosuke:1,ami:1,yakuba:1,ginko:1,fudosan:1,shuriya:1,juui:1,nokyo:1,seriman:1,obaachan:1,ojiichan:1,shufu:1,kodomo:1};
let V83_LIB=null;const V83_DIR=(typeof location!=='undefined'&&/[?&]c3dir=([\w]+)/.exec(location.search)||[0,'c3'])[1];
function v83Lib(){if(!V83_LIB)V83_LIB=loadGLB(V83_DIR+'/anim_lib.glb');return V83_LIB;}
const V83_CFG={};
function v83Cfg(k){if(!V83_CFG[k])V83_CFG[k]=fetch(V83_DIR+'/'+k+'.json').then(r=>r.json()).then(j=>{if(/nopatch/.test(location.search))delete j.patch;return j;});return V83_CFG[k];}
function v83Img(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src;});}
const V83_OUTLINES=[];
async function v83LoadChar(key,height,onProg){
  const [g,lib,cfg]=await Promise.all([loadGLB(V83_DIR+'/'+key+'.glb',onProg),v83Lib(),v83Cfg(key)]);
  const model=g.scene;let mesh=null;model.traverse(o=>{if(o.isSkinnedMesh)mesh=o;});
  if(!mesh)throw new Error('no skinned mesh '+key);
  V83.restPose(model);model.updateMatrixWorld(true);
  // 身長(バインド姿勢の頂点)
  const pos=mesh.geometry.attributes.position,v=new THREE.Vector3();let y0=1e9,y1=-1e9;
  for(let i=0;i<pos.count;i+=5){v.fromBufferAttribute(pos,i).applyMatrix4(mesh.bindMatrix);if(v.y<y0)y0=v.y;if(v.y>y1)y1=v.y;}
  const sc=height/(y1-y0);
  mesh.material=V83.toonMat(mesh.material.map);
  // アニメ塗りの色をそのまま出す(フィルム調のトーンマップで色がくすまないように)
  mesh.material.toneMapped=false;mesh.material.color.setScalar(0.9);
  mesh.castShadow=true;mesh.receiveShadow=false;mesh.frustumCulled=false;
  const ol=V83.addOutline(mesh);ol.visible=GFX.level>0;V83_OUTLINES.push(ol);
  let eye=null;
  try{const im=await v83Img(V83_DIR+'/'+key+'_eye.webp');eye=V83.eyePatch(mesh,Object.assign({},cfg,{img:im,yaw:0,skin:cfg.skin||'#f8dcc4',lash:cfg.lash||'#3a2014'}));}catch(e){window.__v4dbg.errors.push('eye-'+key+':'+(e&&e.message||e));}
  if(eye){eye.material.toneMapped=false;eye.material.color.setScalar(0.9);}
  // モーションを焼く(モデル単体=縮尺1のうちに)
  const acts={},mixer=new THREE.AnimationMixer(model);
  for(const c of lib.animations){
    const nm=c.name.toLowerCase();
    const rc=V83.retarget(lib.scene,c,model,{name:nm,amp:nm==='run'?1.45:1});
    acts[nm]=mixer.clipAction(rc);
  }
  // 頭を1割大きく(スマホの小さい画面でも顔が読めるように)。リターゲットの後に
  const HB=V83.bones(model).Head;if(HB)HB.scale.setScalar(1.1);
  if(acts.agree){acts.agree.setLoop(THREE.LoopOnce,1);acts.agree.clampWhenFinished=false;}
  model.position.y=-y0;
  const inner=new THREE.Group();inner.add(model);inner.scale.setScalar(sc);
  const wrap=new THREE.Group();wrap.add(inner);
  const rig={v83:true,patch:V83.lastPatch,key,mixer,acts,cur:'',scale:sc,eye,model,mesh,wrap,
    speed:{walk:(acts.walk.getClip().userData.speed||1)*sc,run:(acts.run.getClip().userData.speed||2)*sc},work:0};
  acts.idle.play();rig.cur='idle';
  // 個体差: 待機の位相をずらす(全員が同じタイミングで呼吸しない)
  acts.idle.time=Math.random()*acts.idle.getClip().duration;
  mixer.update(0);
  return {wrap,rig};
}
// 歩き/走り/待機の切替。spd=実際の移動速度(ワールド単位/秒)
function v83Play(rig,name,spd){
  if(name==='walk'&&spd>rig.speed.walk*1.9)name='run'; // 速い時は走りモーション
  if(name==='run'&&spd>0&&spd<rig.speed.walk*1.5)name='walk';
  const to=rig.acts[name];if(!to)return;
  if(name==='walk'||name==='run'){
    to.timeScale=Math.max(0.55,Math.min(name==='run'?2.3:2.0,(spd||rig.speed[name])/rig.speed[name]));
  }
  if(rig.cur===name)return;
  if(rig.cur==='agree'&&name==='idle')return; // うなずき中は最後まで
  const from=rig.acts[rig.cur];
  to.enabled=true;to.setEffectiveWeight(1);
  if(name==='walk'||name==='run'){
    // 歩き⇔走りは足の位相をそろえてつなぐ
    if(from&&(rig.cur==='walk'||rig.cur==='run')){to.time=from.time/from.getClip().duration*to.getClip().duration;}else to.time=0;
    to.play();
  }else to.reset().play();
  if(from&&from!==to)from.crossFadeTo(to,name==='idle'?0.25:0.18,false);
  rig.cur=name;
}
function v83Nod(rig){
  if(!rig||!rig.v83||!rig.acts.agree||rig.cur==='walk'||rig.cur==='run')return;
  const a=rig.acts.agree,from=rig.acts[rig.cur];
  a.reset();a.timeScale=1.15;a.play();if(from&&from!==a)from.crossFadeTo(a,0.2,false);rig.cur='agree';
  setTimeout(()=>{if(rig.cur==='agree'){const i=rig.acts.idle;i.reset().play();a.crossFadeTo(i,0.35,false);rig.cur='idle';}},Math.max(600,a.getClip().duration/1.15*1000-350));
}
// 作業モーション(使う/取る): 0.75秒の前かがみ+両手を前へ。モーションの上に重ねる
const _v83ax=new THREE.Vector3(),_v83q=new THREE.Quaternion(),_v83pq=new THREE.Quaternion();
function v83RotWorld(b,axisW,ang){
  if(!b||!ang)return;
  b.parent.getWorldQuaternion(_v83pq);
  _v83ax.copy(axisW).applyQuaternion(_v83pq.invert());
  _v83q.setFromAxisAngle(_v83ax,ang);b.quaternion.premultiply(_v83q);b.updateMatrixWorld(true);
}
function v83Work(rig){if(rig&&rig.v83)rig.work=0.0001;}
const _v83X=new THREE.Vector3(),_v83Z=new THREE.Vector3(),_v83wq=new THREE.Quaternion();
// 画面外のキャラはアニメを止め、遠いキャラは間引いて更新(人数が増えても重くならない)
const _v83F=new THREE.Frustum(),_v83M=new THREE.Matrix4(),_v83S=new THREE.Sphere(),_v83P=new THREE.Vector3();let _v83FF=-1;
function v83Tick(rig,dt){
  if(!rig||!rig.v83)return;
  rig.acc=(rig.acc||0)+dt;
  if(typeof camera!=='undefined'&&camera&&rig.wrap&&rig!==playerRig){
    const fr=renderer&&renderer.info?renderer.info.render.frame:0;
    if(fr!==_v83FF){_v83FF=fr;_v83M.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);_v83F.setFromProjectionMatrix(_v83M);}
    rig.wrap.getWorldPosition(_v83P);
    _v83S.center.copy(_v83P);_v83S.center.y+=0.8;_v83S.radius=1.2;
    if(!_v83F.intersectsSphere(_v83S)){rig.acc=Math.min(rig.acc,0.5);return;}
    const d=_v83P.distanceTo(camera.position);
    if(d>40&&rig.acc<1/12)return;
    if(d>22&&rig.acc<1/24)return;
  }
  dt=Math.min(0.5,rig.acc);rig.acc=0;
  rig.mixer.update(dt);
  if(rig.eye)V83.tickBlink(rig.eye,dt);
  if(rig.work>0){
    rig.work+=dt;const T=0.75,t=rig.work;
    if(t>T){rig.work=0;return;}
    const w=t<0.18?t/0.18:(t>0.5?Math.max(0,(T-t)/(T-0.5)):1);
    const e=w*w*(3-2*w);
    if(!rig.B)rig.B=V83.bones(rig.model);
    const B=rig.B;rig.model.updateMatrixWorld(true);
    rig.model.getWorldQuaternion(_v83wq);
    _v83X.set(1,0,0).applyQuaternion(_v83wq); // キャラの左右軸
    v83RotWorld(B.Spine,_v83X,0.22*e);v83RotWorld(B.Spine1,_v83X,0.18*e);
    v83RotWorld(B.Neck,_v83X,0.12*e);v83RotWorld(B.Head,_v83X,0.1*e);
    v83RotWorld(B.LeftArm,_v83X,-0.85*e);v83RotWorld(B.RightArm,_v83X,-0.85*e);
    v83RotWorld(B.LeftForeArm,_v83X,-0.45*e);v83RotWorld(B.RightForeArm,_v83X,-0.45*e);
    v83RotWorld(B.LeftUpLeg,_v83X,-0.25*e);v83RotWorld(B.RightUpLeg,_v83X,-0.25*e);
    v83RotWorld(B.LeftLeg,_v83X,0.5*e);v83RotWorld(B.RightLeg,_v83X,0.5*e);
    v83RotWorld(B.LeftFoot,_v83X,-0.25*e);v83RotWorld(B.RightFoot,_v83X,-0.25*e);
    if(B.Hips){B.Hips.position.y-=0.03*e;B.Hips.updateMatrixWorld(true);}
  }
}
function v83SetOutlines(on){for(const o of V83_OUTLINES)o.visible=on;}
