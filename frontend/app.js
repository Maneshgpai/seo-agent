"use strict";(()=>{var d={RECAPTCHA_SITE_KEY:typeof window<"u"&&window.__ENV__?.RECAPTCHA_SITE_KEY||"",ENABLE_RECAPTCHA:(typeof window<"u"&&window.__ENV__?.ENABLE_RECAPTCHA)===!0,API_ENDPOINT:"/api/analyze",API_STREAM_ENDPOINT:"/api/analyze/stream",USE_STREAMING:!0},f=document.getElementById("seo-form"),E=document.getElementById("submit-btn"),I=E.querySelector(".btn-text"),O=E.querySelector(".btn-loader"),w=document.getElementById("thinking-panel"),c=document.getElementById("thinking-content"),y=document.getElementById("results-section"),H=document.getElementById("results-summary"),S=document.getElementById("overall-score"),v=document.querySelectorAll(".toggle-btn"),L=document.getElementById("mode"),R=document.querySelector(".site-options"),x=document.getElementById("download-json"),_=document.getElementById("download-text"),$=document.getElementById("new-analysis"),k=document.getElementById("minimize-thinking"),l=null,g="",o=[];function M(){f.addEventListener("submit",N),v.forEach(e=>{e.addEventListener("click",()=>B(e))}),x.addEventListener("click",()=>T("json")),_.addEventListener("click",()=>T("text")),$.addEventListener("click",K),k.addEventListener("click",Q),document.querySelectorAll('a[href^="#"]').forEach(e=>{e.addEventListener("click",t=>{t.preventDefault(),document.querySelector(e.getAttribute("href"))?.scrollIntoView({behavior:"smooth"})})})}function B(e){v.forEach(n=>n.classList.remove("active")),e.classList.add("active");let t=e.dataset.mode;L.value=t,R.style.display=t==="site"?"block":"none"}async function N(e){e.preventDefault();let t=new FormData(f),n=t.get("email"),a=t.get("url"),s=t.get("depth"),i=t.get("mode"),r=parseInt(t.get("maxPages"))||50;if(!Z(n)){m("Please enter a valid email address");return}if(!ee(a)){m("Please enter a valid URL starting with http:// or https://");return}let h="";if(d.ENABLE_RECAPTCHA)try{h=await D()}catch{m("reCAPTCHA verification failed. Please try again.");return}await U({email:n,url:a,depth:s,mode:i,maxPages:i==="site"?r:void 0},h)}function D(){return new Promise((e,t)=>{if(!d.RECAPTCHA_SITE_KEY){t(new Error("reCAPTCHA site key not configured"));return}if(typeof grecaptcha>"u"){t(new Error("reCAPTCHA not loaded"));return}grecaptcha.ready(()=>{grecaptcha.execute(d.RECAPTCHA_SITE_KEY,{action:"analyze"}).then(e).catch(t)})})}async function U(e,t){A(!0),W(),P(),V(e);try{let n;d.USE_STREAMING?n=await j(e):n=await Y(e,t),l=n,q(n)}catch(n){let a=n.message||"Analysis failed. Please try again.";z("error","Analysis failed",a,"error"),m(a)}finally{A(!1)}}function V(e){o=[{id:"validate",title:"Validating URL",status:"pending"},{id:"crawl",title:e.mode==="site"?"Crawling website":"Loading page",status:"pending"}],o.push({id:"basic",title:"Running basic SEO checks",status:"pending"}),(e.depth==="intermediate"||e.depth==="all")&&o.push({id:"intermediate",title:"Running intermediate checks",status:"pending"}),e.depth==="all"&&o.push({id:"advanced",title:"Running advanced checks",status:"pending"},{id:"pagespeed",title:"Fetching PageSpeed Insights",status:"pending"}),o.push({id:"report",title:"Generating report",status:"pending"}),p()}function z(e,t,n,a){let s=o.findIndex(i=>i.id===e);s>=0?o[s]={id:e,title:t,detail:n,status:a}:o.push({id:e,title:t,detail:n,status:a}),p()}function p(){c.innerHTML=o.map(e=>`
    <div class="thinking-step" data-step-id="${e.id}">
      <div class="step-icon ${e.status}">${F(e.status)}</div>
      <div class="step-content">
        <div class="step-title">${e.title}</div>
        ${e.detail?`<div class="step-detail">${e.detail}</div>`:""}
      </div>
    </div>
  `).join(""),c.scrollTop=c.scrollHeight}function F(e){switch(e){case"pending":return"\u25CB";case"running":return"\u25D0";case"done":return"\u2713";case"error":return"\u2717";case"warning":return"\u26A0";case"skipped":return"\u2212";default:return"\u25CB"}}function u(e,t,n){let a=o.find(s=>s.id===e);a&&(a.status=t,n!==void 0&&(a.detail=n),p())}async function j(e){return new Promise((t,n)=>{let a=new URLSearchParams({url:e.url,depth:e.depth}),s=new EventSource(`${d.API_STREAM_ENDPOINT}?${a}`);s.addEventListener("step",i=>{let r=JSON.parse(i.data);u(r.id,r.status,r.detail||r.title)}),s.addEventListener("complete",i=>{let r=JSON.parse(i.data);g=r.textReport||"",s.close(),t(r.report)}),s.addEventListener("error",i=>{if(i instanceof MessageEvent){let r=JSON.parse(i.data);s.close(),n(new Error(r.message||"Analysis failed"))}else s.close(),l||n(new Error("Connection to server lost"))}),setTimeout(()=>{s.readyState!==EventSource.CLOSED&&(s.close(),n(new Error("Analysis timed out. Please try again.")))},18e4)})}async function Y(e,t){(async()=>{u("validate","running"),await te(300),u("validate","done"),u("crawl","running")})();let a=await fetch(d.API_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:e.url,email:e.email,depth:e.depth,recaptchaToken:t})}),s=await a.json();if(!a.ok||!s.success)throw new Error(s.error||"Analysis failed");return o.forEach(i=>{i.status="done"}),p(),g=s.textReport||"",s.report}function q(e){let t=S.querySelector(".score-value");t.textContent=e.scores.overall.toString(),S.style.background=G(e.scores.overall),H.innerHTML=`
    <div class="summary-card">
      <div class="value">${e.summary.totalChecks}</div>
      <div class="label">Total Checks</div>
    </div>
    <div class="summary-card passed">
      <div class="value">${e.summary.passed}</div>
      <div class="label">Passed</div>
    </div>
    <div class="summary-card failed">
      <div class="value">${e.summary.failed}</div>
      <div class="label">Failed</div>
    </div>
    <div class="summary-card warnings">
      <div class="value">${e.summary.warnings}</div>
      <div class="label">Warnings</div>
    </div>
  `,y.style.display="block",y.scrollIntoView({behavior:"smooth",block:"start"})}function G(e){return e>=90?"linear-gradient(135deg, #10b981 0%, #059669 100%)":e>=70?"linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)":e>=50?"linear-gradient(135deg, #f59e0b 0%, #d97706 100%)":"linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"}function T(e){if(!l)return;let t,n,a;e==="json"?(t=JSON.stringify(l,null,2),n=`seo-report-${b()}.json`,a="application/json"):(t=g||J(l),n=`seo-report-${b()}.txt`,a="text/plain");let s=new Blob([t],{type:a}),i=URL.createObjectURL(s),r=document.createElement("a");r.href=i,r.download=n,document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(i)}function J(e){let t=["\u2550".repeat(70),"                        SEO ANALYSIS REPORT","\u2550".repeat(70),"",`URL: ${e.url}`,`Analyzed: ${new Date(e.analyzedAt).toLocaleString()}`,"","\u2500".repeat(70),"                           SCORES","\u2500".repeat(70),"",`  Overall:      ${e.scores.overall}/100`,`  Basic:        ${e.scores.basic}/100`,`  Intermediate: ${e.scores.intermediate}/100`,`  Advanced:     ${e.scores.advanced}/100`,"","\u2500".repeat(70),"                          SUMMARY","\u2500".repeat(70),"",`  Total Checks: ${e.summary.totalChecks}`,`  Passed:       ${e.summary.passed}`,`  Failed:       ${e.summary.failed}`,`  Warnings:     ${e.summary.warnings}`,""];if(e.pageSpeed){t.push("\u2500".repeat(70),"                     CORE WEB VITALS","\u2500".repeat(70),"");let n=e.pageSpeed.coreWebVitals;for(let[s,i]of Object.entries(n))if(i){let r=i.rating==="good"?"\u2713":i.rating==="needs-improvement"?"\u26A0":"\u2717";t.push(`  ${s.toUpperCase()}: ${r} ${i.displayValue}`)}t.push("","\u2500".repeat(70),"                    LIGHTHOUSE SCORES","\u2500".repeat(70),"");let a=e.pageSpeed.lighthouseScores;for(let[s,i]of Object.entries(a))i!==null&&t.push(`  ${s}: ${i}/100`);t.push("")}return t.push("\u2550".repeat(70),"                  End of SEO Analysis Report","\u2550".repeat(70)),t.join(`
`)}function b(){let e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`}function K(){f.reset(),P(),X(),l=null,g="",o=[],v.forEach(e=>{e.classList.toggle("active",e.dataset.mode==="single")}),L.value="single",R.style.display="none",document.getElementById("analyze")?.scrollIntoView({behavior:"smooth"})}function A(e){E.disabled=e,I.style.display=e?"none":"inline",O.style.display=e?"flex":"none"}function W(){w.style.display="block"}function X(){w.style.display="none"}function Q(){let e=c,t=e.style.display==="none";e.style.display=t?"block":"none",k.textContent=t?"\u2212":"+"}function P(){y.style.display="none"}function m(e){let t=document.createElement("div");t.className="toast-error",t.innerHTML=`
    <span class="toast-icon">\u2717</span>
    <span class="toast-message">${e}</span>
  `,t.style.cssText=`
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: #ef4444;
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 0.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.875rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `,document.body.appendChild(t),setTimeout(()=>{t.style.animation="slideOut 0.3s ease",setTimeout(()=>t.remove(),300)},5e3)}function Z(e){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)}function ee(e){try{let t=new URL(e);return t.protocol==="http:"||t.protocol==="https:"}catch{return!1}}function te(e){return new Promise(t=>setTimeout(t,e))}var C=document.createElement("style");C.textContent=`
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;document.head.appendChild(C);document.addEventListener("DOMContentLoaded",M);})();
//# sourceMappingURL=app.js.map
