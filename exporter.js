/**
 * Exporter — 将配置导出为独立单文件 HTML
 */
function exportHTML(config) {
    const { title, items, theme, themeColors } = config;

    // 获取当前主题的 CSS 变量
    const cs = getComputedStyle(document.body);
    const bgPrimary = cs.getPropertyValue('--bg-primary').trim();
    const accent = cs.getPropertyValue('--accent').trim();
    const accentGradient = cs.getPropertyValue('--accent-gradient').trim();
    const textPrimary = cs.getPropertyValue('--text-primary').trim();
    const resultBg = cs.getPropertyValue('--result-bg').trim();
    const resultShadow = cs.getPropertyValue('--result-shadow').trim();
    const shadow = cs.getPropertyValue('--shadow').trim();

    const colorsJSON = JSON.stringify(themeColors);
    const itemsJSON = JSON.stringify(items);

    const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHTML(title || '转盘')}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Outfit','PingFang SC','Microsoft YaHei',sans-serif;background:${bgPrimary};color:${textPrimary};min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;overflow:hidden}
h1{font-size:1.4rem;font-weight:800;background:${accentGradient};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:16px;text-align:center}
.wrap{display:flex;flex-direction:column;align-items:center;gap:20px;width:100%;max-width:540px}
.canvas-wrap{width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center}
canvas{display:block}
.btn-spin{font-family:inherit;font-size:1.4rem;font-weight:800;letter-spacing:3px;padding:18px 60px;border:none;border-radius:50px;background:${accentGradient};color:#fff;cursor:pointer;box-shadow:0 8px 30px ${shadow};transition:transform .2s,box-shadow .2s;text-transform:uppercase}
.btn-spin:hover{transform:scale(1.05);box-shadow:0 12px 40px ${shadow}}
.btn-spin:active{transform:scale(.97)}
.btn-spin:disabled{opacity:.5;cursor:not-allowed;transform:none}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);display:flex;align-items:center;justify-content:center;z-index:1000;backdrop-filter:blur(4px);animation:fadeIn .25s}
.overlay.hidden{display:none}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
.result-card{background:${resultBg};border-radius:24px;padding:40px 48px;text-align:center;box-shadow:0 20px 60px ${resultShadow};animation:popIn .35s cubic-bezier(.175,.885,.32,1.275);max-width:380px;width:90%}
@keyframes popIn{from{opacity:0;transform:scale(.7)}to{opacity:1;transform:scale(1)}}
.result-label{font-size:.85rem;color:#888;margin-bottom:8px;text-transform:uppercase;letter-spacing:2px;font-weight:600}
.result-value{font-size:2rem;font-weight:800;background:${accentGradient};-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:24px;line-height:1.3}
.btn-close{font-family:inherit;font-weight:600;font-size:.95rem;border:none;border-radius:12px;padding:12px 28px;cursor:pointer;background:${accentGradient};color:#fff;box-shadow:0 4px 14px ${shadow}}
.btn-close:active{transform:scale(.96)}
@media(max-width:480px){.btn-spin{font-size:1.1rem;padding:14px 44px}.result-card{padding:28px 24px}.result-value{font-size:1.6rem}}
</style>
</head>
<body>
<div class="wrap">
<h1>${escapeHTML(title || '转盘')}</h1>
<div class="canvas-wrap"><canvas id="c"></canvas></div>
<button class="btn-spin" id="spinBtn" onclick="doSpin()">SPIN</button>
</div>
<div class="overlay hidden" id="overlay" onclick="closeResult()">
<div class="result-card" onclick="event.stopPropagation()">
<div class="result-label">🎉 恭喜你抽中了</div>
<div class="result-value" id="resultText"></div>
<button class="btn-close" onclick="closeResult()">再来一次</button>
</div>
</div>
<script>
var ITEMS=${itemsJSON};
var COLORS=${colorsJSON};
var TITLE=${JSON.stringify(title || '')};
var rotation=0,angularVelocity=0,isSpinning=false,lastTime=0,highlightIndex=-1,animId=null;
var canvas=document.getElementById('c'),ctx=canvas.getContext('2d');
function resize(){var p=canvas.parentElement;var s=Math.min(p.clientWidth,p.clientHeight,540);var d=window.devicePixelRatio||1;canvas.width=s*d;canvas.height=s*d;canvas.style.width=s+'px';canvas.style.height=s+'px';ctx.setTransform(d,0,0,d,0,0);draw()}
window.addEventListener('resize',resize);resize();
function draw(){var W=canvas.width/(window.devicePixelRatio||1),H=canvas.height/(window.devicePixelRatio||1);var cx=W/2,cy=H/2,R=Math.min(cx,cy)*.88;ctx.clearRect(0,0,canvas.width,canvas.height);if(!ITEMS.length)return;var tw=0;ITEMS.forEach(function(it){tw+=it.weight});if(tw<=0)return;
ctx.save();ctx.beginPath();ctx.arc(cx,cy,R+6,0,Math.PI*2);ctx.shadowColor='rgba(0,0,0,0.25)';ctx.shadowBlur=18;ctx.fillStyle='rgba(0,0,0,0.08)';ctx.fill();ctx.restore();
var sa=rotation;for(var i=0;i<ITEMS.length;i++){var sw=(ITEMS[i].weight/tw)*Math.PI*2;var ea=sa+sw;ctx.save();ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,R,sa,ea);ctx.closePath();var c=COLORS[i%COLORS.length];if(highlightIndex===i){ctx.fillStyle=c;ctx.fill();ctx.shadowColor=c;ctx.shadowBlur=24;ctx.fill()}else{ctx.fillStyle=c;ctx.fill();if(highlightIndex>=0){ctx.fillStyle='rgba(0,0,0,0.35)';ctx.fill()}}ctx.restore();
ctx.save();ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+R*Math.cos(sa),cy+R*Math.sin(sa));ctx.strokeStyle='rgba(255,255,255,0.7)';ctx.lineWidth=2;ctx.stroke();ctx.restore();
var ma=sa+sw/2,tr=R*.62,tx=cx+tr*Math.cos(ma),ty=cy+tr*Math.sin(ma);var mw=R*.42;var fs=Math.min(Math.max(R*.09,11),mw/Math.max(ITEMS[i].label.length,1)*1.7);var na=ma%(Math.PI*2);if(na<0)na+=Math.PI*2;var ta=(na>Math.PI/2&&na<Math.PI*1.5)?ma+Math.PI:ma;ctx.save();ctx.translate(tx,ty);ctx.rotate(ta);ctx.font='bold '+fs+'px "Outfit","PingFang SC",sans-serif';ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='rgba(0,0,0,0.5)';ctx.shadowBlur=4;ctx.fillText(ITEMS[i].label,0,0);ctx.restore();sa=ea}
var cr=R*.18;ctx.save();ctx.beginPath();ctx.arc(cx,cy,cr,0,Math.PI*2);ctx.fillStyle='#fff';ctx.shadowColor='rgba(0,0,0,0.2)';ctx.shadowBlur=10;ctx.fill();ctx.restore();
if(TITLE){var cf=Math.min(cr*.55,14);ctx.save();ctx.font='bold '+cf+'px "Outfit","PingFang SC",sans-serif';ctx.fillStyle='#333';ctx.textAlign='center';ctx.textBaseline='middle';var ml=6,l1=TITLE.substring(0,ml),l2=TITLE.length>ml?TITLE.substring(ml,ml*2):'';if(l2){ctx.fillText(l1,cx,cy-cf*.55);ctx.fillText(l2,cx,cy+cf*.55)}else{ctx.fillText(l1,cx,cy)}ctx.restore()}
var ps=R*.13,py=cy-R-2;ctx.save();ctx.beginPath();ctx.moveTo(cx,py+ps*1.5);ctx.lineTo(cx-ps*.6,py-ps*.3);ctx.lineTo(cx+ps*.6,py-ps*.3);ctx.closePath();ctx.fillStyle='#ff4757';ctx.shadowColor='rgba(0,0,0,0.3)';ctx.shadowBlur=6;ctx.fill();ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.stroke();ctx.restore()}
function doSpin(){if(isSpinning||ITEMS.length<2)return;isSpinning=true;highlightIndex=-1;document.getElementById('spinBtn').disabled=true;angularVelocity=16+Math.random()*10;lastTime=performance.now();animate()}
function animate(){var now=performance.now(),dt=Math.min((now-lastTime)/1000,.05);lastTime=now;angularVelocity*=Math.exp(-2.2*dt);angularVelocity*=1-Math.random()*.002;rotation+=angularVelocity*dt;rotation=rotation%(Math.PI*2);draw();if(angularVelocity<.08){angularVelocity=0;isSpinning=false;document.getElementById('spinBtn').disabled=false;resolve();return}animId=requestAnimationFrame(animate)}
function resolve(){var tw=0;ITEMS.forEach(function(it){tw+=it.weight});if(tw<=0)return;var pa=(-Math.PI/2-rotation)%(Math.PI*2);if(pa<0)pa+=Math.PI*2;var ca=0;for(var i=0;i<ITEMS.length;i++){ca+=(ITEMS[i].weight/tw)*Math.PI*2;if(pa<ca){highlightIndex=i;draw();showResult(ITEMS[i].label);return}}highlightIndex=ITEMS.length-1;draw();showResult(ITEMS[ITEMS.length-1].label)}
function showResult(t){document.getElementById('resultText').textContent=t;document.getElementById('overlay').classList.remove('hidden')}
function closeResult(){document.getElementById('overlay').classList.add('hidden')}
</script>
</body>
</html>`;

    // 下载
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (title || '转盘').replace(/[<>:"/\\|?*]/g, '_') + '.html';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

function escapeHTML(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
