"use strict";(()=>{var y={RECAPTCHA_SITE_KEY:typeof window<"u"&&window.__ENV__?.RECAPTCHA_SITE_KEY||"",ENABLE_RECAPTCHA:(typeof window<"u"&&window.__ENV__?.ENABLE_RECAPTCHA)===!0,API_ENDPOINT:"/api/analyze",API_STREAM_ENDPOINT:"/api/analyze/stream",USE_STREAMING:!0},I=document.getElementById("seo-form"),M=document.getElementById("url"),x=document.getElementById("submit-btn"),V=x.querySelector(".btn-text"),z=x.querySelector(".btn-loader"),O=document.getElementById("thinking-panel"),S=document.getElementById("thinking-content"),b=document.getElementById("results-section"),B=document.getElementById("results-summary"),P=document.getElementById("overall-score"),L=document.getElementById("download-pdf"),j=document.getElementById("download-json"),F=document.getElementById("download-text"),Y=document.getElementById("new-analysis"),k=document.getElementById("minimize-thinking"),f=document.getElementById("url-error"),m=null,p=null,A="",l=[];function q(){I.addEventListener("submit",J),L.addEventListener("click",()=>C("pdf")),j.addEventListener("click",()=>C("json")),F.addEventListener("click",()=>C("text")),Y.addEventListener("click",se),k.addEventListener("click",ae),M&&M.addEventListener("input",$),document.querySelectorAll('a[href^="#"]').forEach(e=>{e.addEventListener("click",t=>{t.preventDefault();let n=e.getAttribute("href");if(!n)return;let r=document.querySelector(n);if(r){let i=r.getBoundingClientRect().top+window.pageYOffset,s=parseInt(getComputedStyle(document.documentElement).scrollPaddingTop||"0")||16,a=i-s;window.scrollTo({top:a,behavior:"smooth"})}})})}async function J(e){e.preventDefault();let t=new FormData(I),n=t.get("url"),r=parseInt(String(t.get("maxPages")),10),i=Math.min(Math.max(Number.isNaN(r)?1:r,1),500),s=le(n);if(!s.isValid){de(s.error??"Please enter a valid website URL");return}$();let a=s.normalizedUrl??n,o="";if(y.ENABLE_RECAPTCHA)try{o=await W()}catch{R("reCAPTCHA verification failed. Please try again.");return}await G({url:a,mode:"site",maxPages:i},o)}function W(){return new Promise((e,t)=>{if(!y.RECAPTCHA_SITE_KEY){t(new Error("reCAPTCHA site key not configured"));return}if(typeof grecaptcha>"u"){t(new Error("reCAPTCHA not loaded"));return}grecaptcha.ready(()=>{grecaptcha.execute(y.RECAPTCHA_SITE_KEY,{action:"analyze"}).then(e).catch(t)})})}async function G(e,t){_(!0),re(),N(),K(e);try{if(y.USE_STREAMING){let n=await Z(e);m=n.report,p=n.siteReport,U(n.report,n.siteReport)}else{let n=await ee(e,t);m=n.report,p=n.siteReport,U(n.report,n.siteReport)}}catch(n){let r=n.message||"Analysis failed. Please try again.";X("error","Analysis failed",r,"error"),R(r)}finally{_(!1)}}function K(e){l=[{id:"validate",title:"Validating URL",status:"pending"},{id:"crawl",title:"Crawling website",status:"pending"},{id:"basic",title:"Running basic SEO checks",status:"pending"},{id:"intermediate",title:"Running intermediate checks",status:"pending"},{id:"advanced",title:"Running advanced checks",status:"pending"},{id:"pagespeed",title:"Fetching PageSpeed Insights",status:"pending"},{id:"crux",title:"Fetching Chrome UX Report (real-user metrics)",status:"pending"},{id:"report",title:"Generating report",status:"pending"}],T()}function X(e,t,n,r){let i=l.findIndex(s=>s.id===e);i>=0?l[i]={id:e,title:t,detail:n,status:r}:l.push({id:e,title:t,detail:n,status:r}),T()}function T(){S.innerHTML=l.map(t=>`
    <div class="thinking-step" data-step-id="${t.id}">
      <div class="step-icon ${t.status}">${Q(t.status)}</div>
      <div class="step-content">
        <div class="step-title">${t.title}</div>
        ${t.detail?`<div class="step-detail">${t.detail}</div>`:""}
      </div>
    </div>
  `).join("");let e=O.querySelector(".thinking-title");if(e){let t=l.find(r=>r.status==="running"),n=[...l].reverse().find(r=>r.status!=="pending");e.textContent=t?.title??n?.title??l[0]?.title??"AI Agent Thinking"}S.scrollTop=S.scrollHeight}function Q(e){switch(e){case"pending":return"\u25CB";case"running":return"\u25D0";case"done":return"\u2713";case"error":return"\u2717";case"warning":return"\u26A0";case"skipped":return"\u2212";default:return"\u25CB"}}function w(e,t,n){let r=l.find(i=>i.id===e);if(r){if(r.status=t,n!==void 0&&(r.detail=n),e==="report"&&t==="running"){let i=l.find(s=>s.id==="crux");i?.status==="pending"&&(i.status="skipped",i.detail="Skipped (no API key or not run)")}T()}}async function Z(e){return new Promise((t,n)=>{let r=!1,i=new URLSearchParams;i.set("url",e.url),i.set("depth","all"),i.set("mode","site"),i.set("maxPages",String(e.maxPages));let s=new EventSource(`${y.API_STREAM_ENDPOINT}?${i.toString()}`);s.addEventListener("step",a=>{let o=JSON.parse(a.data);w(o.id,o.status,o.detail||o.title)}),s.addEventListener("complete",a=>{let o=JSON.parse(a.data);A=o.textReport||"",r=!0,s.close(),t({report:o.report??null,siteReport:o.siteReport??null})}),s.addEventListener("error",a=>{if(s.close(),!r)if(a instanceof MessageEvent&&typeof a.data=="string"&&a.data)try{let o=JSON.parse(a.data);n(new Error(o.message||"Analysis failed"))}catch{n(new Error("Connection to server lost"))}else n(new Error("Connection to server lost"))}),setTimeout(()=>{s.readyState!==EventSource.CLOSED&&(s.close(),n(new Error("Analysis timed out. Please try again.")))},18e4)})}async function ee(e,t){(async()=>{w("validate","running"),await ce(300),w("validate","done"),w("crawl","running")})();let r={url:e.url,depth:"all",recaptchaToken:t,mode:"site",maxPages:e.maxPages},i=await fetch(y.API_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(r)}),s=await i.json();if(!i.ok||!s.success)throw new Error(s.error||"Analysis failed");return l.forEach(a=>{a.status="done"}),T(),A=s.textReport||"",{report:s.report??null,siteReport:s.siteReport??null}}function U(e,t){let n=t!=null&&t.pageAnalyses?.length>0,r=n?t.scores.averagePageScore:e?.scores.overall??0,i=P.querySelector(".score-value");if(i.textContent=String(r),P.style.background=te(r),P.style.color="#fff",n){let a=t.pageAnalyses.reduce((d,c)=>d+c.issues.length,0),o=t.pageAnalyses.reduce((d,c)=>d+c.criticalCount,0),u=t.pageAnalyses.reduce((d,c)=>d+c.warningCount,0),v=t.pageAnalyses.reduce((d,c)=>d+c.issues.filter(E=>E.status==="pass").length,0);B.innerHTML=`
      <div class="summary-card">
        <div class="value">${t.pageAnalyses.length}</div>
        <div class="label">Pages Analyzed</div>
      </div>
      <div class="summary-card passed">
        <div class="value">${v}</div>
        <div class="label">Passed</div>
      </div>
      <div class="summary-card failed">
        <div class="value">${o}</div>
        <div class="label">Critical</div>
      </div>
      <div class="summary-card warnings">
        <div class="value">${u}</div>
        <div class="label">Warnings</div>
      </div>
    `}else e&&(B.innerHTML=`
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
    `);let s=b.querySelector(".results-header h3");s&&(s.textContent=n?`Analysis Complete \u2014 Site (${t.pageAnalyses.length} pages)`:"Analysis Complete"),b.style.display="block",b.scrollIntoView({behavior:"smooth",block:"start"})}function te(e){return e>=90?"linear-gradient(135deg, #10b981 0%, #059669 100%)":e>=70?"linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)":e>=50?"linear-gradient(135deg, #f59e0b 0%, #d97706 100%)":"linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"}async function C(e){let t=m!=null,n=p!=null&&p.baseUrl!=null&&Array.isArray(p.pageAnalyses);if(!t&&!n)return;if(e==="pdf"){try{L.disabled=!0;let d=await fetch("/api/report/pdf",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(n?{siteReport:p}:{report:m})});if(!d.ok){let H=await d.json().catch(()=>({}));throw new Error(H.message||H.error||"PDF download failed")}let c=await d.blob(),E=URL.createObjectURL(c),h=document.createElement("a");h.href=E,h.download=n?`seo-site-report-${g()}.pdf`:`seo-report-${g()}.pdf`,document.body.appendChild(h),h.click(),document.body.removeChild(h),URL.revokeObjectURL(E)}catch(v){R(v.message)}finally{L.disabled=!1}return}let r,i,s;e==="json"?(r=JSON.stringify(n?p:m,null,2),i=n?`seo-site-report-${g()}.json`:`seo-report-${g()}.json`,s="application/json"):(r=A||(m?ne(m):""),i=n?`seo-site-report-${g()}.txt`:`seo-report-${g()}.txt`,s="text/plain");let a=new Blob([r],{type:s}),o=URL.createObjectURL(a),u=document.createElement("a");u.href=o,u.download=i,document.body.appendChild(u),u.click(),document.body.removeChild(u),URL.revokeObjectURL(o)}function ne(e){let t=["\u2550".repeat(70),"                        SEO ANALYSIS REPORT","\u2550".repeat(70),"",`URL: ${e.url}`,`Analyzed: ${new Date(e.analyzedAt).toLocaleString()}`,"","\u2500".repeat(70),"                           SCORES","\u2500".repeat(70),"",`  Overall:      ${e.scores.overall}/100`,`  Basic:        ${e.scores.basic}/100`,`  Intermediate: ${e.scores.intermediate}/100`,`  Advanced:     ${e.scores.advanced}/100`,"","\u2500".repeat(70),"                          SUMMARY","\u2500".repeat(70),"",`  Total Checks: ${e.summary.totalChecks}`,`  Passed:       ${e.summary.passed}`,`  Failed:       ${e.summary.failed}`,`  Warnings:     ${e.summary.warnings}`,""];if(e.pageSpeed){t.push("\u2500".repeat(70),"                     CORE WEB VITALS","\u2500".repeat(70),"");let n=e.pageSpeed.coreWebVitals;for(let[i,s]of Object.entries(n))if(s){let a=s.rating==="good"?"\u2713":s.rating==="needs-improvement"?"\u26A0":"\u2717";t.push(`  ${i.toUpperCase()}: ${a} ${s.displayValue}`)}t.push("","\u2500".repeat(70),"                    LIGHTHOUSE SCORES","\u2500".repeat(70),"");let r=e.pageSpeed.lighthouseScores;for(let[i,s]of Object.entries(r))s!==null&&t.push(`  ${i}: ${s}/100`);t.push("")}return t.push("\u2550".repeat(70),"                  End of SEO Analysis Report","\u2550".repeat(70)),t.join(`
`)}function g(){let e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`}function se(){I.reset(),$(),N(),ie(),m=null,p=null,A="",l=[];let e=document.getElementById("maxPages");e&&(e.value="1"),document.getElementById("analyze")?.scrollIntoView({behavior:"smooth"})}function _(e){x.disabled=e,V.style.display=e?"none":"inline",z.style.display=e?"flex":"none"}function re(){O.style.display="block"}function ie(){O.style.display="none"}function ae(){let e=S,t=e.style.display==="none";e.style.display=t?"block":"none";let n=k.querySelector(".thinking-chevron");n&&(n.textContent=t?"\u25BC":"\u25B2"),k.setAttribute("aria-expanded",String(t))}function N(){b.style.display="none"}function R(e){let t=document.createElement("div");t.className="toast-error",t.innerHTML=`
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
  `,document.body.appendChild(t),setTimeout(()=>{t.style.animation="slideOut 0.3s ease",setTimeout(()=>t.remove(),300)},5e3)}function oe(e){let t=e.trim();return!t||/^https?:\/\//i.test(t)?t:`https://${t}`}function le(e){let t=(e??"").trim();if(!t)return{isValid:!1,error:"Please enter a website URL"};try{let n=new URL(t);return n.protocol!=="http:"&&n.protocol!=="https:"?{isValid:!1,error:"URL must use http:// or https:// protocol"}:n.hostname?{isValid:!0,normalizedUrl:t}:{isValid:!1,error:"Please enter a valid URL starting with http:// or https://"}}catch{let n=oe(t);try{let r=new URL(n);return r.protocol!=="http:"&&r.protocol!=="https:"?{isValid:!1,error:"URL must use http:// or https:// protocol"}:{isValid:!0,normalizedUrl:n}}catch{return{isValid:!1,error:"Please enter a valid URL starting with http:// or https://"}}}}function de(e){f?(f.textContent=e,f.style.display="block"):R(e)}function $(){f&&(f.textContent="",f.style.display="none")}function ce(e){return new Promise(t=>setTimeout(t,e))}var D=document.createElement("style");D.textContent=`
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;document.head.appendChild(D);document.addEventListener("DOMContentLoaded",q);})();
//# sourceMappingURL=app.js.map
