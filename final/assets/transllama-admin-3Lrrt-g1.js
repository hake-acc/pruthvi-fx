(function(){let e=`transllama.postsPreferences.v1`;function t(){let e=window.transllama||{},t=document.getElementById(`transllama-metabox-app`);return t?{...e,ajax_url:e.ajax_url||t.dataset.ajaxUrl||``,nonce:e.nonce||t.dataset.nonce||``,post_id:e.post_id||parseInt(t.dataset.postId,10)||0,context:e.context||`metabox`}:e}let n=t(),r={"gpt-4.1-mini":{input:.4,output:1.6},"gpt-4.1-nano":{input:.1,output:.4},"gpt-4.1":{input:2,output:8},"claude-sonnet-4-20250514":{input:3,output:15},"claude-3-5-haiku-20241022":{input:.8,output:4},"claude-3-7-sonnet-20250219":{input:3,output:15}},i=(e,t,n)=>{let i=r[e];return!i||!t&&!n?null:t/1e6*i.input+n/1e6*i.output},a=e=>e===null?``:e<.01?`$${e.toFixed(4)}`:`$${e.toFixed(3)}`,o=`page`,s=1,c=``,l=`all`,u=`asc`,d=null,f=new Set,p=[],m=null,h=null,g=2500;function ee(){return n.context===`metabox`||!!document.getElementById(`transllama-metabox-app`)}function _(){let e=document.getElementById(`transllama-metabox-app`);return e&&e.dataset.postId?parseInt(e.dataset.postId,10):n.post_id||0}function v(e){ee()?S(e):x(e)}document.addEventListener(`DOMContentLoaded`,()=>{if(n=t(),k(),document.getElementById(`transllama-metabox-app`)){ce();return}let e=document.getElementById(`transllama-app`);if(!e)return;let r=e.dataset.page;r===`posts`?te():r===`settings`?R():r===`tone-of-voice`?z():r===`instructions`&&B()});function te(){let e=document.getElementById(`transllama-posts-container`);e&&(_e(),e.innerHTML=ne(),re(),ie(),b(),x())}function y(){return n.settings?!!(n.settings.has_api_key||n.settings.has_anthropic_key):!1}function ne(){let e=n.post_types||{},t=Object.entries(e).map(([e,t])=>`<a href="#" class="tl-tab${e===o?` is-active`:``}" data-type="${e}">${t.name}</a>`).join(``);return`
            <div id="tl-live-region" class="tl-sr-only" aria-live="polite" role="status"></div>
            ${y()?``:`<div class="tl-notice tl-notice--warning">
                <strong>No API key configured.</strong>
                Translation and proofreading actions are disabled. Please add your API key in <a href="${n.settings_url||`admin.php?page=transllama-settings`}">Settings</a>.
            </div>`}
            <div class="tl-tabs">${t}</div>
            <div class="tl-toolbar">
                <input type="text" id="tl-search" class="tl-search" placeholder="Search posts..." value="${c}">
                <select id="tl-status-filter" class="tl-status-filter" aria-label="Filter posts by translation status">
                    <option value="all" ${l===`all`?`selected`:``}>All</option>
                    <option value="untranslated" ${l===`untranslated`?`selected`:``}>Untranslated</option>
                    <option value="draft" ${l===`draft`?`selected`:``}>Draft</option>
                    <option value="completed" ${l===`completed`?`selected`:``}>Completed</option>
                    <option value="failed" ${l===`failed`?`selected`:``}>Failed</option>
                </select>
            </div>
            <div id="tl-posts-table" class="tl-table-wrap"></div>
            <div id="tl-pagination" class="tl-pagination"></div>
        `}function re(){document.querySelectorAll(`.tl-tab`).forEach(e=>{e.addEventListener(`click`,t=>{t.preventDefault(),document.querySelectorAll(`.tl-tab`).forEach(e=>e.classList.remove(`is-active`)),e.classList.add(`is-active`),o=e.dataset.type,s=1,J(),x()})})}function ie(){let e=document.getElementById(`tl-search`);if(!e)return;let t;e.addEventListener(`input`,()=>{clearTimeout(t),t=setTimeout(()=>{c=e.value,s=1,J(),x()},400)})}function b(){let e=document.getElementById(`tl-status-filter`);e&&e.addEventListener(`change`,()=>{l=e.value||`all`,s=1,J(),x()})}function x(e){let t=document.getElementById(`tl-posts-table`);t&&(e||(t.innerHTML=`<div class="tl-loading">Loading...</div>`),G(`transllama_get_posts`,{post_type:o,paged:s,search:c,status_filter:l}).then(n=>{let r=ge(n.posts||[]);p=r,n.posts=r,e&&t.querySelector(`.tl-table`)?oe(n):(se(n),de(n)),P(n.posts),J()}).catch(n=>{console.error(`[TransLlama] loadPosts error:`,n),e||(t.innerHTML=`<div class="tl-error">${n}</div>`)}))}function ae(){return!!document.querySelector(`.tl-dropdown-menu.is-open`)}function oe(e){if(!e.posts)return;let t=W();e.posts.forEach(e=>{let n=document.querySelector(`tr[data-post-id="${e.id}"]`);if(!n)return;let r=n.querySelectorAll(`.tl-lang-col`);t.forEach((t,n)=>{let i=r[n];if(!i)return;let a=e.languages[t.code]||{},o=T(e,t.code,a);i.innerHTML!==o&&(i.innerHTML=o)});let i=n.querySelector(`.tl-actions-col`);i&&(i.querySelector(`.tl-dropdown-menu.is-open`)||(i.innerHTML=D(e)))}),k()}function se(e){let t=document.getElementById(`tl-posts-table`),n=W();if(!e.posts||e.posts.length===0){t.innerHTML=`<div class="tl-empty">No posts found.</div>`;return}let r=n.map(e=>`<th class="tl-lang-col"><span title="${e.display_name}">${e.flag_url?`<img src="${e.flag_url}" alt="${e.code}" class="tl-flag">`:e.code.toUpperCase()}</span></th>`).join(``),i=e.posts.map(e=>{let t=n.map(t=>{let n=e.languages[t.code]||{};return`<td class="tl-lang-col">${T(e,t.code,n)}</td>`}).join(``);return`
                <tr data-post-id="${e.id}">
                    <td class="tl-title-col">
                        <a href="${e.edit_url}" target="_blank">${q(e.title)}</a>
                    </td>
                    ${t}
                    <td class="tl-actions-col">${D(e)}</td>
                </tr>
            `}).join(``),a=he();t.innerHTML=`
            <table class="tl-table widefat striped">
                <thead>
                    <tr>
                        <th class="tl-title-col">
                            <a href="#" class="tl-sort-link" data-sort-column="title" title="Sort by title">
                                ${a&&a.flag_url?`<img src="${a.flag_url}" alt="${a.code}" class="tl-flag"> `:``}Title ${u===`asc`?`&#8593;`:`&#8595;`}
                            </a>
                        </th>
                        ${r}
                        <th class="tl-actions-col">Actions</th>
                    </tr>
                </thead>
                <tbody>${i}</tbody>
            </table>
        `,L()}function ce(){!document.getElementById(`tl-metabox-root`)||!_()||S()}function S(e){let t=document.getElementById(`tl-metabox-root`),n=_();!t||!n||(e||(t.innerHTML=`<div class="tl-loading">Loading...</div>`),G(`transllama_get_post`,{post_id:n}).then(n=>{m=n.post||null,e&&t.querySelector(`.tl-metabox`)?w(m):le(m),m&&P([m])}).catch(n=>{console.error(`[TransLlama] loadPostStatus error:`,n),e||(t.innerHTML=`<div class="tl-error">${q(typeof n==`string`?n:`Failed to load`)}</div>`)}))}function le(e){let t=document.getElementById(`tl-metabox-root`);if(!t||!e){t&&(t.innerHTML=`<div class="tl-empty">No translation data.</div>`);return}t.innerHTML=`
            <div id="tl-live-region" class="tl-sr-only" aria-live="polite" role="status"></div>
            <div class="tl-metabox">
                ${y()?``:`<div class="tl-notice tl-notice--warning tl-metabox-notice">
                <strong>No API key configured.</strong>
                Actions are disabled. <a href="${n.settings_url||`admin.php?page=transllama-settings`}">Settings</a>
            </div>`}
                <div class="tl-metabox-langs">${W().map(t=>{let n=e.languages[t.code]||{},r=t.flag_url?`<img src="${t.flag_url}" alt="${t.code}" class="tl-flag">`:`<span class="tl-lang-code">${t.code.toUpperCase()}</span>`;return`
                <div class="tl-metabox-lang" data-lang="${t.code}">
                    <div class="tl-metabox-lang__head">
                        <span class="tl-metabox-lang__label">${r}<span class="tl-metabox-lang__name">${q(n.display_name||t.display_name)}</span></span>
                        <span class="tl-metabox-lang__status">${T(e,t.code,n)}</span>
                    </div>
                    <div class="tl-metabox-lang__actions">
                        <span class="tl-action-grid-label">TR</span>
                        <span class="tl-action-grid-label">PL</span>
                        <span class="tl-action-grid-label">PR</span>
                        <span class="tl-action-grid-label">PB</span>
                        ${C(e,t,n)}
                    </div>
                </div>
            `}).join(``)}</div>
                <div class="tl-metabox-footer">
                    ${y()?`<button type="button" class="button button-primary tl-metabox-translate-all tl-action" data-action="translate-all" data-post-id="${e.id}">Translate All Missing</button>`:`<button type="button" class="button button-primary" disabled title="API key required">Translate All Missing</button>`}
                    <a href="${n.hub_url||`admin.php?page=transllama`}" class="tl-metabox-hub-link">Open AI Translations hub</a>
                </div>
            </div>
        `}function C(e,t,n){if(!y())return`<span class="tl-action-btn tl-action-btn--disabled">TR</span><span class="tl-action-btn tl-action-btn--disabled">PL</span><span class="tl-action-btn tl-action-btn--disabled">PR</span><span class="tl-action-btn tl-action-btn--disabled">PB</span>`;let r=n.status===`translated`||n.status===`draft`,i=n.status===`draft`&&n.post_id,a=[`in_progress`,`running`,`pending`].includes(n.status),o=r?`Re-translate ${t.display_name}`:`Translate ${t.display_name}`;return`${a?`<span class="tl-action-btn tl-action-btn--disabled" title="Job in progress">TR</span>`:`<a href="#" class="tl-action-btn tl-action" data-action="translate" data-post-id="${e.id}" data-lang="${t.code}" title="${o}">TR</a>`}${a?`<span class="tl-action-btn tl-action-btn--disabled" title="Job in progress">PL</span>`:`<a href="#" class="tl-action-btn tl-action" data-action="pipeline" data-post-id="${e.id}" data-lang="${t.code}" title="Translate → Proofread → Publish ${t.display_name}">PL</a>`}${r&&!a?`<a href="#" class="tl-action-btn tl-action" data-action="proofread" data-post-id="${e.id}" data-lang="${t.code}" title="Proofread ${t.display_name}">PR</a>`:`<span class="tl-action-btn tl-action-btn--disabled" title="${a?`Job in progress`:`No translation to proofread`}">PR</span>`}${i&&!a?`<a href="#" class="tl-action-btn tl-action-btn--publish tl-action" data-action="publish" data-post-id="${n.post_id}" data-lang="${t.code}" title="Publish ${t.display_name}">PB</a>`:`<span class="tl-action-btn tl-action-btn--disabled" title="${i?`Job in progress`:`No draft to publish`}">PB</span>`}`}function w(e){e&&W().forEach(t=>{let n=document.querySelector(`.tl-metabox-lang[data-lang="${t.code}"]`);if(!n)return;let r=e.languages[t.code]||{},i=n.querySelector(`.tl-metabox-lang__status`),a=n.querySelector(`.tl-metabox-lang__actions`);if(i){let n=T(e,t.code,r);i.innerHTML!==n&&(i.innerHTML=n)}a&&(a.innerHTML=`
                    <span class="tl-action-grid-label">TR</span>
                    <span class="tl-action-grid-label">PL</span>
                    <span class="tl-action-grid-label">PR</span>
                    <span class="tl-action-grid-label">PB</span>
                    ${C(e,t,r)}
                `)})}function T(e,t,n){let r=n.status||`not_translated`,o=n.job,s=n.proofread_summary||null,c=n.by_transllama||o?`<a href="#" class="tl-audit-log" data-post-id="${e.id}" data-lang="${t}" title="View translation audit log" aria-label="View audit log"><span aria-hidden="true">&#128337;</span></a>`:``;if(r===`in_progress`||r===`running`){let e=o&&o.current_section?o.current_section:``,t=o?o.sections_done:0,n=o?o.sections_total:0,r=o&&o.progress||0,i=o&&o.task_type===`proofread`?`PR`:`TR`,a=n>0?`${t}/${n}`:`Starting...`,s=e?`Working on: ${e}`:`Processing...`,l=o?` <a href="#" class="tl-cancel-job" data-job-id="${o.id}" title="Cancel this job" aria-label="Cancel job">&times;</a>`:``,u=`<div class="tl-progress-bar" role="progressbar" aria-valuenow="${r}" aria-valuemin="0" aria-valuemax="100" aria-label="Translation progress"><div class="tl-progress-bar__fill" style="width:${r}%"></div></div>`;return`<span class="tl-badge tl-badge--progress" title="${q(s)}">${i} ${a}${l}${u}</span>${c}`}if(r===`pending`)return`<span class="tl-badge tl-badge--queued" title="Waiting for queue to start">${o&&o.task_type===`proofread`?`PR`:`TR`} Queued${o?` <a href="#" class="tl-cancel-job" data-job-id="${o.id}" title="Cancel this job" aria-label="Cancel job">&times;</a>`:``}<div class="tl-progress-bar tl-progress-bar--indeterminate" role="progressbar" aria-label="Waiting in queue"><div class="tl-progress-bar__fill"></div></div></span>${c}`;if(r===`failed`){let n=o?o.message:`Failed`,r=o&&o.task_type||`translate`,i=o&&o.target_lang||t,a=`<a href="#" class="tl-retry-btn" data-action="${r}" data-post-id="${e.id}" data-lang="${i}" title="Retry" aria-label="Retry ${r}">↻</a>`;return`<span class="tl-badge tl-badge--failed" title="${q(n)}">Failed ${a}</span>${c}`}if(r===`completed_with_errors`)return`<span class="tl-badge tl-badge--warning" title="${q(o?o.message:`Completed with errors`)}">Partial</span>${c}`;let l=s?` <a href="#" class="tl-pr-report" data-summary='${E(JSON.stringify(s))}' title="View proofread report" aria-label="View proofread report"><span aria-hidden="true">&#9998;</span></a>`:``;if(r===`draft`){let e=n.post_id?`post.php?post=${n.post_id}&action=edit`:``,t=n.by_transllama,r=t?`<span class="tl-ai-icon" title="Translated by TransLlama" aria-label="AI translated"><span aria-hidden="true">⚡</span></span>`:``,s=t?`Draft — translated by TransLlama`:`Draft translation (manual)`;if(t&&o){let e=o.tokens_input||0,t=o.tokens_output||0,n=e+t;if(n>0){s+=` · ${n.toLocaleString()} tokens`;let r=i(o.model,e,t);r!==null&&(s+=` · Cost: ${a(r)}`)}o.model&&(s+=` · Model: ${o.model}`)}return(e?`<a href="${e}" class="tl-badge tl-badge--draft" title="${q(s)}">${r}Draft</a>`:`<span class="tl-badge tl-badge--draft" title="${q(s)}">${r}Draft</span>`)+l+c}if(r===`translated`){let e=n.post_id?`post.php?post=${n.post_id}&action=edit`:``,t=n.by_transllama,r=t?`<span class="tl-ai-icon" title="Translated by TransLlama" aria-label="AI translated"><span aria-hidden="true">⚡</span></span>`:``,s=t?`Translated by TransLlama`:`Manual translation`;if(t&&o){let e=o.tokens_input||0,t=o.tokens_output||0,n=e+t;if(n>0){s+=` · ${n.toLocaleString()} tokens`;let r=i(o.model,e,t);r!==null&&(s+=` · Cost: ${a(r)}`)}o.model&&(s+=` · Model: ${o.model}`)}return(e?`<a href="${e}" class="tl-badge tl-badge--translated" title="${q(s)}">${r}Done</a>`:`<span class="tl-badge tl-badge--translated" title="${q(s)}">${r}Done</span>`)+l+c}return`<span class="tl-badge tl-badge--none">&mdash;</span>`}function E(e){return e?e.replace(/&/g,`&amp;`).replace(/'/g,`&#39;`).replace(/"/g,`&quot;`).replace(/</g,`&lt;`).replace(/>/g,`&gt;`):``}function D(e){if(!y())return`<button type="button" class="button" disabled title="API key required">Actions ▾</button>`;let t=W().map(t=>{let n=e.languages[t.code]||{},r=n.status===`translated`||n.status===`draft`,i=n.status===`draft`&&n.post_id,a=[`in_progress`,`running`,`pending`].includes(n.status),o=t.flag_url?`<img src="${t.flag_url}" alt="${t.code}" class="tl-flag">`:`<span class="tl-lang-code">${t.code.toUpperCase()}</span>`,s=r?`Re-translate ${t.display_name}`:`Translate ${t.display_name}`,c=a?`<span class="tl-action-btn tl-action-btn--disabled" title="Job in progress">TR</span>`:`<a href="#" class="tl-action-btn tl-action" data-action="translate" data-post-id="${e.id}" data-lang="${t.code}" title="${s}">TR</a>`,l=a?`<span class="tl-action-btn tl-action-btn--disabled" title="Job in progress">PL</span>`:`<a href="#" class="tl-action-btn tl-action" data-action="pipeline" data-post-id="${e.id}" data-lang="${t.code}" title="Translate → Proofread → Publish ${t.display_name}">PL</a>`,u=r&&!a?`<a href="#" class="tl-action-btn tl-action" data-action="proofread" data-post-id="${e.id}" data-lang="${t.code}" title="Proofread ${t.display_name}">PR</a>`:`<span class="tl-action-btn tl-action-btn--disabled" title="${a?`Job in progress`:`No translation to proofread`}">PR</span>`,d=i&&!a?`<a href="#" class="tl-action-btn tl-action-btn--publish tl-action" data-action="publish" data-post-id="${n.post_id}" data-lang="${t.code}" title="Publish ${t.display_name}">PB</a>`:`<span class="tl-action-btn tl-action-btn--disabled" title="${i?`Job in progress`:`No draft to publish`}">PB</span>`;return`<div class="tl-action-row" role="menuitem">${o}<span class="tl-action-row__name">${t.display_name}</span><span class="tl-action-row__btns">${c}${l}${u}${d}</span></div>`}).join(``);return`
            <div class="tl-dropdown">
                <button type="button" class="button tl-dropdown-toggle" aria-haspopup="true" aria-expanded="false">Actions ▾</button>
                <div class="tl-dropdown-menu" role="menu">
                    <a href="#" class="tl-action tl-action--primary" role="menuitem" data-action="translate-all" data-post-id="${e.id}">Translate All Missing</a>
                    <div class="tl-dropdown-divider" role="separator"></div>
                    <div class="tl-action-grid-header">
                        <span></span><span></span>
                        <span class="tl-action-grid-label">TR</span>
                        <span class="tl-action-grid-label">PL</span>
                        <span class="tl-action-grid-label">PR</span>
                        <span class="tl-action-grid-label">PB</span>
                    </div>
                    ${t}
                </div>
            </div>
        `}let O=!1;function k(){if(O)return;O=!0,document.addEventListener(`click`,e=>{let t=e.target.closest(`.tl-dropdown-toggle`);if(t){e.stopPropagation();let n=t.nextElementSibling,r=n.classList.contains(`is-open`);if(X(),!r){n.classList.add(`is-open`),t.setAttribute(`aria-expanded`,`true`),ye(t,n);let e=n.querySelector(`[role="menuitem"]`);e&&e.focus()}return}let n=e.target.closest(`.tl-retry-btn`);if(n){e.preventDefault(),e.stopPropagation(),j(n.dataset.action,parseInt(n.dataset.postId,10),n.dataset.lang||``);return}let r=e.target.closest(`.tl-pr-report`);if(r){e.preventDefault(),e.stopPropagation();try{fe(JSON.parse(r.dataset.summary))}catch(e){console.error(`[TransLlama] Failed to parse proofread summary:`,e)}return}let i=e.target.closest(`.tl-audit-log`);if(i){e.preventDefault(),e.stopPropagation();let t=parseInt(i.dataset.postId,10),n=i.dataset.lang||``;t&&n&&pe(t,n);return}let a=e.target.closest(`.tl-cancel-job`);if(a){e.preventDefault(),e.stopPropagation();let t=parseInt(a.dataset.jobId,10);t&&confirm(`Cancel this job?`)&&G(`transllama_cancel_job`,{job_id:t}).then(()=>{Y(`Job cancelled`),v(!0)}).catch($);return}let o=e.target.closest(`.tl-action`);if(o){e.preventDefault(),e.stopPropagation(),X(),j(o.dataset.action,parseInt(o.dataset.postId,10),o.dataset.lang||``);return}}),document.addEventListener(`click`,X);let e=document.getElementById(`transllama-posts-container`);e&&e.addEventListener(`keydown`,t=>{let n=e.querySelector(`.tl-dropdown-menu.is-open`);if(!n)return;if(t.key===`Escape`){t.preventDefault(),X();let e=n.querySelector(`.tl-dropdown-toggle`)||n.previousElementSibling;e&&e.focus();return}let r=Array.from(n.querySelectorAll(`a.tl-action:not(.tl-action-btn--disabled)`));if(!r.length)return;let i=r.indexOf(document.activeElement);t.key===`ArrowDown`?(t.preventDefault(),r[i<r.length-1?i+1:0].focus()):t.key===`ArrowUp`?(t.preventDefault(),r[i>0?i-1:r.length-1].focus()):t.key===`Home`?(t.preventDefault(),r[0].focus()):t.key===`End`&&(t.preventDefault(),r[r.length-1].focus())})}function A(e,t){let n=p.find(t=>t.id===e);if(!n&&m&&m.id===e&&(n=m),!n)return!1;if(t){let e=n.languages[t]||{};return e.status===`translated`||e.status===`draft`}return Object.values(n.languages||{}).some(e=>e.status===`translated`||e.status===`draft`)}function j(e,t,n){if((e===`translate`||e===`translate-all`||e===`pipeline`)&&(e===`translate`?A(t,n):e===`translate-all`?A(t):A(t,n))){let t=e===`translate`?`the ${n} translation`:e===`translate-all`?`existing translations`:`the ${n} translation`;if(!confirm(`This will overwrite ${t}. A snapshot of the current content will be saved. Continue?`))return}n&&ue(t,n,e===`proofread`?`proofread`:`translate`),e===`translate`?G(`transllama_translate`,{post_id:t,target_lang:n}).then(e=>{e.job_id&&f.add(e.job_id),Y(e.message||`Translation scheduled`),v(!0),M()}).catch($):e===`translate-all`?G(`transllama_translate`,{post_id:t,translate_all:1}).then(e=>{e.job_ids&&e.job_ids.forEach(e=>f.add(e)),Y(e.message||`All translations scheduled`),v(!0),M()}).catch($):e===`proofread`?G(`transllama_proofread`,{post_id:t,target_lang:n}).then(e=>{e.job_id&&f.add(e.job_id),Y(e.message||`Proofread scheduled`),v(!0),M()}).catch($):e===`pipeline`?G(`transllama_translate_pipeline`,{post_id:t,target_lang:n}).then(e=>{e.job_id&&f.add(e.job_id),Y(e.message||`Pipeline scheduled`),v(!0),M()}).catch($):e===`publish`&&G(`transllama_publish_translation`,{post_id:t}).then(()=>{Y(`Translation published`),v(!0)}).catch($)}function ue(e,t,n){let r=`<span class="tl-badge tl-badge--queued">${n===`proofread`?`PR`:`TR`} Queued</span>`,i=document.querySelector(`.tl-metabox-lang[data-lang="${t}"] .tl-metabox-lang__status`);if(i){i.innerHTML=r;return}let a=document.querySelector(`tr[data-post-id="${e}"]`);if(!a)return;let o=W().findIndex(e=>e.code===t);if(o===-1)return;let s=a.querySelectorAll(`.tl-lang-col`)[o];s&&(s.innerHTML=r)}function M(){F(),g=2e3,N()}function N(){F(),d=setTimeout(()=>{if(ae()){N();return}v(!0)},g)}function P(e){if(F(),!e)return;let t=!1,n=!1;e.forEach(e=>{Object.values(e.languages||{}).forEach(e=>{[`in_progress`,`running`,`pending`].includes(e.status)&&(t=!0,(e.status===`in_progress`||e.status===`running`)&&(n=!0),e.job&&f.add(e.job.id))})}),t?(g=n?Math.min(g,3e3):Math.min(g*1.5,1e4),g=Math.max(2e3,g),N()):g=2e3}function F(){d&&=(clearTimeout(d),null)}function de(e){let t=document.getElementById(`tl-pagination`);if(!t||e.total_pages<=1){t&&(t.innerHTML=``);return}let n=I(e.current_page,e.total_pages),r=``;n.forEach(t=>{if(t===`...`)r+=`<span class="tl-page-ellipsis">&hellip;</span>`;else{let n=t===e.current_page?` is-active`:``;r+=`<a href="#" class="tl-page-link${n}" data-page="${t}">${t}</a>`}}),t.innerHTML=r,t.querySelectorAll(`.tl-page-link`).forEach(e=>{e.addEventListener(`click`,t=>{t.preventDefault(),s=parseInt(e.dataset.page,10),J(),x()})})}function I(e,t){if(t<=7)return Array.from({length:t},(e,t)=>t+1);let n=new Set([1,2,t-1,t,e-1,e,e+1]),r=Array.from(n).filter(e=>e>=1&&e<=t).sort((e,t)=>e-t),i=[],a=0;return r.forEach(e=>{e-a>1&&i.push(`...`),i.push(e),a=e}),i}function L(){let e=document.querySelector(`.tl-sort-link[data-sort-column="title"]`);e&&e.addEventListener(`click`,e=>{e.preventDefault(),u=u===`asc`?`desc`:`asc`,s=1,J(),x()})}function R(){let e=document.getElementById(`transllama-settings-container`);if(!e)return;let t=n.settings||{};e.innerHTML=`
            <form id="tl-settings-form" class="tl-settings-form">
                <div class="tl-settings-section">
                    <h2>LLM Configuration</h2>
                    <div class="tl-setting-field">
                        <label for="tl-api-key">OpenAI API Key</label>
                        <div class="tl-api-key-status ${t.has_api_key?`tl-api-key-status--active`:`tl-api-key-status--missing`}">
                            <span class="tl-api-key-status__dot"></span>
                            <span class="tl-api-key-status__text">${t.has_api_key?`Connected — ${t.openai_api_key}`:`Not configured`}</span>
                        </div>
                        <input type="password" id="tl-api-key" name="openai_api_key" class="regular-text" placeholder="${t.has_api_key?`Enter new key to replace`:`Enter your OpenAI API key`}" autocomplete="new-password">
                    </div>
                    <div class="tl-setting-field">
                        <label for="tl-anthropic-key">Anthropic API Key</label>
                        <div class="tl-api-key-status ${t.has_anthropic_key?`tl-api-key-status--active`:`tl-api-key-status--missing`}">
                            <span class="tl-api-key-status__dot"></span>
                            <span class="tl-api-key-status__text">${t.has_anthropic_key?`Connected — ${t.anthropic_api_key}`:`Not configured`}</span>
                        </div>
                        <input type="password" id="tl-anthropic-key" name="anthropic_api_key" class="regular-text" placeholder="${t.has_anthropic_key?`Enter new key to replace`:`Enter your Anthropic API key`}" autocomplete="new-password">
                    </div>
                    <div class="tl-setting-field">
                        <label for="tl-model">Model</label>
                        <select id="tl-model" name="model">
                            <optgroup label="OpenAI">
                                <option value="gpt-4.1-mini" ${t.model===`gpt-4.1-mini`?`selected`:``}>GPT-4.1 Mini (recommended)</option>
                                <option value="gpt-4.1-nano" ${t.model===`gpt-4.1-nano`?`selected`:``}>GPT-4.1 Nano (fastest / cheapest)</option>
                                <option value="gpt-4.1" ${t.model===`gpt-4.1`?`selected`:``}>GPT-4.1 (highest quality)</option>
                            </optgroup>
                            <optgroup label="Anthropic">
                                <option value="claude-sonnet-4-20250514" ${t.model===`claude-sonnet-4-20250514`?`selected`:``}>Claude Sonnet 4 (recommended)</option>
                                <option value="claude-3-5-haiku-20241022" ${t.model===`claude-3-5-haiku-20241022`?`selected`:``}>Claude 3.5 Haiku (fastest / cheapest)</option>
                                <option value="claude-3-7-sonnet-20250219" ${t.model===`claude-3-7-sonnet-20250219`?`selected`:``}>Claude 3.7 Sonnet</option>
                            </optgroup>
                        </select>
                    </div>
                </div>

                <div class="tl-settings-section">
                    <h2>General Configuration</h2>
                    <div class="tl-setting-field">
                        <label for="tl-publish-status">Default Publish Status</label>
                        <select id="tl-publish-status" name="default_publish_status">
                            <option value="draft" ${t.default_publish_status===`draft`?`selected`:``}>Draft</option>
                            <option value="publish" ${t.default_publish_status===`publish`?`selected`:``}>Published</option>
                        </select>
                        <p class="description">Whether new translations should be created as drafts or published immediately.</p>
                    </div>
                    <div class="tl-setting-field">
                        <label for="tl-max-concurrent">Concurrent Jobs</label>
                        <input type="number" id="tl-max-concurrent" name="max_concurrent_jobs" class="small-text" min="1" max="10" value="${t.max_concurrent_jobs||3}">
                        <p class="description">How many translation jobs may run at the same time (1–10). Also raises the Action Scheduler queue limit so jobs can process in parallel.</p>
                    </div>
                </div>

                <p class="submit">
                    <button type="submit" class="button button-primary">Save Settings</button>
                    <span id="tl-save-status" class="tl-save-status"></span>
                </p>
            </form>
        `,document.getElementById(`tl-settings-form`).addEventListener(`submit`,e=>{e.preventDefault(),V()})}function z(){let e=document.getElementById(`transllama-tone-container`);e&&(e.innerHTML=`
            <form id="tl-tone-form" class="tl-settings-form">
                <div class="tl-settings-section">
                    <h2>Brand Tone of Voice</h2>
                    <div class="tl-setting-field">
                        <label for="tl-tone">General Tone of Voice</label>
                        <textarea id="tl-tone" name="tone_of_voice" rows="8" class="large-text" placeholder="Describe the brand's tone of voice, writing style, and any general translation guidelines...">${q((n.settings||{}).tone_of_voice||``)}</textarea>
                        <p class="description">This is included in every translation prompt to ensure consistent brand voice across all languages.</p>
                    </div>
                </div>

                <p class="submit">
                    <button type="submit" class="button button-primary">Save Tone of Voice</button>
                    <span id="tl-save-status" class="tl-save-status"></span>
                </p>
            </form>
        `,document.getElementById(`tl-tone-form`).addEventListener(`submit`,e=>{e.preventDefault(),V()}))}function B(){let e=document.getElementById(`transllama-instructions-container`);if(!e)return;let t=n.settings||{},r=W(),i=t.language_settings||{};e.innerHTML=`
            <form id="tl-instructions-form" class="tl-settings-form">
                <div class="tl-settings-section">
                    <h2>Language-Specific Instructions</h2>
                    <p class="description">Add optional instructions per language. These are appended to the translation prompt when translating to that specific language.</p>
                    ${r.map(e=>{let t=i[e.code]||``;return`
                <div class="tl-setting-field">
                    <label for="tl-lang-${e.code}">
                        ${e.flag_url?`<img src="${e.flag_url}" alt="${e.code}" class="tl-flag">`:``}
                        ${e.display_name}
                    </label>
                    <textarea id="tl-lang-${e.code}" name="language_settings[${e.code}]" rows="3" class="large-text" placeholder="Optional: specific instructions for ${e.display_name} translations...">${q(t)}</textarea>
                </div>
            `}).join(``)}
                </div>

                <p class="submit">
                    <button type="submit" class="button button-primary">Save Instructions</button>
                    <span id="tl-save-status" class="tl-save-status"></span>
                </p>
            </form>
        `,document.getElementById(`tl-instructions-form`).addEventListener(`submit`,e=>{e.preventDefault(),V()})}function V(){let e=document.querySelector(`#tl-settings-form, #tl-tone-form, #tl-instructions-form`),t=document.getElementById(`tl-save-status`);if(!e||!t)return;t.textContent=`Saving...`,t.className=`tl-save-status`;let n=new FormData(e),r={};n.has(`openai_api_key`)&&(r.openai_api_key=n.get(`openai_api_key`)||``),n.has(`anthropic_api_key`)&&(r.anthropic_api_key=n.get(`anthropic_api_key`)||``),n.has(`model`)&&(r.model=n.get(`model`)||`gpt-4.1-mini`),n.has(`default_publish_status`)&&(r.default_publish_status=n.get(`default_publish_status`)||`draft`),n.has(`max_concurrent_jobs`)&&(r.max_concurrent_jobs=n.get(`max_concurrent_jobs`)||`3`),n.has(`tone_of_voice`)&&(r.tone_of_voice=n.get(`tone_of_voice`)||``);let i=W();if(i.some(e=>n.has(`language_settings[${e.code}]`))){let e={};i.forEach(t=>{let r=n.get(`language_settings[${t.code}]`);r&&(e[t.code]=r)}),r.language_settings=e}G(`transllama_save_settings`,r).then(()=>{t.textContent=`Saved!`,t.className=`tl-save-status tl-save-status--success`,setTimeout(()=>{t.textContent=``},3e3)}).catch(e=>{t.textContent=`Error: `+e,t.className=`tl-save-status tl-save-status--error`})}function fe(e){H();let t=e.stats||{},n=e.changes||[],r=t.fields_reviewed||0,i=t.fields_changed||0,a=``;a=n.length===0?`<p class="tl-modal-empty">No changes were made — the translation looks good.</p>`:`
                <table class="tl-modal-table widefat striped">
                    <thead>
                        <tr>
                            <th>Section</th>
                            <th>Field</th>
                            <th>Before</th>
                            <th>After</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody>${n.map(e=>`
                <tr>
                    <td class="tl-modal-cell--section">${q(e.section)}</td>
                    <td class="tl-modal-cell--field">${q(e.field)}</td>
                    <td class="tl-modal-cell--before">${q(e.before)}</td>
                    <td class="tl-modal-cell--after">${q(e.after)}</td>
                    <td class="tl-modal-cell--reason">${q(e.reason)}</td>
                </tr>
            `).join(``)}</tbody>
                </table>
            `;let o=document.createElement(`div`);o.className=`tl-modal-overlay`,o.id=`tl-proofread-modal`,o.innerHTML=`
            <div class="tl-modal">
                <div class="tl-modal-header">
                    <h2 id="tl-proofread-modal-title">Proofread Report</h2>
                    <button type="button" class="tl-modal-close" title="Close" aria-label="Close dialog">&times;</button>
                </div>
                <div class="tl-modal-stats">
                    <strong>${i}</strong> of <strong>${r}</strong> field(s) adjusted
                </div>
                <div class="tl-modal-body">
                    ${a}
                </div>
            </div>
        `,Z(o,`tl-proofread-modal-title`,H)}function H(){Q(`tl-proofread-modal`)}function pe(e,t){U();let n=document.createElement(`div`);n.className=`tl-modal-overlay`,n.id=`tl-audit-log-modal`,n.innerHTML=`
            <div class="tl-modal">
                <div class="tl-modal-header">
                    <h2 id="tl-audit-log-modal-title">Translation Audit Log (${q(t.toUpperCase())})</h2>
                    <button type="button" class="tl-modal-close" title="Close" aria-label="Close dialog">&times;</button>
                </div>
                <div class="tl-modal-body">
                    <p class="tl-loading">Loading audit timeline...</p>
                </div>
            </div>
        `,Z(n,`tl-audit-log-modal-title`,U),G(`transllama_audit_log`,{post_id:e,target_lang:t,limit:30}).then(e=>{me(e.entries||[])}).catch(e=>{let t=n.querySelector(`.tl-modal-body`);t&&(t.innerHTML=`<div class="tl-error">${q(typeof e==`string`?e:`Failed to load audit log`)}</div>`)})}function me(e){let t=document.getElementById(`tl-audit-log-modal`);if(!t)return;let n=t.querySelector(`.tl-modal-body`);if(n){if(!e.length){n.innerHTML=`<p class="tl-modal-empty">No audit entries found for this translation yet.</p>`;return}n.innerHTML=`<ul class="tl-audit-timeline">${e.map(e=>{let t=e.task_type===`proofread`?`Proofread`:`Translation`,n=(e.tokens_input||0)+(e.tokens_output||0),r=n>0?`Tokens: ${n.toLocaleString()} (in: ${(e.tokens_input||0).toLocaleString()}, out: ${(e.tokens_output||0).toLocaleString()})`:`Tokens: n/a`,i=e.completed_at||e.created_at,a=`tl-audit-status--${E(e.status||`unknown`)}`,o=e.error_log?`<div class="tl-audit-error">${q(e.error_log)}</div>`:``;return`
                <li class="tl-audit-item">
                    <div class="tl-audit-item__head">
                        <span class="tl-audit-task">${t}</span>
                        <span class="tl-audit-status ${a}">${q(e.status||`unknown`)}</span>
                    </div>
                    <div class="tl-audit-meta">
                        <span><strong>When:</strong> ${q(i||``)}</span>
                        <span><strong>By:</strong> ${q(e.triggered_by_name||`System / unknown`)}</span>
                        <span><strong>Model:</strong> ${q(e.model||`n/a`)}</span>
                        <span><strong>${r}</strong></span>
                    </div>
                    ${e.message?`<div class="tl-audit-message">${q(e.message)}</div>`:``}
                    ${o}
                </li>
            `}).join(``)}</ul>`}}function U(){Q(`tl-audit-log-modal`)}function he(){let e=n.languages||{},t=n.default_lang||`en`,r=e[t];return r?{code:t,display_name:r.translated_name||t,flag_url:r.country_flag_url||``}:null}function W(){let e=n.languages||{},t=n.default_lang||`en`;return Object.entries(e).filter(([e])=>e!==t).map(([e,t])=>({code:e,display_name:t.translated_name||e,native_name:t.native_name||e,flag_url:t.country_flag_url||``}))}function G(e,r={}){return n=t(),new Promise((t,i)=>{let a=n.ajax_url;if(!a){i(`TransLlama configuration is missing. Reload the page or check that scripts are loaded.`);return}let o=new FormData;o.append(`action`,e),o.append(`nonce`,n.nonce||``),K(o,r),fetch(a,{method:`POST`,credentials:`same-origin`,body:o}).then(async e=>{let n=await e.text(),r;try{r=JSON.parse(n)}catch{let e=n.trim().slice(0,80).replace(/\s+/g,` `);i(e.startsWith(`<!`)||e.startsWith(`<`)?`Server returned HTML instead of JSON. Reload the page; if this persists, check PHP errors on admin-ajax.php.`:`Invalid server response.`);return}r.success?t(r.data):i(r.data||`Unknown error`)}).catch(e=>i(e.message||String(e)||`Network error`))})}function K(e,t,n=``){for(let[r,i]of Object.entries(t)){let t=n?`${n}[${r}]`:r;typeof i==`object`&&i&&!(i instanceof File)?K(e,i,t):e.append(t,i??``)}}function q(e){if(!e)return``;let t=document.createElement(`div`);return t.textContent=e,t.innerHTML}function ge(e){let t=[...e];return t.sort((e,t)=>{let n=(e.title||``).toLocaleLowerCase(),r=(t.title||``).toLocaleLowerCase();if(n===r)return 0;let i=n>r?1:-1;return u===`desc`?-i:i}),t}function _e(){try{let t=localStorage.getItem(e);if(!t)return;let r=JSON.parse(t),i=Object.keys(n.post_types||{});r&&typeof r.postType==`string`&&i.includes(r.postType)&&(o=r.postType),r&&typeof r.searchQuery==`string`&&(c=r.searchQuery),r&&Number.isInteger(r.currentPage)&&r.currentPage>0&&(s=r.currentPage),r&&(r.sortOrder===`asc`||r.sortOrder===`desc`)&&(u=r.sortOrder),r&&[`all`,`untranslated`,`draft`,`completed`,`failed`].includes(r.statusFilter)&&(l=r.statusFilter)}catch(e){console.warn(`[TransLlama] Failed to restore post preferences:`,e)}}function J(){try{localStorage.setItem(e,JSON.stringify({postType:o,searchQuery:c,currentPage:s,sortOrder:u,statusFilter:l}))}catch{}}function ve(){let e=document.getElementById(`tl-toast-container`);return e||(e=document.createElement(`div`),e.id=`tl-toast-container`,e.className=`tl-toast-container`,document.body.appendChild(e)),e}function Y(e,t){t||=`success`;let n=ve(),r=typeof e==`string`?e:JSON.stringify(e),i=document.createElement(`div`);i.className=`tl-toast tl-toast--${t}`,i.setAttribute(`role`,`status`),i.textContent=r,n.appendChild(i),setTimeout(()=>i.classList.add(`tl-toast--visible`),10),setTimeout(()=>{i.classList.remove(`tl-toast--visible`),setTimeout(()=>i.remove(),300)},4e3);let a=document.getElementById(`tl-live-region`);a&&(a.textContent=r)}function ye(e,t){t.classList.remove(`tl-dropdown-menu--up`);let n=e.getBoundingClientRect(),r=window.innerHeight-n.bottom,i=t.offsetHeight||300;r<i&&n.top>i&&t.classList.add(`tl-dropdown-menu--up`)}function X(){document.querySelectorAll(`.tl-dropdown-menu.is-open`).forEach(e=>e.classList.remove(`is-open`)),document.querySelectorAll(`.tl-dropdown-toggle[aria-expanded="true"]`).forEach(e=>e.setAttribute(`aria-expanded`,`false`))}function Z(e,t,n){h=document.activeElement,e.setAttribute(`role`,`dialog`),e.setAttribute(`aria-modal`,`true`),t&&e.setAttribute(`aria-labelledby`,t),document.body.appendChild(e),requestAnimationFrame(()=>{e.classList.add(`is-visible`);let t=e.querySelector(`.tl-modal-close`);t&&t.focus()}),e.querySelector(`.tl-modal-close`).addEventListener(`click`,n),e.addEventListener(`click`,t=>{t.target===e&&n()}),e.addEventListener(`keydown`,t=>{if(t.key===`Escape`){n();return}if(t.key!==`Tab`)return;let r=e.querySelectorAll(`button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])`);if(!r.length)return;let i=r[0],a=r[r.length-1];t.shiftKey&&document.activeElement===i?(t.preventDefault(),a.focus()):!t.shiftKey&&document.activeElement===a&&(t.preventDefault(),i.focus())})}function Q(e){let t=document.getElementById(e);t&&(t.classList.remove(`is-visible`),setTimeout(()=>t.remove(),200)),h&&=(h.focus(),null)}function $(e){console.error(`[TransLlama]`,e),Y(typeof e==`string`?e:e&&e.message?e.message:`An error occurred`,`error`)}})();