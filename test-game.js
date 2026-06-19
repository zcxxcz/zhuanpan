const { JSDOM } = require("jsdom");
const fs = require("fs");

const html = fs.readFileSync("spy/index.html", "utf8");
const spoken = [];
const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true,
  beforeParse(w){
    // 模拟浏览器语音合成 API，用于测试「读给我听」
    w.SpeechSynthesisUtterance = function(t){ this.text=t; };
    w.speechSynthesis = { speak:u=>spoken.push(u.text), cancel:()=>{}, getVoices:()=>[] };
  }
});
const { window } = dom;
const doc = window.document;
const $ = s => doc.querySelector(s);
const click = el => el.dispatchEvent(new window.Event("click", { bubbles: true }));

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.log("  ✗ FAIL:", m); } };

// localStorage shim
const store = {};
Object.defineProperty(window, "localStorage", { value: {
  getItem: k => store[k] ?? null, setItem: (k,v)=>store[k]=String(v), removeItem:k=>delete store[k]
}});

function activeScreen(){ return [...doc.querySelectorAll(".screen")].find(s=>s.classList.contains("active")).id; }

console.log("== Test 1: 初始设置界面 ==");
ok(activeScreen()==="s-setup", "应停在设置页");
ok($("#v-players").textContent==="6", "默认 6 人");
ok($("#v-spies").textContent==="1", "默认 1 卧底");
ok($("#cat-grid").children.length===5, "5 个分类按钮");

console.log("== Test 1b: 题库分类可选 & 视觉状态 ==");
const cats=[...doc.querySelectorAll("#cat-grid .chip")];
ok(cats.every(c=>c.classList.contains("on")),"默认全部分类选中(.on)");
const firstCat=cats[0];
click(firstCat);
ok(!firstCat.classList.contains("on"),"点击后取消选中(.on 移除)");
ok(cats.filter(c=>c.classList.contains("on")).length===4,"现在剩 4 个选中");
click(firstCat);
ok(firstCat.classList.contains("on"),"再点恢复选中");
// 至少保留一个：全部取消到只剩 1 个时再点应被拦下
cats.slice(1).forEach(c=>click(c));
ok(cats.filter(c=>c.classList.contains("on")).length===1,"最多只能留到 1 个");
click(cats[0]);
ok(cats.filter(c=>c.classList.contains("on")).length===1,"已是最后一个时不能再取消");
cats.forEach(c=>{if(!c.classList.contains("on"))click(c);}); // 复原全选

console.log("== Test 2: 步进器 & 卧底上限 ==");
const plusSpy = [...doc.querySelectorAll('.stepper button')].find(b=>b.dataset.step==="spies"&&b.dataset.d==="1");
for(let i=0;i<10;i++) click(plusSpy);
ok(parseInt($("#v-spies").textContent) <= Math.floor((6-1)/2), "卧底数被限制为少数 (<=2 @6人)");

console.log("== Test 3: 设置 8 人 / 名字 / 开局 ==");
// 调回卧底=1
const minusSpy=[...doc.querySelectorAll('.stepper button')].find(b=>b.dataset.step==="spies"&&b.dataset.d==="-1");
for(let i=0;i<5;i++) click(minusSpy);
const plusP=[...doc.querySelectorAll('.stepper button')].find(b=>b.dataset.step==="players"&&b.dataset.d==="1");
for(let i=0;i<2;i++) click(plusP); // 6 -> 8
ok($("#v-players").textContent==="8","现在 8 人");
$("#names").value = "爸爸\n妈妈\n奶奶"; // 只填 3 个，其余自动编号
click($("#btn-start"));
ok(activeScreen()==="s-reveal","进入看词页");

console.log("== Test 4: 传阅看词 8 人全流程 + 读给我听 ==");
let spyCount=0, blankCount=0, civCount=0, wordsSeen=new Set();
for(let i=0;i<8;i++){
  ok($("#r-progress").textContent===`第 ${i+1} / 8 位`, `进度第 ${i+1} 位`);
  const before=$("#btn-next").style.display;
  ok(before==="none", `第 ${i+1} 位翻牌前隐藏下一步按钮(防偷看)`);
  click($("#r-card")); // 翻牌
  ok($("#btn-next").style.display!=="none", `第 ${i+1} 位翻牌后出现按钮`);
  const tag=$("#r-card .role-tag").textContent;
  const word=$("#r-card .word").textContent;
  // 读给我听按钮
  const sb=$("#r-speak");
  ok(sb, `第 ${i+1} 位出现「读给我听」按钮`);
  const n0=spoken.length; click(sb);
  ok(spoken.length===n0+1, `第 ${i+1} 位点朗读后触发语音`);
  if(tag.includes("白板")) { blankCount++; ok(spoken[spoken.length-1].includes("白板"),"白板朗读内容含'白板'"); }
  else { wordsSeen.add(word); ok(spoken[spoken.length-1].includes(word),`朗读内容含词「${word}」`); }
  click($("#btn-next"));
}
ok(activeScreen()==="s-play","8 人看完进入发言页");

console.log("== Test 5: 词的一致性（平民同词，卧底不同词）==");
// 两个词：平民词 & 卧底词，应恰好 2 种不同的词
ok(wordsSeen.size===2, `应只有 2 个不同的词，实际 ${wordsSeen.size}: ${[...wordsSeen]}`);

console.log("== Test 6: 发言顺序覆盖全部玩家 ==");
const chips=[...doc.querySelectorAll("#speak-order .chip")];
ok(chips.length===8,"发言顺序含 8 人");
const orderNames=new Set(chips.map(c=>c.textContent.replace(/^\s*\d+\s*/,"").trim()));
ok(orderNames.size===8,"发言顺序无重复");

console.log("== Test 7: 投票出局标记 ==");
const firstVote=$("#vote-list .vote");
click(firstVote);
ok($("#vote-list li").classList.contains("out"),"点投票后该玩家标记出局");

console.log("== Test 8: 揭晓结果 ==");
click($("#btn-reveal-result"));
ok(activeScreen()==="s-result","进入结果页");
ok($("#spy-names").textContent.length>0,"显示卧底名字");
const civ=$("#res-civ").textContent, spy=$("#res-spy").textContent;
ok(civ&&spy&&civ!==spy,`平民词(${civ}) 与 卧底词(${spy}) 不同`);
ok(wordsSeen.has(civ)&&wordsSeen.has(spy),"揭晓的两词与玩家看到的一致");
const resRows=[...doc.querySelectorAll("#result-list li")];
ok(resRows.length===8,"结果名单 8 人");
const spyRows=resRows.filter(r=>r.textContent.includes("卧底"));
ok(spyRows.length===1,"恰好 1 名卧底");

console.log("== Test 9: 自定义出题 ==");
click($("#btn-home"));
[...doc.querySelectorAll('#mode-seg button')].find(b=>b.dataset.mode==="custom").dispatchEvent(new window.Event("click",{bubbles:true}));
ok($("#custom-block").style.display!=="none","自定义输入框显示");
$("#word-civ").value="苹果"; $("#word-spy").value="梨";
click($("#btn-start"));
ok(activeScreen()==="s-reveal","自定义词也能开局");
let custWords=new Set();
for(let i=0;i<8;i++){ click($("#r-card")); custWords.add($("#r-card .word").textContent); click($("#btn-next")); }
ok([...custWords].every(w=>["苹果","梨"].includes(w)),"自定义词正确分发: "+[...custWords]);

console.log("== Test 10: 白板角色 ==");
click($("#btn-home"));
$("#t-blank").checked=true; $("#t-blank").dispatchEvent(new window.Event("change",{bubbles:true}));
[...doc.querySelectorAll('#mode-seg button')].find(b=>b.dataset.mode==="random").dispatchEvent(new window.Event("click",{bubbles:true}));
click($("#btn-start"));
let sawBlank=false;
for(let i=0;i<8;i++){ click($("#r-card")); if($("#r-card .role-tag").textContent.includes("白板")) sawBlank=true; click($("#btn-next")); }
ok(sawBlank,"启用白板后有人拿到白板");

console.log(`\n==== 结果: ${pass} 通过, ${fail} 失败 ====`);
process.exit(fail?1:0);
