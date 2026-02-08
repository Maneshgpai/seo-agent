"use strict";(()=>{var y={RECAPTCHA_SITE_KEY:typeof window<"u"&&window.__ENV__?.RECAPTCHA_SITE_KEY||"",ENABLE_RECAPTCHA:(typeof window<"u"&&window.__ENV__?.ENABLE_RECAPTCHA)===!0,API_ENDPOINT:"/api/analyze",API_STREAM_ENDPOINT:"/api/analyze/stream",USE_STREAMING:!0},k=document.getElementById("seo-form"),O=document.getElementById("submit-btn"),j=O.querySelector(".btn-text"),z=O.querySelector(".btn-loader"),I=document.getElementById("thinking-panel"),h=document.getElementById("thinking-content"),S=document.getElementById("results-section"),$=document.getElementById("results-summary"),R=document.getElementById("overall-score"),x=document.querySelectorAll(".toggle-btn"),_=document.getElementById("mode"),N=document.querySelector(".site-options"),L=document.getElementById("download-pdf"),F=document.getElementById("download-json"),V=document.getElementById("download-text"),q=document.getElementById("new-analysis"),C=document.getElementById("minimize-thinking"),g=null,m=null,T="",c=[];function Y(){k.addEventListener("submit",W),x.forEach(e=>{e.addEventListener("click",()=>J(e))}),L.addEventListener("click",()=>P("pdf")),F.addEventListener("click",()=>P("json")),V.addEventListener("click",()=>P("text")),q.addEventListener("click",ae),C.addEventListener("click",oe),document.querySelectorAll('a[href^="#"]').forEach(e=>{e.addEventListener("click",t=>{t.preventDefault();let n=e.getAttribute("href");if(!n)return;let a=document.querySelector(n);if(a){let i=a.getBoundingClientRect().top+window.pageYOffset,s=parseInt(getComputedStyle(document.documentElement).scrollPaddingTop||"0")||16,o=i-s;window.scrollTo({top:o,behavior:"smooth"})}})})}function J(e){x.forEach(n=>n.classList.remove("active")),e.classList.add("active");let t=e.dataset.mode;_.value=t,N.style.display=t==="site"?"block":"none"}async function W(e){e.preventDefault();let t=new FormData(k),n=t.get("url"),i=(document.querySelector(".toggle-btn.active")?.getAttribute("data-mode")||t.get("mode")||"single").trim().toLowerCase()==="site"?"site":"single",s=parseInt(String(t.get("maxPages")),10),o=Math.min(Math.max(Number.isNaN(s)?50:s,1),500);if(!le(n)){A("Please enter a valid URL starting with http:// or https://");return}let l="";if(y.ENABLE_RECAPTCHA)try{l=await G()}catch{A("reCAPTCHA verification failed. Please try again.");return}await K({url:n,mode:i,maxPages:i==="site"?o:void 0},l)}function G(){return new Promise((e,t)=>{if(!y.RECAPTCHA_SITE_KEY){t(new Error("reCAPTCHA site key not configured"));return}if(typeof grecaptcha>"u"){t(new Error("reCAPTCHA not loaded"));return}grecaptcha.ready(()=>{grecaptcha.execute(y.RECAPTCHA_SITE_KEY,{action:"analyze"}).then(e).catch(t)})})}async function K(e,t){B(!0),ie(),D(),X(e);try{if(y.USE_STREAMING){let n=await ee(e);g=n.report,m=n.siteReport,M(n.report,n.siteReport)}else{let n=await te(e,t);g=n.report,m=n.siteReport,M(n.report,n.siteReport)}}catch(n){let a=n.message||"Analysis failed. Please try again.";Q("error","Analysis failed",a,"error"),A(a)}finally{B(!1)}}function X(e){c=[{id:"validate",title:"Validating URL",status:"pending"},{id:"crawl",title:e.mode==="site"?"Crawling website":"Loading page",status:"pending"},{id:"basic",title:"Running basic SEO checks",status:"pending"},{id:"intermediate",title:"Running intermediate checks",status:"pending"},{id:"advanced",title:"Running advanced checks",status:"pending"},{id:"pagespeed",title:"Fetching PageSpeed Insights",status:"pending"},{id:"report",title:"Generating report",status:"pending"}],w()}function Q(e,t,n,a){let i=c.findIndex(s=>s.id===e);i>=0?c[i]={id:e,title:t,detail:n,status:a}:c.push({id:e,title:t,detail:n,status:a}),w()}function w(){h.innerHTML=c.map(t=>`
    <div class="thinking-step" data-step-id="${t.id}">
      <div class="step-icon ${t.status}">${Z(t.status)}</div>
      <div class="step-content">
        <div class="step-title">${t.title}</div>
        ${t.detail?`<div class="step-detail">${t.detail}</div>`:""}
      </div>
    </div>
  `).join("");let e=I.querySelector(".thinking-title");if(e){let t=c.find(a=>a.status==="running"),n=[...c].reverse().find(a=>a.status!=="pending");e.textContent=t?.title??n?.title??c[0]?.title??"AI Agent Thinking"}h.scrollTop=h.scrollHeight}function Z(e){switch(e){case"pending":return"\u25CB";case"running":return"\u25D0";case"done":return"\u2713";case"error":return"\u2717";case"warning":return"\u26A0";case"skipped":return"\u2212";default:return"\u25CB"}}function b(e,t,n){let a=c.find(i=>i.id===e);a&&(a.status=t,n!==void 0&&(a.detail=n),w())}async function ee(e){return new Promise((t,n)=>{let a=!1,i=e.mode==="site"?"site":"single",s=new URLSearchParams;s.set("url",e.url),s.set("depth","all"),s.set("mode",i),i==="site"&&e.maxPages!=null&&s.set("maxPages",String(e.maxPages));let o=new EventSource(`${y.API_STREAM_ENDPOINT}?${s.toString()}`);o.addEventListener("step",l=>{let r=JSON.parse(l.data);b(r.id,r.status,r.detail||r.title)}),o.addEventListener("complete",l=>{let r=JSON.parse(l.data);T=r.textReport||"",a=!0,o.close(),t({report:r.report??null,siteReport:r.siteReport??null})}),o.addEventListener("error",l=>{if(o.close(),!a)if(l instanceof MessageEvent&&typeof l.data=="string"&&l.data)try{let r=JSON.parse(l.data);n(new Error(r.message||"Analysis failed"))}catch{n(new Error("Connection to server lost"))}else n(new Error("Connection to server lost"))}),setTimeout(()=>{o.readyState!==EventSource.CLOSED&&(o.close(),n(new Error("Analysis timed out. Please try again.")))},18e4)})}async function te(e,t){(async()=>{b("validate","running"),await de(300),b("validate","done"),b("crawl","running")})();let a={url:e.url,depth:"all",recaptchaToken:t,mode:e.mode||"single"};e.mode==="site"&&e.maxPages!=null&&(a.maxPages=e.maxPages);let i=await fetch(y.API_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a)}),s=await i.json();if(!i.ok||!s.success)throw new Error(s.error||"Analysis failed");return c.forEach(o=>{o.status="done"}),w(),T=s.textReport||"",{report:s.report??null,siteReport:s.siteReport??null}}function M(e,t){let n=t!=null&&t.pageAnalyses?.length>0,a=n?t.scores.averagePageScore:e?.scores.overall??0,i=R.querySelector(".score-value");if(i.textContent=String(a),R.style.background=ne(a),R.style.color="#fff",n){let o=t.pageAnalyses.reduce((d,u)=>d+u.issues.length,0),l=t.pageAnalyses.reduce((d,u)=>d+u.criticalCount,0),r=t.pageAnalyses.reduce((d,u)=>d+u.warningCount,0),v=t.pageAnalyses.reduce((d,u)=>d+u.issues.filter(E=>E.status==="pass").length,0);$.innerHTML=`
      <div class="summary-card">
        <div class="value">${t.pageAnalyses.length}</div>
        <div class="label">Pages Analyzed</div>
      </div>
      <div class="summary-card passed">
        <div class="value">${v}</div>
        <div class="label">Passed</div>
      </div>
      <div class="summary-card failed">
        <div class="value">${l}</div>
        <div class="label">Critical</div>
      </div>
      <div class="summary-card warnings">
        <div class="value">${r}</div>
        <div class="label">Warnings</div>
      </div>
    `}else e&&($.innerHTML=`
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
    `);let s=S.querySelector(".results-header h3");s&&(s.textContent=n?`Analysis Complete \u2014 Site (${t.pageAnalyses.length} pages)`:"Analysis Complete"),S.style.display="block",S.scrollIntoView({behavior:"smooth",block:"start"})}function ne(e){return e>=90?"linear-gradient(135deg, #10b981 0%, #059669 100%)":e>=70?"linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)":e>=50?"linear-gradient(135deg, #f59e0b 0%, #d97706 100%)":"linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"}async function P(e){let t=g!=null,n=m!=null&&m.baseUrl!=null&&Array.isArray(m.pageAnalyses);if(!t&&!n)return;if(e==="pdf"){try{L.disabled=!0;let d=await fetch("/api/report/pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n?{siteReport:m}:{report:g})});if(!d.ok){let H=await d.json().catch(()=>({}));throw new Error(H.message||H.error||"PDF download failed")}let u=await d.blob(),E=URL.createObjectURL(u),f=document.createElement("a");f.href=E,f.download=n?`seo-site-report-${p()}.pdf`:`seo-report-${p()}.pdf`,document.body.appendChild(f),f.click(),document.body.removeChild(f),URL.revokeObjectURL(E)}catch(v){A(v.message)}finally{L.disabled=!1}return}let a,i,s;e==="json"?(a=JSON.stringify(n?m:g,null,2),i=n?`seo-site-report-${p()}.json`:`seo-report-${p()}.json`,s="application/json"):(a=T||(g?se(g):""),i=n?`seo-site-report-${p()}.txt`:`seo-report-${p()}.txt`,s="text/plain");let o=new Blob([a],{type:s}),l=URL.createObjectURL(o),r=document.createElement("a");r.href=l,r.download=i,document.body.appendChild(r),r.click(),document.body.removeChild(r),URL.revokeObjectURL(l)}function se(e){let t=["\u2550".repeat(70),"                        SEO ANALYSIS REPORT","\u2550".repeat(70),"",`URL: ${e.url}`,`Analyzed: ${new Date(e.analyzedAt).toLocaleString()}`,"","\u2500".repeat(70),"                           SCORES","\u2500".repeat(70),"",`  Overall:      ${e.scores.overall}/100`,`  Basic:        ${e.scores.basic}/100`,`  Intermediate: ${e.scores.intermediate}/100`,`  Advanced:     ${e.scores.advanced}/100`,"","\u2500".repeat(70),"                          SUMMARY","\u2500".repeat(70),"",`  Total Checks: ${e.summary.totalChecks}`,`  Passed:       ${e.summary.passed}`,`  Failed:       ${e.summary.failed}`,`  Warnings:     ${e.summary.warnings}`,""];if(e.pageSpeed){t.push("\u2500".repeat(70),"                     CORE WEB VITALS","\u2500".repeat(70),"");let n=e.pageSpeed.coreWebVitals;for(let[i,s]of Object.entries(n))if(s){let o=s.rating==="good"?"\u2713":s.rating==="needs-improvement"?"\u26A0":"\u2717";t.push(`  ${i.toUpperCase()}: ${o} ${s.displayValue}`)}t.push("","\u2500".repeat(70),"                    LIGHTHOUSE SCORES","\u2500".repeat(70),"");let a=e.pageSpeed.lighthouseScores;for(let[i,s]of Object.entries(a))s!==null&&t.push(`  ${i}: ${s}/100`);t.push("")}return t.push("\u2550".repeat(70),"                  End of SEO Analysis Report","\u2550".repeat(70)),t.join(`
`)}function p(){let e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`}function ae(){k.reset(),D(),re(),g=null,m=null,T="",c=[],x.forEach(e=>{e.classList.toggle("active",e.dataset.mode==="single")}),_.value="single",N.style.display="none",document.getElementById("analyze")?.scrollIntoView({behavior:"smooth"})}function B(e){O.disabled=e,j.style.display=e?"none":"inline",z.style.display=e?"flex":"none"}function ie(){I.style.display="block"}function re(){I.style.display="none"}function oe(){let e=h,t=e.style.display==="none";e.style.display=t?"block":"none";let n=C.querySelector(".thinking-chevron");n&&(n.textContent=t?"\u25BC":"\u25B2"),C.setAttribute("aria-expanded",String(t))}function D(){S.style.display="none"}function A(e){let t=document.createElement("div");t.className="toast-error",t.innerHTML=`
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
  `,document.body.appendChild(t),setTimeout(()=>{t.style.animation="slideOut 0.3s ease",setTimeout(()=>t.remove(),300)},5e3)}function le(e){try{let t=new URL(e);return t.protocol==="http:"||t.protocol==="https:"}catch{return!1}}function de(e){return new Promise(t=>setTimeout(t,e))}var U=document.createElement("style");U.textContent=`
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;document.head.appendChild(U);document.addEventListener("DOMContentLoaded",Y);})();
//# sourceMappingURL=app.js.map
