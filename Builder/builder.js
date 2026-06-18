
const STORAGE_KEY = 'clog_draft_data';
const inputs = { title: document.getElementById('title'), id: document.getElementById('blog-id'), tags: document.getElementById('tags'), status: document.getElementById('status'), author: document.getElementById('author'), img: document.getElementById('img'), desc: document.getElementById('desc') };
let uploadTarget = 'editor';

function toggleMeta() { document.getElementById('meta-content').classList.toggle('show'); }
const AVAILABLE_CATEGORIES = ["Technology", "Tutorial", "Web Development", "Software Development", "Productivity", "Developer Tools", "Developer Productivity", "Developer Marketing", "Developer Relations", "Entrepreneurship", "Content Creation", "Artificial Intelligence", "Open Source", "Bussines", "Tip & Tricks"];
AVAILABLE_CATEGORIES.forEach(cat => { const lbl = document.createElement('label'); lbl.innerHTML = `<input type="checkbox" value="${cat}" class="cat-checkbox"> ${cat}`; document.getElementById('categories-list').appendChild(lbl); });
function toggleDropdown(id) { document.getElementById(id).classList.toggle('show'); }
document.addEventListener('click', (e) => { if (!e.target.closest('.multi-select')) document.getElementById('categories-list').classList.remove('show'); });
document.addEventListener('change', (e) => { if (e.target.classList.contains('cat-checkbox')) { updateCategoryText(); saveDraft(); } });
function updateCategoryText() { const checked = getSelectedCategories(); document.getElementById('cat-select-box').innerText = checked.length === 0 ? "Select Categories..." : (checked.length > 2 ? `${checked.length} selected` : checked.join(', ')); }
function getSelectedCategories() { return Array.from(document.querySelectorAll('.cat-checkbox:checked')).map(cb => cb.value); }

function toggleSettings() { document.getElementById('settings-drawer').classList.toggle('open'); document.getElementById('settings-backdrop').classList.toggle('open'); }
function toggleInfo() { document.getElementById('info-drawer').classList.toggle('open'); document.getElementById('info-backdrop').classList.toggle('open'); }
function saveSettings() { ['gh_token', 'gh_owner', 'gh_repo', 'gh_branch', 'gh_path', 'imgbb_key'].forEach(k => localStorage.setItem(k, document.getElementById(k.replace('_', '-')).value.trim())); showStatus("Configuration saved!", "success"); toggleSettings(); }
function loadSettings() { ['gh_token', 'gh_owner', 'gh_repo', 'gh_branch', 'gh_path', 'imgbb_key'].forEach(k => { let val = localStorage.getItem(k) || ''; if (k === 'gh_branch' && !val) val = 'main'; document.getElementById(k.replace('_', '-')).value = val; }); }

const editorTextarea = document.getElementById('md-editor-textarea');

document.addEventListener('keydown', (e) => {
    const shift = e.shiftKey;
    const alt = e.altKey;
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case (alt && "t"): e.preventDefault(); toggleTheme(); break;
            case (alt && "i"): e.preventDefault(); toggleInfo(); break;
            case (alt && "s"): e.preventDefault(); toggleSettings(); break;
            case (alt && "m"): e.preventDefault(); toggleMeta(); break;
            case (alt && "g"): e.preventDefault(); triggerBannerUpload(); break;

            case (alt && "e"): e.preventDefault(); switchTab('editor'); break;
            case (alt && "p"): e.preventDefault(); switchTab('preview'); break;
            case (alt && "o"): e.preventDefault(); switchTab('json'); break;

            case (alt && "c"): e.preventDefault(); copyJSON(); break;
            case `s`: e.preventDefault(); saveJSON(); break;
            case `p`: e.preventDefault(); pushToGithub(); break;
            case (alt && "a"): e.preventDefault(); clearAll(); break;
        }
    };
});

editorTextarea.addEventListener('keydown', (e) => {
    const shift = e.shiftKey;
    const alt = e.altKey;
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 'b': e.preventDefault(); toggleFormat('bold'); break;
            case 'i': e.preventDefault(); toggleFormat('italic'); break;
            case '~': e.preventDefault(); toggleFormat('strike'); break;
            case 'h': e.preventDefault(); toggleFormat('highlight'); break;

            case '1': e.preventDefault(); toggleBlock('h1'); break;
            case '2': e.preventDefault(); toggleBlock('h2'); break;
            case '3': e.preventDefault(); toggleBlock('h3'); break;
            case '4': e.preventDefault(); toggleBlock('h4'); break;
            case '5': e.preventDefault(); toggleBlock('h5'); break;
            case '6': e.preventDefault(); toggleBlock('h6'); break;

            case (shift && "l"): e.preventDefault(); wrapTags('<div align=\'left\'>\n\n', '\n\n</div>'); break;
            case (shift && "c"): e.preventDefault(); wrapTags('<div align=\'center\'>\n\n', '\n\n</div>'); break;
            case (shift && "r"): e.preventDefault(); wrapTags('<div align=\'right\'>\n\n', '\n\n</div>'); break;

            case 'u': e.preventDefault(); toggleBlock('ul'); break;
            case 'o': e.preventDefault(); toggleBlock('ol'); break;
            case `[`: e.preventDefault(); toggleBlock('task'); break;

            case (shift && '"'): e.preventDefault(); toggleBlock('quote'); break;

            case '!': e.preventDefault(); toggleCallout('note'); break;
            case '?': e.preventDefault(); toggleCallout('warning'); break;

            case '`': e.preventDefault(); toggleFormat('code'); break;
            case '<': e.preventDefault(); toggleFormat('codeblock'); break;

            case 'g': e.preventDefault(); triggerEditorUpload(); break;

            case 'k': e.preventDefault(); insertSnippet('link'); break;
            case '|': e.preventDefault(); insertSnippet('table'); break;
            case '-': e.preventDefault(); insertSnippet('hr'); break;
        }
    };
    if (e.key === 'Tab') { e.preventDefault(); handleTab(e.shiftKey); };
});

function handleTab(isShift) {
    const start = editorTextarea.selectionStart, end = editorTextarea.selectionEnd;
    const text = editorTextarea.value;
    if (start !== end || text.substring(start, end).includes('\n')) {
        const lineStart = text.lastIndexOf('\n', start - 1) + 1, lineEnd = text.indexOf('\n', end) === -1 ? text.length : text.indexOf('\n', end);
        const lines = text.substring(lineStart, lineEnd).split('\n');
        const newLines = lines.map(l => isShift ? l.replace(/^(  |\t)/, '') : '  ' + l);
        const replacement = newLines.join('\n');
        editorTextarea.value = text.substring(0, lineStart) + replacement + text.substring(lineEnd);
        editorTextarea.setSelectionRange(lineStart, lineStart + replacement.length);
    } else {
        if (isShift && text.substring(start - 2, start) === '  ') {
            editorTextarea.value = text.substring(0, start - 2) + text.substring(start);
            editorTextarea.setSelectionRange(start - 2, start - 2);
        } else if (!isShift) {
            editorTextarea.value = text.substring(0, start) + '  ' + text.substring(end);
            editorTextarea.setSelectionRange(start + 2, start + 2);
        }
    }
    saveDraft();
}

function toggleFormat(type) {
    const start = editorTextarea.selectionStart, end = editorTextarea.selectionEnd, text = editorTextarea.value, selected = text.substring(start, end);
    let before = '', after = '';
    if (type === 'bold') { before = '**'; after = '**'; }
    if (type === 'italic') { before = '_'; after = '_'; }
    if (type === 'strike') { before = '~~'; after = '~~'; }
    if (type === 'highlight') { before = '<mark>'; after = '</mark>'; }
    if (type === 'code') { before = '`'; after = '`'; }
    if (type === 'codeblock') { before = '\n```\n'; after = '\n```\n'; }

    if (!selected && type === 'codeblock') { editorTextarea.value = text.substring(0, start) + '\n```\n\n```\n' + text.substring(end); editorTextarea.setSelectionRange(start + 5, start + 5); editorTextarea.focus(); saveDraft(); return; }

    const outStart = Math.max(0, start - before.length), outEnd = Math.min(text.length, end + after.length);
    if (text.substring(outStart, start) === before && text.substring(end, outEnd) === after) {
        editorTextarea.value = text.substring(0, outStart) + selected + text.substring(outEnd); editorTextarea.setSelectionRange(outStart, outStart + selected.length);
    } else if (selected.startsWith(before) && selected.endsWith(after)) {
        const inner = selected.substring(before.length, selected.length - after.length);
        editorTextarea.value = text.substring(0, start) + inner + text.substring(end); editorTextarea.setSelectionRange(start, start + inner.length);
    } else {
        editorTextarea.value = text.substring(0, start) + before + selected + after + text.substring(end); editorTextarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }
    editorTextarea.focus(); saveDraft();
}

function toggleBlock(type) {
    const start = editorTextarea.selectionStart, end = editorTextarea.selectionEnd, text = editorTextarea.value;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = text.indexOf('\n', end); if (lineEnd === -1) lineEnd = text.length;
    const lines = text.substring(lineStart, lineEnd).split('\n');

    let prefix = '', isNumList = false;
    if (type.startsWith('h')) prefix = '#'.repeat(parseInt(type[1])) + ' ';
    else if (type === 'quote') prefix = '> ';
    else if (type === 'ul') prefix = '- ';
    else if (type === 'task') prefix = '- [ ] ';
    else if (type === 'ol') { prefix = '1. '; isNumList = true; }

    const prefixRegex = /^((#+|> \[!\w+\]|> |- \[[ x]\]|- |\* |\d+\.)\s*)/;
    const allHavePrefix = lines.every(line => isNumList ? /^\d+\.\s/.test(line) : (type.startsWith('h') ? line.startsWith(prefix) && !line.startsWith(prefix + '#') : line.startsWith(prefix)));

    const newLines = lines.map((line, idx) => {
        let cleanLine = line.replace(prefixRegex, '');
        if (allHavePrefix) return cleanLine;
        return (isNumList ? `${idx + 1}. ` : prefix) + cleanLine;
    });

    const replacement = newLines.join('\n');
    editorTextarea.value = text.substring(0, lineStart) + replacement + text.substring(lineEnd);
    editorTextarea.setSelectionRange(lineStart, lineStart + replacement.length);
    editorTextarea.focus(); saveDraft();
}

function toggleCallout(type) {
    const start = editorTextarea.selectionStart, end = editorTextarea.selectionEnd, text = editorTextarea.value;
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = text.indexOf('\n', end); if (lineEnd === -1) lineEnd = text.length;
    const blockText = text.substring(lineStart, lineEnd);

    const tag = type === 'note' ? '> [!NOTE]\n' : '> [!WARNING]\n';

    if (blockText.startsWith(tag)) {
        const stripped = blockText.replace(tag, '').split('\n').map(l => l.replace(/^>\s*/, '')).join('\n');
        editorTextarea.value = text.substring(0, lineStart) + stripped + text.substring(lineEnd);
        editorTextarea.setSelectionRange(lineStart, lineStart + stripped.length);
    } else {
        const lines = blockText.split('\n').map(l => '> ' + l.replace(/^((> |- \[[ x]\]|- |\* |\d+\.)\s*)/, ''));
        const replacement = tag + lines.join('\n');
        editorTextarea.value = text.substring(0, lineStart) + replacement + text.substring(lineEnd);
        editorTextarea.setSelectionRange(lineStart, lineStart + replacement.length);
    }
    editorTextarea.focus(); saveDraft();
}

function wrapTags(openTag, closeTag) {
    const start = editorTextarea.selectionStart, end = editorTextarea.selectionEnd, text = editorTextarea.value;
    const selected = text.substring(start, end) || "Text";

    if (text.substring(Math.max(0, start - openTag.length), start) === openTag && text.substring(end, end + closeTag.length) === closeTag) {
        editorTextarea.value = text.substring(0, start - openTag.length) + selected + text.substring(end + closeTag.length);
        editorTextarea.setSelectionRange(start - openTag.length, start - openTag.length + selected.length);
    } else {
        editorTextarea.value = text.substring(0, start) + openTag + selected + closeTag + text.substring(end);
        editorTextarea.setSelectionRange(start + openTag.length, start + openTag.length + selected.length);
    }
    editorTextarea.focus(); saveDraft();
}

function insertSnippet(type) {
    const start = editorTextarea.selectionStart, end = editorTextarea.selectionEnd, text = editorTextarea.value, selected = text.substring(start, end);
    let replace = '', curOffset = 0;
    if (type === 'link') { replace = `[${selected || 'text'}](https://)`; curOffset = selected ? replace.length - 1 : 1; }
    else if (type === 'table') { replace = `\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n`; curOffset = replace.length; }
    else if (type === 'hr') { replace = `\n---\n`; curOffset = replace.length; }

    editorTextarea.value = text.substring(0, start) + replace + text.substring(end);
    if (type === 'link' && !selected) editorTextarea.setSelectionRange(start + 1, start + 5);
    else if (type === 'link' && selected) editorTextarea.setSelectionRange(start + replace.length - 1, start + replace.length - 1);
    else editorTextarea.setSelectionRange(start + curOffset, start + curOffset);
    editorTextarea.focus(); saveDraft();
}

editorTextarea.addEventListener('dragover', e => { e.preventDefault(); editorTextarea.classList.add('drag-over'); });
editorTextarea.addEventListener('dragleave', () => editorTextarea.classList.remove('drag-over'));
editorTextarea.addEventListener('drop', e => { e.preventDefault(); editorTextarea.classList.remove('drag-over'); if (e.dataTransfer.files?.length) { uploadTarget = 'editor'; openUploadModal(e.dataTransfer.files[0]); } });
editorTextarea.addEventListener('input', saveDraft);

function getOutputJSON() {
    return { Title: inputs.title.value.trim(), Desc: inputs.desc.value.trim(), Author: inputs.author.value.trim() || "Core Lord", Id: inputs.id.value.trim(), Tags: inputs.tags.value.split(',').map(t => t.trim()).filter(Boolean), Categories: getSelectedCategories(), Date: getFormattedDate(), Img: inputs.img.value.trim(), Status: inputs.status.value, Data: editorTextarea.value };
}

function updatePreview() {
    const data = getOutputJSON();
    document.getElementById('prev-img').src = data.Img || 'preview.png';
    document.getElementById('prev-title').innerText = data.Title || "Untitled Post";
    document.getElementById('prev-date').innerText = data.Date; document.getElementById('prev-author').innerText = data.Author;
    document.getElementById('prev-cat').innerHTML = data.Categories.map(c => `<span class="cat-badge">${c}</span>`).join('');
    document.getElementById('prev-tag').innerHTML = data.Tags.map(t => `<span style="margin-right:8px;">#${t}</span>`).join('');

    let htmlData = data.Data || "";
    htmlData = htmlData.replace(/> \[!NOTE\]\n(> .*\n?)+/g, match => `<div style="border-left:4px solid #3b82f6; padding:10px; background:rgba(59,130,246,0.1); margin-bottom:15px;"><strong>📘 Note</strong><br/>${marked.parse(match.replace(/> \[!NOTE\]\n/, '').replace(/^> /gm, ''))}</div>`);
    htmlData = htmlData.replace(/> \[!WARNING\]\n(> .*\n?)+/g, match => `<div style="border-left:4px solid #f59e0b; padding:10px; background:rgba(245,158,11,0.1); margin-bottom:15px;"><strong>⚠️ Warning</strong><br/>${marked.parse(match.replace(/> \[!WARNING\]\n/, '').replace(/^> /gm, ''))}</div>`);

    document.getElementById('prev-body').innerHTML = window.marked ? marked.parse(htmlData) : `<p style="color:red">Marked.js error.</p><pre>${htmlData}</pre>`;
}

function updateJSONPane() { document.getElementById('json-code-block').innerText = JSON.stringify(getOutputJSON(), null, 2); }

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
    Array.from(document.querySelectorAll('.tab-btn')).find(b => b.innerText.toLowerCase().includes(tab.toLowerCase())).classList.add('active');
    document.getElementById(tab + 'Pane').classList.add('active');
    if (tab === 'preview') updatePreview(); if (tab === 'json') updateJSONPane();
}

function saveDraft() { localStorage.setItem(STORAGE_KEY, JSON.stringify(getOutputJSON())); }

function loadDraft() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY)); if (!saved) return toggleMeta();
        inputs.title.value = saved.Title || ''; inputs.id.value = saved.Id || ''; inputs.tags.value = (saved.Tags || []).join(', '); inputs.status.value = saved.Status || 'Pub'; inputs.author.value = saved.Author || ''; inputs.img.value = saved.Img || ''; inputs.desc.value = saved.Desc || '';
        document.querySelectorAll('.cat-checkbox').forEach(cb => cb.checked = (saved.Categories || []).includes(cb.value));
        updateCategoryText(); editorTextarea.value = saved.Data || '';
    } catch (e) { console.error(e); }
}
Object.values(inputs).forEach(i => i.addEventListener('input', saveDraft));
inputs.title.addEventListener('blur', function () { if (!inputs.id.value && this.value) { inputs.id.value = this.value.match(/[a-zA-Z0-9]+/g)?.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('') || ''; saveDraft(); } });

function triggerBannerUpload() { uploadTarget = 'banner'; openUploadModal(); }
function triggerEditorUpload() { uploadTarget = 'editor'; openUploadModal(); }
function openUploadModal(file = null) { document.getElementById('upload-modal').style.display = 'flex'; document.getElementById('modal-status-msg').innerText = ''; const fInput = document.getElementById('modal-file-input'); fInput.value = ''; if (file) { const dt = new DataTransfer(); dt.items.add(file); fInput.files = dt.files; updateModalStatus(`Selected: ${file.name}`, "info"); } }
function closeUploadModal() { document.getElementById('upload-modal').style.display = 'none'; }
const mDrop = document.getElementById('modal-dropzone'), mInput = document.getElementById('modal-file-input');
mDrop.addEventListener('dragover', e => { e.preventDefault(); mDrop.classList.add('drag-over'); }); mDrop.addEventListener('dragleave', () => mDrop.classList.remove('drag-over'));
mDrop.addEventListener('drop', e => { e.preventDefault(); mDrop.classList.remove('drag-over'); if (e.dataTransfer.files?.length) { mInput.files = e.dataTransfer.files; updateModalStatus(`Selected: ${e.dataTransfer.files[0].name}`, "info"); } });
mInput.addEventListener('change', () => mInput.files.length && updateModalStatus(`Selected: ${mInput.files[0].name}`, "info"));
function updateModalStatus(text, type) { const msg = document.getElementById('modal-status-msg'); msg.innerText = text; msg.style.color = type === 'error' ? 'var(--danger)' : (type === 'success' ? '#10b981' : 'var(--fg-main)'); }

async function uploadToGithub(file) {
    const token = localStorage.getItem('gh_token'), owner = localStorage.getItem('gh_owner'), repo = localStorage.getItem('gh_repo'), branch = localStorage.getItem('gh_branch') || 'main';
    if (!token || !owner || !repo) throw new Error("GitHub config incomplete.");
    const path = `ImgBanner/img_${Date.now()}.${file.name.split('.').pop()}`, base64 = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(',')[1]); r.onerror = rej; r.readAsDataURL(file); });
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, { method: 'PUT', headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: `Upload asset ${path}`, content: base64, branch }) });
    if (!res.ok) throw new Error((await res.json()).message || "GitHub upload failed."); return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`;
}
async function uploadToImgBB(file) {
    const apiKey = localStorage.getItem('imgbb_key'); if (!apiKey) throw new Error("ImgBB Key missing.");
    const fd = new FormData(); fd.append('image', file); const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error((await res.json()).error?.message || "ImgBB upload failed."); return (await res.json()).data.url;
}
async function startModalUpload() {
    if (!mInput.files.length) return updateModalStatus("Select an image first.", "error");
    const file = mInput.files[0], dest = document.querySelector('input[name="upload-dest"]:checked').value, btn = document.getElementById('modal-upload-btn');
    btn.disabled = true; btn.innerText = "Uploading..."; updateModalStatus("Uploading...", "info");
    try {
        const url = dest === 'github' ? await uploadToGithub(file) : await uploadToImgBB(file); updateModalStatus("Success!", "success");
        if (uploadTarget === 'banner') { inputs.img.value = url; saveDraft(); }
        else { const t = document.getElementById('md-editor-textarea'); t.value = t.value.substring(0, t.selectionStart) + `![${file.name.split('.')[0]}](${url})` + t.value.substring(t.selectionEnd); saveDraft(); }
        setTimeout(closeUploadModal, 1000);
    } catch (err) { updateModalStatus(`Error: ${err.message}`, "error"); } finally { btn.disabled = false; btn.innerText = "Upload"; }
}
document.getElementById('upload-modal').addEventListener('click', e => e.target.id === 'upload-modal' && closeUploadModal());

function resolveGhPath() { let folder = localStorage.getItem('gh_path') || ''; if (folder && folder.endsWith('/')) folder = folder.slice(0, -1); return folder ? `${folder}/${(inputs.id.value || 'untitled')}.json` : `${(inputs.id.value || 'untitled')}.json`; }
async function pushToGithub() {
    const token = localStorage.getItem('gh_token'), owner = localStorage.getItem('gh_owner'), repo = localStorage.getItem('gh_repo'), branch = localStorage.getItem('gh_branch') || 'main';
    if (!token || !owner || !repo) return showStatus("Configure credentials first", "error");
    const path = resolveGhPath(), base64 = btoa(unescape(encodeURIComponent(JSON.stringify(getOutputJSON(), null, 2)))), url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`, headers = { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' };
    try {
        showStatus("Syncing...", "info"); let sha = null; const getRes = await fetch(url, { headers }); if (getRes.ok) sha = (await getRes.json()).sha;
        const updateRes = await fetch(url, { method: 'PUT', headers, body: JSON.stringify({ message: `Saved ${inputs.id.value || 'post'}.json to Github By Clog Builder`, content: base64, branch, sha }) });
        updateRes.ok ? showStatus("Pushed to GitHub!", "success") : showStatus(`Failed: ${(await updateRes.json()).message}`, "error");
    } catch (e) { showStatus(`Sync failed: ${e.message}`, "error"); }
}

function saveJSON() { const blob = new Blob([JSON.stringify(getOutputJSON(), null, 2)], { type: "application/json" }), url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = (inputs.id.value || 'post') + '.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showStatus("File Downloaded!", "success"); } function copyJSON() { navigator.clipboard.writeText(JSON.stringify(getOutputJSON(), null, 2)); showStatus("Copied to Clipboard!", "success"); }
function clearAll() { if (!confirm("Clear workspace?")) return; Object.values(inputs).forEach(i => i.value = ''); inputs.status.value = 'Pub'; document.querySelectorAll('.cat-checkbox').forEach(cb => cb.checked = false); updateCategoryText(); editorTextarea.value = ''; localStorage.removeItem(STORAGE_KEY); switchTab('editor'); }
function getFormattedDate() { const d = new Date(), pad = n => (n < 10 ? '0' : '') + n; return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`; }
function toggleTheme() { const h = document.documentElement; h.setAttribute('data-theme', h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }
function showStatus(text, type = "success") { const t = document.getElementById('toast'); t.innerText = text; t.className = "toast show"; t.classList.add(type === 'error' ? 'error' : (type === 'info' ? 'info' : 'success')); setTimeout(() => t.classList.remove('show'), 3000); }

if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.setAttribute('data-theme', 'dark');
loadDraft(); loadSettings();