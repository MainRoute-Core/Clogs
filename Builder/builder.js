const STORAGE_KEY = 'clog_draft_data';
const DEFAULT_CATEGORIES = ["Technology", "Tutorial", "Web Development", "Software Development", "Productivity", "Developer Tools", "Developer Productivity", "Developer Marketing", "Developer Relations", "Entrepreneurship", "Content Creation", "Artificial Intelligence", "Open Source", "Bussiness", "Tip & Tricks"];
const inputs = {
    title: document.getElementById('title'),
    id: document.getElementById('blog-id'),
    tags: document.getElementById('tags'),
    status: document.getElementById('status'),
    author: document.getElementById('author'),
    img: document.getElementById('img'),
    desc: document.getElementById('desc')
};

let uploadTarget = 'editor';
let slashMenuOpen = false;
let activeSlashIndex = 0;
const undoStack = [];
const redoStack = [];
const MAX_STACK_SIZE = 100;
let undoTimeout = null;


function populateCategories() {
    const customStr = localStorage.getItem('custom_categories') || '';
    const customList = customStr.split(',').map(c => c.trim()).filter(Boolean);
    const allCategories = Array.from(new Set([...DEFAULT_CATEGORIES, ...customList]));
    const selected = getSelectedCategories();
    const listEl = document.getElementById('categories-list');
    listEl.innerHTML = '';
    allCategories.forEach(cat => { const lbl = document.createElement('label'); const isChecked = selected.includes(cat) ? 'checked' : ''; lbl.innerHTML = `<input type="checkbox" value="${cat}" class="cat-checkbox" ${isChecked}> ${cat}`; listEl.appendChild(lbl); });
    updateCategoryText();
}

function toggleMeta() { document.getElementById('meta-content').classList.toggle('show'); }

function toggleDropdown(id) { document.getElementById(id).classList.toggle('show'); }
document.addEventListener('click', (e) => {
    if (!e.target.closest('.multi-select')) { document.getElementById('categories-list').classList.remove('show'); }
    if (!e.target.closest('#slash-menu') && e.target !== editorTextarea) { hideSlashMenu(); }
});

document.addEventListener('change', (e) => {
    if (e.target.classList.contains('cat-checkbox')) { updateCategoryText(); saveDraft(); }
});

function updateCategoryText() {
    const checked = getSelectedCategories();
    document.getElementById('cat-select-box').innerText = checked.length === 0 ? "Select Categories..." : (checked.length > 2 ? `${checked.length} selected` : checked.join(', '));
}

function getSelectedCategories() {
    return Array.from(document.querySelectorAll('.cat-checkbox:checked')).map(cb => cb.value);
}

function populateAuthors() {
    const customStr = localStorage.getItem('custom_authors') || '';
    const customList = customStr.split(',').map(a => a.trim()).filter(Boolean);
    const datalist = document.getElementById('author-list');
    datalist.innerHTML = '';
    const uniqueAuthors = Array.from(new Set(["Core Lord", ...customList]));
    uniqueAuthors.forEach(author => { const opt = document.createElement('option'); opt.value = author; datalist.appendChild(opt); });
}

function toggleSettings() {
    document.getElementById('settings-drawer').classList.toggle('open');
    document.getElementById('settings-backdrop').classList.toggle('open');
}

function toggleInfo() {
    document.getElementById('info-drawer').classList.toggle('open');
    document.getElementById('info-backdrop').classList.toggle('open');
}

function saveSettings() {
    ['gh_token', 'gh_owner', 'gh_repo', 'gh_branch', 'gh_path', 'imgbb_key', 'custom_categories', 'custom_authors'].forEach(k => { const el = document.getElementById(k.replace(/_/g, '-')) || document.getElementById(k.replace(/_/g, '-') + '-input'); if (el) localStorage.setItem(k, el.value.trim()); });
    showStatus("Configuration saved!", "success");
    toggleSettings();
    populateCategories();
    populateAuthors();
}

function loadSettings() {
    ['gh_token', 'gh_owner', 'gh_repo', 'gh_branch', 'gh_path', 'imgbb_key', 'custom_categories', 'custom_authors'].forEach(k => {
        let val = localStorage.getItem(k) || '';
        if (k === 'gh_branch' && !val) val = 'main';
        const el = document.getElementById(k.replace(/_/g, '-')) || document.getElementById(k.replace(/_/g, '-') + '-input');
        if (el) el.value = val;
    });
}

const editorTextarea = document.getElementById('md-editor-textarea');

function saveStateForUndo() {
    const state = { data: editorTextarea.value, selStart: editorTextarea.selectionStart, selEnd: editorTextarea.selectionEnd };
    if (undoStack.length > 0 && undoStack[undoStack.length - 1].data === state.data) { return; }
    undoStack.push(state);
    if (undoStack.length > MAX_STACK_SIZE) { undoStack.shift(); }
    redoStack.length = 0;
}

function undo() {
    if (undoStack.length === 0) return;
    const currentState = { data: editorTextarea.value, selStart: editorTextarea.selectionStart, selEnd: editorTextarea.selectionEnd };
    redoStack.push(currentState);
    const prevState = undoStack.pop();
    editorTextarea.value = prevState.data;
    editorTextarea.setSelectionRange(prevState.selStart, prevState.selEnd);
    editorTextarea.focus();
    saveDraft();
    updateStatusBar();
}

function redo() {
    if (redoStack.length === 0) return;
    const currentState = { data: editorTextarea.value, selStart: editorTextarea.selectionStart, selEnd: editorTextarea.selectionEnd };
    undoStack.push(currentState);
    const nextState = redoStack.pop();
    editorTextarea.value = nextState.data;
    editorTextarea.setSelectionRange(nextState.selStart, nextState.selEnd);
    editorTextarea.focus();
    saveDraft();
    updateStatusBar();
}

function handleTypingInput() {
    if (undoTimeout) clearTimeout(undoTimeout);
    undoTimeout = setTimeout(() => { saveStateForUndo(); }, 800);
}

document.addEventListener('keydown', (e) => {
    const shift = e.shiftKey;
    const alt = e.altKey;
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case (alt && "t"): e.preventDefault(); toggleTheme(); break;
            case (alt && "h"): e.preventDefault(); toggleHistory(); break;
            case (alt && "i"): e.preventDefault(); toggleInfo(); break;
            case (alt && "s"): e.preventDefault(); toggleSettings(); break;
            case (alt && "m"): e.preventDefault(); toggleMeta(); break;
            case (alt && "g"): e.preventDefault(); triggerBannerUpload(); break;
            case (alt && "f"): e.preventDefault(); fetchGhPosts(); break;
            case (alt && "l"): e.preventDefault(); loadSelectedGhPost(); break;

            case (shift && "m"): e.preventDefault(); saveManualBackup(); break;
            case (shift && "s"): e.preventDefault(); loadSelectedGhPost(); break;

            case (alt && "e"): e.preventDefault(); switchTab('editor'); break;
            case (alt && "p"): e.preventDefault(); switchTab('preview'); break;
            case (alt && "j"): e.preventDefault(); switchTab('json'); break;

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
    if (slashMenuOpen) {
        const items = document.querySelectorAll('.slash-menu-item');
        if (e.key === 'ArrowDown') {
            e.preventDefault(); activeSlashIndex = (activeSlashIndex + 1) % items.length; updateSlashMenuSelection();
            return;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault(); activeSlashIndex = (activeSlashIndex - 1 + items.length) % items.length; updateSlashMenuSelection();
            return;
        } else if (e.key === 'Enter') {
            e.preventDefault(); if (items[activeSlashIndex]) items[activeSlashIndex].click();
            return;
        } else if (e.key === 'Escape') {
            e.preventDefault(); hideSlashMenu();
            return;
        }
    }

    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 'z': e.preventDefault();
                if (shift) { redo(); } else { undo(); }
                break;
            case 'y': e.preventDefault(); redo();
                break;

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
    saveStateForUndo();
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
    updateStatusBar();
}

function toggleFormat(type) {
    saveStateForUndo();
    const start = editorTextarea.selectionStart, end = editorTextarea.selectionEnd, text = editorTextarea.value, selected = text.substring(start, end);
    let before = '', after = '';
    if (type === 'bold') { before = '**'; after = '**'; }
    if (type === 'italic') { before = '_'; after = '_'; }
    if (type === 'strike') { before = '~~'; after = '~~'; }
    if (type === 'highlight') { before = '<mark>'; after = '</mark>'; }
    if (type === 'code') { before = '`'; after = '`'; }
    if (type === 'codeblock') { before = '\n```\n'; after = '\n```\n'; }
    if (!selected && type === 'codeblock') { editorTextarea.value = text.substring(0, start) + '\n```\n\n```\n' + text.substring(end); editorTextarea.setSelectionRange(start + 5, start + 5); editorTextarea.focus(); saveDraft(); updateStatusBar(); return; }
    const outStart = Math.max(0, start - before.length), outEnd = Math.min(text.length, end + after.length);
    if (text.substring(outStart, start) === before && text.substring(end, outEnd) === after) {
        editorTextarea.value = text.substring(0, outStart) + selected + text.substring(outEnd); editorTextarea.setSelectionRange(outStart, outStart + selected.length);
    } else if (selected.startsWith(before) && selected.endsWith(after)) {
        const inner = selected.substring(before.length, selected.length - after.length);
        editorTextarea.value = text.substring(0, start) + inner + text.substring(end); editorTextarea.setSelectionRange(start, start + inner.length);
    } else {
        editorTextarea.value = text.substring(0, start) + before + selected + after + text.substring(end); editorTextarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }
    editorTextarea.focus(); saveDraft(); updateStatusBar();
}

function toggleBlock(type) {
    saveStateForUndo();
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
    editorTextarea.focus(); saveDraft(); updateStatusBar();
}

function toggleCallout(type) {
    saveStateForUndo();
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
    editorTextarea.focus(); saveDraft(); updateStatusBar();
}

function wrapTags(openTag, closeTag) {
    saveStateForUndo();
    const start = editorTextarea.selectionStart, end = editorTextarea.selectionEnd, text = editorTextarea.value;
    const selected = text.substring(start, end) || "Text";
    if (text.substring(Math.max(0, start - openTag.length), start) === openTag && text.substring(end, end + closeTag.length) === closeTag) {
        editorTextarea.value = text.substring(0, start - openTag.length) + selected + text.substring(end + closeTag.length);
        editorTextarea.setSelectionRange(start - openTag.length, start - openTag.length + selected.length);
    } else {
        editorTextarea.value = text.substring(0, start) + openTag + selected + closeTag + text.substring(end);
        editorTextarea.setSelectionRange(start + openTag.length, start + openTag.length + selected.length);
    }
    editorTextarea.focus(); saveDraft(); updateStatusBar();
}

function insertSnippet(type) {
    saveStateForUndo();
    const start = editorTextarea.selectionStart, end = editorTextarea.selectionEnd, text = editorTextarea.value, selected = text.substring(start, end);
    let replace = '', curOffset = 0;
    if (type === 'link') { replace = `[${selected || 'text'}](https://)`; curOffset = selected ? replace.length - 1 : 1; }
    else if (type === 'table') { replace = `\n| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |\n`; curOffset = replace.length; }
    else if (type === 'hr') { replace = `\n---\n`; curOffset = replace.length; }
    editorTextarea.value = text.substring(0, start) + replace + text.substring(end);
    if (type === 'link' && !selected) editorTextarea.setSelectionRange(start + 1, start + 5);
    else if (type === 'link' && selected) editorTextarea.setSelectionRange(start + replace.length - 1, start + replace.length - 1);
    else editorTextarea.setSelectionRange(start + curOffset, start + curOffset);
    editorTextarea.focus(); saveDraft(); updateStatusBar();
}

editorTextarea.addEventListener('dragover', e => { e.preventDefault(); editorTextarea.classList.add('drag-over'); });
editorTextarea.addEventListener('dragleave', () => editorTextarea.classList.remove('drag-over'));
editorTextarea.addEventListener('drop', e => { e.preventDefault(); editorTextarea.classList.remove('drag-over'); if (e.dataTransfer.files?.length) { uploadTarget = 'editor'; openUploadModal(e.dataTransfer.files[0]); } });


let turndownService;
try {
    if (typeof TurndownService !== 'undefined') { turndownService = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' }); }
} catch (e) {
    console.warn("Turndown library initialization failed", e);
}

editorTextarea.addEventListener('paste', (e) => {
    const html = e.clipboardData.getData('text/html');
    if (html && turndownService) {
        e.preventDefault();
        saveStateForUndo();
        const markdown = turndownService.turndown(html);
        const start = editorTextarea.selectionStart;
        const end = editorTextarea.selectionEnd;
        editorTextarea.value = editorTextarea.value.substring(0, start) + markdown + editorTextarea.value.substring(end);
        editorTextarea.setSelectionRange(start + markdown.length, start + markdown.length);
        saveDraft();
        updateStatusBar();
    }
});

editorTextarea.addEventListener('input', () => {
    saveDraft();
    updateStatusBar();
    checkSlashCommand();
    handleTypingInput();
});

function checkSlashCommand() {
    const text = editorTextarea.value;
    const pos = editorTextarea.selectionStart;
    const lastNL = text.lastIndexOf('\n', pos - 1);
    const lineStart = lastNL === -1 ? 0 : lastNL + 1;
    const currentLine = text.substring(lineStart, pos);
    if (currentLine === '/') { showSlashMenu(); } else { hideSlashMenu(); }
}

function showSlashMenu() {
    const menu = document.getElementById('slash-menu');
    const coords = getCaretCoordinates();
    menu.style.left = `${coords.left}px`;
    menu.style.top = `${coords.top}px`;
    menu.style.display = 'flex';
    slashMenuOpen = true;
    activeSlashIndex = 0;
    updateSlashMenuSelection();
}

function hideSlashMenu() {
    const menu = document.getElementById('slash-menu');
    menu.style.display = 'none';
    slashMenuOpen = false;
}

function updateSlashMenuSelection() {
    const items = document.querySelectorAll('.slash-menu-item');
    items.forEach((item, idx) => { if (idx === activeSlashIndex) { item.classList.add('active'); item.scrollIntoView({ block: 'nearest' }); } else { item.classList.remove('active'); } });
}

function insertSlashElement(type) {
    saveStateForUndo();
    const textarea = editorTextarea;
    const pos = textarea.selectionStart;
    const text = textarea.value;
    const lastNL = text.lastIndexOf('\n', pos - 1);
    const lineStart = lastNL === -1 ? 0 : lastNL + 1;
    const beforeSlash = text.substring(0, lineStart);
    const afterSlash = text.substring(pos);
    let insertText = '';
    let cursorOffset = 0;
    if (type === 'h1') insertText = '# ';
    else if (type === 'h2') insertText = '## ';
    else if (type === 'h3') insertText = '### ';
    else if (type === 'ul') insertText = '- ';
    else if (type === 'ol') insertText = '1. ';
    else if (type === 'task') insertText = '- [ ] ';
    else if (type === 'quote') insertText = '> ';
    else if (type === 'codeblock') { insertText = '```\n\n```'; cursorOffset = 4; }
    else if (type === 'table') insertText = '| Header 1 | Header 2 |\n| -------- | -------- |\n| Cell 1   | Cell 2   |';
    else if (type === 'hr') insertText = '---\n';
    textarea.value = beforeSlash + insertText + afterSlash;
    const newPos = lineStart + insertText.length - cursorOffset;
    textarea.setSelectionRange(newPos, newPos);
    textarea.focus();
    hideSlashMenu();
    saveDraft();
    updateStatusBar();
}

function getCaretCoordinates() {
    const textarea = editorTextarea;
    const pos = textarea.selectionStart;
    const div = document.createElement('div');
    const style = window.getComputedStyle(textarea);
    const copyStyles = [
        'fontFamily', 'fontSize', 'fontWeight', 'lineHeight',
        'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
        'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
        'boxSizing', 'width', 'height', 'textTransform'
    ];
    copyStyles.forEach(prop => { div.style[prop] = style[prop]; });
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    div.style.wordBreak = 'break-word';
    div.style.overflow = 'hidden';
    const textVal = textarea.value.substring(0, pos);
    div.textContent = textVal;
    const span = document.createElement('span');
    span.textContent = textarea.value.substring(pos, pos + 1) || '.';
    div.appendChild(span);
    textarea.parentNode.appendChild(div);
    const spanRect = span.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();
    textarea.parentNode.removeChild(div);
    return { left: spanRect.left - textareaRect.left + textarea.scrollLeft, top: spanRect.top - textareaRect.top + textarea.scrollTop + 22 };
}

function updateStatusBar() {
    const text = editorTextarea.value || '';
    const charCount = text.length;
    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const readingTime = Math.ceil(wordCount / 200);
    document.getElementById('editor-status').innerText = `Words: ${wordCount} | Characters: ${charCount} | Reading Time: ${readingTime} min`;
}

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

function updateJSONPane() {
    const format = document.getElementById('output-format').value;
    const codeBlock = document.getElementById('json-code-block');
    const data = getOutputJSON();
    if (format === 'json') {
        codeBlock.innerText = JSON.stringify(data, null, 2);
    } else {
        let md = '---\n';
        md += `Title: ${JSON.stringify(data.Title)}\n`;
        md += `Id: ${JSON.stringify(data.Id)}\n`;
        md += `Author: ${JSON.stringify(data.Author)}\n`;
        md += `Date: ${JSON.stringify(data.Date)}\n`;
        md += `Status: ${JSON.stringify(data.Status)}\n`;
        md += `Img: ${JSON.stringify(data.Img)}\n`;
        md += `Desc: ${JSON.stringify(data.Desc)}\n`;
        md += `Categories: ${JSON.stringify(data.Categories)}\n`;
        md += `Tags: ${JSON.stringify(data.Tags)}\n`;
        md += '---\n\n';
        md += data.Data || '';
        codeBlock.innerText = md;
    }
}

function switchTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.pane').forEach(p => p.classList.remove('active'));
    const tabBtn = Array.from(document.querySelectorAll('.tab-btn')).find(b => {
        const onClickAction = b.getAttribute('onclick') || '';
        return onClickAction.includes(`switchTab('${tab}')`);
    });
    if (tabBtn) tabBtn.classList.add('active');
    const targetPane = document.getElementById(tab + 'Pane');
    if (targetPane) targetPane.classList.add('active');
    if (tab === 'preview') updatePreview();
    if (tab === 'json') updateJSONPane();
}

function saveDraft() { localStorage.setItem(STORAGE_KEY, JSON.stringify(getOutputJSON())); }

function loadDraft() {
    try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        if (!saved) {
            document.getElementById('meta-content').classList.add('show');
            return;
        }
        inputs.title.value = saved.Title || '';
        inputs.id.value = saved.Id || '';
        inputs.tags.value = (saved.Tags || []).join(', ');
        inputs.status.value = saved.Status || 'Pub';
        inputs.author.value = saved.Author || '';
        inputs.img.value = saved.Img || '';
        inputs.desc.value = saved.Desc || '';
        document.querySelectorAll('.cat-checkbox').forEach(cb => cb.checked = (saved.Categories || []).includes(cb.value));
        updateCategoryText();
        editorTextarea.value = saved.Data || '';
        document.getElementById('meta-content').classList.add('show');
        undoStack.length = 0;
        redoStack.length = 0;
        undoStack.push({
            data: editorTextarea.value,
            selStart: editorTextarea.selectionStart,
            selEnd: editorTextarea.selectionEnd
        });
    } catch (e) {
        console.error(e);
    }
}

Object.values(inputs).forEach(i => {
    i.addEventListener('input', saveDraft);
    i.addEventListener('change', saveDraft);
});

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
        else { saveStateForUndo(); const t = document.getElementById('md-editor-textarea'); t.value = t.value.substring(0, t.selectionStart) + `![${file.name.split('.')[0]}](${url})` + t.value.substring(t.selectionEnd); saveDraft(); }
        setTimeout(closeUploadModal, 1000);
    } catch (err) { updateModalStatus(`Error: ${err.message}`, "error"); } finally { btn.disabled = false; btn.innerText = "Upload"; }
}
document.getElementById('upload-modal').addEventListener('click', e => e.target.id === 'upload-modal' && closeUploadModal());

const postName = `Untitled-Log_By_Core-Lord_at-${new Date().toDateString()}`;

function resolveGhPath() { let folder = localStorage.getItem('gh_path') || ''; if (folder && folder.endsWith('/')) folder = folder.slice(0, -1); return folder ? `${folder}/${(inputs.id.value || postName)}.json` : `${(inputs.id.value || postName)}.json`; }

async function pushToGithub() {
    const token = localStorage.getItem('gh_token'), owner = localStorage.getItem('gh_owner'), repo = localStorage.getItem('gh_repo'), branch = localStorage.getItem('gh_branch') || 'main';
    if (!token || !owner || !repo) return showStatus("Configure credentials first", "error");
    const path = resolveGhPath(), base64 = btoa(unescape(encodeURIComponent(JSON.stringify(getOutputJSON(), null, 2)))), url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`, headers = { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' };
    try {
        showStatus("Syncing...", "info"); let sha = null; const getRes = await fetch(url, { headers }); if (getRes.ok) sha = (await getRes.json()).sha;
        const updateRes = await fetch(url, { method: 'PUT', headers, body: JSON.stringify({ message: `Saved ${inputs.id.value || postName}.json to Github By Clog Builder`, content: base64, branch, sha }) });
        updateRes.ok ? showStatus("Pushed to GitHub!", "success") : showStatus(`Failed: ${(await updateRes.json()).message}`, "error");
    } catch (e) { showStatus(`Sync failed: ${e.message}`, "error"); }
}

async function fetchGhPosts() {
    const token = localStorage.getItem('gh_token'), owner = localStorage.getItem('gh_owner'), repo = localStorage.getItem('gh_repo'), branch = localStorage.getItem('gh_branch') || 'main', path = localStorage.getItem('gh_path') || '';
    const btn = document.getElementById('fetch-gh-btn');
    const select = document.getElementById('gh-posts-select');
    const loadBtn = document.getElementById('load-gh-btn');
    if (!token || !owner || !repo) return showStatus("Ensure credentials are configured first", "error");
    btn.innerText = "Fetching...";
    btn.disabled = true;
    try {
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
        const res = await fetch(url, { headers: { 'Authorization': `token ${token}` } });
        if (!res.ok) throw new Error((await res.json()).message || "Failed directory fetch");
        const files = await res.json();
        const jsonFiles = Array.isArray(files) ? files.filter(f => f.name.endsWith('.json')) : [];
        select.innerHTML = '<option value="">-- Select a post to load --</option>';
        if (jsonFiles.length === 0) {
            select.innerHTML = '<option value="">No JSON posts found in folder</option>';
            loadBtn.disabled = true;
        } else {
            jsonFiles.forEach(file => {
                const opt = document.createElement('option');
                opt.value = file.path;
                opt.innerText = file.name;
                select.appendChild(opt);
            });
            loadBtn.disabled = false;
        }
        showStatus("Directory structure fetched!", "success");
    } catch (e) {
        showStatus(`Fetch error: ${e.message}`, "error");
        select.innerHTML = '<option value="">Error loading directory</option>';
        loadBtn.disabled = true;
    } finally {
        btn.innerText = "Fetch Repo Posts Directory";
        btn.disabled = false;
    }
}

async function loadSelectedGhPost() {
    const select = document.getElementById('gh-posts-select');
    const path = select.value;
    if (!path) return showStatus("Select a file first", "error");
    const token = localStorage.getItem('gh_token'), owner = localStorage.getItem('gh_owner'), repo = localStorage.getItem('gh_repo'), branch = localStorage.getItem('gh_branch') || 'main';
    const loadBtn = document.getElementById('load-gh-btn');
    loadBtn.innerText = "Loading...";
    loadBtn.disabled = true;
    try {
        const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
        const res = await fetch(url, { headers: { 'Authorization': `token ${token}` } });
        if (!res.ok) throw new Error("Could not fetch file content");
        const data = await res.json();
        const jsonContent = JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\s/g, '')))));
        inputs.title.value = jsonContent.Title || '';
        inputs.id.value = jsonContent.Id || '';
        inputs.tags.value = (jsonContent.Tags || []).join(', ');
        inputs.status.value = jsonContent.Status || 'Pub';
        inputs.author.value = jsonContent.Author || '';
        inputs.img.value = jsonContent.Img || '';
        inputs.desc.value = jsonContent.Desc || '';
        document.querySelectorAll('.cat-checkbox').forEach(cb => {
            cb.checked = (jsonContent.Categories || []).includes(cb.value);
        });
        updateCategoryText();
        editorTextarea.value = jsonContent.Data || '';
        undoStack.length = 0;
        redoStack.length = 0;
        undoStack.push({
            data: editorTextarea.value,
            selStart: editorTextarea.selectionStart,
            selEnd: editorTextarea.selectionEnd
        });
        saveDraft();
        updateStatusBar();
        showStatus("Post content imported!", "success");
    } catch (e) {
        showStatus(`Import error: ${e.message}`, "error");
    } finally {
        loadBtn.innerText = "Load Selected Post Data";
        loadBtn.disabled = false;
    }
}

let lastBackupContent = '';

function toggleHistory() {
    document.getElementById('history-drawer').classList.toggle('open');
    document.getElementById('history-backdrop').classList.toggle('open');
    if (document.getElementById('history-drawer').classList.contains('open')) {
        renderHistoryList();
    }
}

function getBackups() {
    try {
        return JSON.parse(localStorage.getItem('clog_draft_backups')) || [];
    } catch (e) {
        return [];
    }
}

function saveBackup(isAuto = false) {
    const currentData = getOutputJSON();
    if (!currentData.Title || !currentData.Title.trim()) return;
    if (isAuto && currentData.Data === lastBackupContent) return;
    let backups = getBackups();
    const postId = currentData.Id ? currentData.Id.trim() : '';
    const postTitle = currentData.Title ? currentData.Title.trim() : '';
    backups = backups.filter(b => {
        if (postId && b.id === postId) return false;
        if (!postId && b.title === postTitle) return false;
        return true;
    });
    const newBackup = {
        timestamp: Date.now(),
        title: currentData.Title || "Untitled Post",
        id: currentData.Id || "untitled",
        data: currentData,
        date: getFormattedDate()
    };
    backups.unshift(newBackup);
    if (backups.length > 20) backups.pop();
    localStorage.setItem('clog_draft_backups', JSON.stringify(backups));
    lastBackupContent = currentData.Data;
    if (!isAuto) { showStatus("Backup saved successfully!", "success"); renderHistoryList(); }
}

function saveManualBackup() { saveBackup(false); }
function saveAutoBackup() { saveBackup(true); }

function deleteBackup(timestamp) {
    let backups = getBackups();
    backups = backups.filter(b => b.timestamp !== timestamp);
    localStorage.setItem('clog_draft_backups', JSON.stringify(backups));
    renderHistoryList();
    showStatus("Backup removed.", "info");
}

function clearAllBackups() {
    if (confirm("Delete all backup history? This cannot be undone.")) {
        localStorage.removeItem('clog_draft_backups');
        renderHistoryList();
        showStatus("All backups cleared.", "info");
    }
}

function restoreBackup(timestamp) {
    const backups = getBackups();
    const found = backups.find(b => b.timestamp === timestamp);
    if (found) {
        if (confirm("Restore this backup? Your current workspace will be overwritten.")) {
            const saved = found.data;
            inputs.title.value = saved.Title || '';
            inputs.id.value = saved.Id || '';
            inputs.tags.value = (saved.Tags || []).join(', ');
            inputs.status.value = saved.Status || 'Pub';
            inputs.author.value = saved.Author || '';
            inputs.img.value = saved.Img || '';
            inputs.desc.value = saved.Desc || '';
            document.querySelectorAll('.cat-checkbox').forEach(cb => {
                cb.checked = (saved.Categories || []).includes(cb.value);
            });
            updateCategoryText();
            editorTextarea.value = saved.Data || '';
            undoStack.length = 0;
            redoStack.length = 0;
            undoStack.push({
                data: editorTextarea.value,
                selStart: editorTextarea.selectionStart,
                selEnd: editorTextarea.selectionEnd
            });
            saveDraft();
            updateStatusBar();
            toggleHistory();
            showStatus("Backup restored!", "success");
        }
    }
}

function renderHistoryList() {
    const listEl = document.getElementById('history-list');
    listEl.innerHTML = '';
    const backups = getBackups();
    if (backups.length === 0) {
        listEl.innerHTML = '<div style="text-align:center;color:var(--fg-muted);font-size:0.85rem;margin-top:20px;">No backups found</div>';
        return;
    }

    backups.forEach(b => {
        const timeStr = new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const dateStr = new Date(b.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-item-title" title="${b.title}">${b.title}</div>
            <div class="history-item-meta">
                <span>ID: ${b.id}</span>
                <span>${dateStr} at ${timeStr}</span>
            </div>
            <div class="history-item-actions">
                <button class="btn btn-secondary" title=" Restore &fw=700;${b.title}&fw;" onclick="restoreBackup(${b.timestamp})">Restore</button>
                <button class="btn btn-danger" title="Delete &fw=700;${b.title}&fw;" onclick="deleteBackup(${b.timestamp})" style="max-width:40px;padding:5px;">
                   <svg class="icon" style="width:0.85rem;height:0.85rem;"><path fill="currentColor" d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12Z"/></svg>
                </button>
            </div>
        `;
        listEl.appendChild(item);
    });
}

function saveJSON() { const blob = new Blob([JSON.stringify(getOutputJSON(), null, 2)], { type: "application/json" }), url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = (inputs.id.value || postName) + '.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); showStatus("File Downloaded!", "success"); }
function copyJSON() { navigator.clipboard.writeText(JSON.stringify(getOutputJSON(), null, 2)); showStatus("Copied to Clipboard!", "success"); }

function clearAll() {
    if (!confirm("Clear workspace?")) return;
    Object.values(inputs).forEach(i => i.value = '');
    inputs.status.value = 'Pub';
    document.querySelectorAll('.cat-checkbox').forEach(cb => cb.checked = false);
    updateCategoryText();
    editorTextarea.value = '';
    localStorage.removeItem(STORAGE_KEY);
    undoStack.length = 0;
    redoStack.length = 0;
    undoStack.push({ data: '', selStart: 0, selEnd: 0 });
    switchTab('editor');
    updateStatusBar();
}

function getFormattedDate() { const d = new Date(), pad = n => (n < 10 ? '0' : '') + n; return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`; }
function toggleTheme() { const h = document.documentElement; h.setAttribute('data-theme', h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); }
function showStatus(text, type = "success") { const t = document.getElementById('toast'); t.innerText = text; t.className = "toast show"; t.classList.add(type === 'error' ? 'error' : (type === 'info' ? 'info' : 'success')); setTimeout(() => t.classList.remove('show'), 3000); }

setInterval(saveAutoBackup, 60000);

if (window.matchMedia('(prefers-color-scheme: dark)').matches) document.documentElement.setAttribute('data-theme', 'dark');

populateCategories();
populateAuthors();
loadDraft();
loadSettings();
updateStatusBar();