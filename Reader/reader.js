
// const DB_Path = "/src/db/blogs.json";
// const Logs_Path = "/Logs";

const DB_Path = "https://raw.githubusercontent.com/MainRoute-Core/Clogs/output/blogs.json";
const Logs_Path = "https://raw.githubusercontent.com/MainRoute-Core/Clogs/main/Logs";

let indexData = [];
let activeFilters = { ct: [], tg: null, q: "" };

document.addEventListener('DOMContentLoaded', () => {
    updateUIStyles();
    initializeClogReader();
});

window.addEventListener('popstate', processUrlParamsAndRoute);

function updateUIStyles() {
    const badge = document.getElementById('source-badge');
    badge.innerText = DB_Path.includes('http') ? "Cloud Synced" : "Local Database";
    if (DB_Path.includes('http')) badge.classList.add('remote');

    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
}

async function initializeClogReader() {
    toggleLoaderState(true);
    try {
        const response = await fetch(DB_Path);
        if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

        let data = await response.json();
        indexData = Array.isArray(data) ? data : (data.blogs || []);
        indexData = indexData.filter(item => item.Status === "Pub");

        processUrlParamsAndRoute();
    } catch (err) {
        document.getElementById('publication-grid').innerHTML = `
          <div style="grid-column: 1/-1; padding: 40px; text-align: center; color: var(--danger);">
            <h2>Database Connection Failed</h2>
            <p>Could not load <strong>${DB_Path}</strong>. Check your paths and console logs.</p>
          </div>
        `;
    } finally {
        toggleLoaderState(false);
    }
}

function processUrlParamsAndRoute() {
    const params = new URLSearchParams(window.location.search);
    const logId = params.get('log');

    activeFilters.q = params.get('q') || "";
    activeFilters.tg = params.get('tg') || null;

    const ctParam = params.get('ct');
    activeFilters.ct = ctParam ? ctParam.split(',').filter(Boolean) : [];

    document.getElementById('search-bar').value = activeFilters.q;

    if (logId) {
        loadAndRenderFullPost(logId);
    } else {
        showListView();
    }
}

function updateUrlState() {
    const url = new URL(window.location);
    url.searchParams.delete('log');

    if (activeFilters.ct.length > 0) url.searchParams.set('ct', activeFilters.ct.join(','));
    else url.searchParams.delete('ct');

    if (activeFilters.tg) url.searchParams.set('tg', activeFilters.tg);
    else url.searchParams.delete('tg');

    if (activeFilters.q) url.searchParams.set('q', activeFilters.q);
    else url.searchParams.delete('q');

    window.history.pushState({}, '', url);
    processUrlParamsAndRoute();
}

function showListView() {
    document.getElementById('main-reader-pane').classList.remove('active');
    document.getElementById('main-search-container').style.display = 'block';
    document.getElementById('main-layout-wrapper').style.display = 'grid';

    buildSidebarFilters();
    renderPostList();
}

function buildSidebarFilters() {
    const categoriesMap = {};
    const tagsMap = {};

    indexData.forEach(item => {
        (item.Cat || []).forEach(c => { if (c) categoriesMap[c] = (categoriesMap[c] || 0) + 1; });
        (item.Tags || []).forEach(t => { if (t) tagsMap[t] = (tagsMap[t] || 0) + 1; });
    });

    const catList = document.getElementById('category-filter-list');
    catList.innerHTML = '';
    Object.keys(categoriesMap).sort().forEach(cat => {
        const isActive = activeFilters.ct.includes(cat);
        const li = document.createElement('li');
        li.className = `filter-item ${isActive ? 'active' : ''}`;
        li.onclick = () => toggleCategoryFilter(cat);
        li.innerHTML = `
          <div style="display:flex; align-items:center;">
            <span class="checkbox-box">${isActive ? '<svg class="icon" style="width:12px;height:12px;"><use href="#icon-check"></use></svg>' : ''}</span>
            <span>${cat}</span>
          </div>
          <span class="filter-count">${categoriesMap[cat]}</span>
        `;
        catList.appendChild(li);
    });

    const tagList = document.getElementById('tag-filter-list');
    tagList.innerHTML = Object.keys(tagsMap).length > 0 ? '' : '<li style="font-size:0.85rem; opacity:0.6;">Tags generated from fetched data</li>';
    Object.keys(tagsMap).sort().forEach(tag => {
        const isActive = activeFilters.tg === tag;
        const li = document.createElement('li');
        li.className = `filter-item ${isActive ? 'active' : ''}`;
        li.onclick = () => { activeFilters.tg = (activeFilters.tg === tag) ? null : tag; updateUrlState(); };
        li.innerHTML = `<span>#${tag}</span><span class="filter-count">${tagsMap[tag]}</span>`;
        tagList.appendChild(li);
    });
}

function renderPostList() {
    const grid = document.getElementById('publication-grid');
    grid.innerHTML = "";

    const filtered = indexData.filter(item => {
        if (activeFilters.ct.length > 0) {
            if (!item.Cat || !activeFilters.ct.some(selected => item.Cat.includes(selected))) return false;
        }
        if (activeFilters.tg && (!item.Tags || !item.Tags.includes(activeFilters.tg))) return false;

        if (activeFilters.q) {
            const query = activeFilters.q.toLowerCase();
            const inTitle = item.Name && item.Name.toLowerCase().includes(query);
            const inDesc = item.Desc && item.Desc.toLowerCase().includes(query);
            // const isAuthor = item.Author && item.Desc.toLowerCase().includes(query);
            const inCats = item.Cat && item.Cat.some(c => c.toLowerCase().includes(query));
            const inTags = item.Tags && item.Tags.some(t => t.toLowerCase().includes(query));
            if (!inTitle && !inDesc && !inCats && !inTags) return false;
        }
        return true;
    });

    const clearBtn = document.getElementById('clear-filters-btn');
    if (activeFilters.ct.length > 0 || activeFilters.tg || activeFilters.q) {
        document.getElementById('results-count').innerText = `Found ${filtered.length} matching publications`;
        clearBtn.classList.remove('hidden');
    } else {
        document.getElementById('results-count').innerText = `Total Publications: ${filtered.length}`;
        clearBtn.classList.add('hidden');
    }

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 60px 20px; opacity: 0.7;">No publications match your exact filter parameters.</div>`;
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement('article');
        card.className = "post-card";

        const bannerImg = item.Img || 'https://mainroute-core.github.io/src/social.png';
        const catHtml = (item.Cat || []).map(c => `<span class="card-category-badge">${c}</span>`).join('');
        const tagHtml = (item.Tags || []).map(t => `<span class="card-tag" onclick="clickCardTag('${t}', event)">#${t}</span>`).join('');

        card.innerHTML = `
          <div class="card-img-wrapper" onclick="openPost('${item.Article}')">
            <img src="${bannerImg}" alt="${item.Name}" class="card-img" loading="lazy">
            <div class="card-category-container">${catHtml}</div>
          </div>
          <div class="card-content">
            <div class="card-meta"><b>Updated:</b><span>${item.Date || ''}</span>&bull; <b>Author:</b><span>${item.Author || 'UnKnown'}</span></div>
            <h2 class="card-title" onclick="openPost('${item.Article}')">${item.Name}</h2>
            <p class="card-desc">${item.Desc || 'No description provided.'}</p>
            <div class="card-tags">${tagHtml}</div>
          </div>
        `;
        grid.appendChild(card);
    });
}

function toggleCategoryFilter(cat) {
    const idx = activeFilters.ct.indexOf(cat);
    if (idx > -1) activeFilters.ct.splice(idx, 1);
    else activeFilters.ct.push(cat);
    updateUrlState();
}

function clickCardTag(tag, event) {
    event.stopPropagation();
    activeFilters.tg = tag;
    updateUrlState();
}

function handleSearchInput() {
    activeFilters.q = document.getElementById('search-bar').value;
    updateUrlState();
}

function clearFiltersAndHome() {
    activeFilters = { ct: [], tg: null, q: "" };
    window.history.pushState({}, '', new URL(window.location.pathname, window.location.origin));
    processUrlParamsAndRoute();
}

function openPost(articleId) {
    const url = new URL(window.location);
    url.searchParams.set('log', articleId);
    window.history.pushState({}, '', url);
    processUrlParamsAndRoute();
}

function exitReaderView() {
    const url = new URL(window.location);
    url.searchParams.delete('log');
    window.history.pushState({}, '', url);
    processUrlParamsAndRoute();
}

function toggleTheme() {
    const html = document.documentElement;
    html.setAttribute('data-theme', html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
}

function toggleLoaderState(show) { document.getElementById('loader-status').style.display = show ? 'block' : 'none'; }

async function loadAndRenderFullPost(logId) {
    document.getElementById('main-search-container').style.display = 'none';
    document.getElementById('main-layout-wrapper').style.display = 'none';
    document.getElementById('main-reader-pane').classList.add('active');

    if (logId === '404') {
        render404Page();
        return;
    }

    const dbEntry = indexData.find(item => item.Article === logId);
    if (!dbEntry) {
        trigger404Redirect();
        return;
    }

    toggleLoaderState(true);
    const postUrl = `${Logs_Path.replace(/\/$/, '')}/${dbEntry.Url}`;

    try {
        const response = await fetch(postUrl);
        if (!response.ok) throw new Error("File not found or access denied.");

        const postData = await response.json();

        document.getElementById('full-img').src = postData.Img || dbEntry.Img || 'https://mainroute-core.github.io/src/social.png';
        document.getElementById('full-title').innerText = postData.Title || dbEntry.Name;
        document.getElementById('full-date').innerText = postData.Date || dbEntry.Date;
        document.getElementById('full-author').innerText = postData.Author || "System Admin";
        document.getElementById('full-meta-block').style.display = 'flex';

        const catBadges = (postData.Categories || dbEntry.Cat || []).map(c => `<span class="cat-badge">${c}</span>`).join('');
        const tagBadges = (postData.Tags || []).map(t => `<span style="cursor:pointer;" onclick="clickCardTag('${t}', event); exitReaderView();">#${t}</span>`).join('');
        document.getElementById('full-tags').innerHTML = catBadges + tagBadges;

        const bodyContainer = document.getElementById('full-body');
        if (window.marked) bodyContainer.innerHTML = marked.parse(postData.Data || "");
        else bodyContainer.innerHTML = `<p style="color:var(--danger)">Dependency Error: Marked.js missing.</p><pre>${postData.Data}</pre>`;

    } catch (err) {
        console.warn("Post load failure:", err);
        trigger404Redirect();
    } finally {
        toggleLoaderState(false);
    }
}

function trigger404Redirect() {
    const url = new URL(window.location);
    url.searchParams.set('log', '404');
    window.history.pushState({}, '', url);
    render404Page();
}

async function render404Page() {
    document.getElementById('full-img').src = 'https://mainroute-core.github.io/src/social.png';
    document.getElementById('full-title').innerText = "Publication Not Found";
    document.getElementById('full-meta-block').style.display = 'none';

    const bodyContainer = document.getElementById('full-body');
    try {
        const res = await fetch('404.html');
        if (res.ok) bodyContainer.innerHTML = await res.text();
        else throw new Error("No 404 template");
    } catch (e) {
        bodyContainer.innerHTML = `
          <div style="text-align:center; padding: 40px 0;">
             <h2 style="color:var(--danger);">Error 404</h2>
             <p>The post you are looking for does not exist in the database or has been removed.</p>
             <button class="btn btn-primary" onclick="clearFiltersAndHome()" style="margin-top:20px;">Return Home</button>
          </div>
        `;
    }
    toggleLoaderState(false);
}