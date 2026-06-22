const DB_Path = "../db/blogs.json";
const Logs_Path = "../Logs/";

let indexData = [];
let activeFilters = { ct: [], tg: null, q: "", author: null, bookmarksOnly: false };
let savedScrollPosition = 0;

document.addEventListener('DOMContentLoaded', () => {
    updateUIStyles();
    initializeClogReader();
    setupGlobalEventListeners();
});

window.addEventListener('popstate', processUrlParamsAndRoute);

function setupGlobalEventListeners() {
    window.addEventListener('scroll', handleReaderProgressScroll, { passive: true });
}

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
    activeFilters.author = params.get('author') || null;
    activeFilters.bookmarksOnly = params.get('bookmarks') === "true";
    const ctParam = params.get('ct');
    activeFilters.ct = ctParam ? ctParam.split(',').filter(Boolean) : [];
    document.getElementById('search-bar').value = activeFilters.q;
    const bkmkBtn = document.getElementById('nav-bookmark-toggle');
    if (activeFilters.bookmarksOnly) {
        bkmkBtn.classList.add('active');
    } else {
        bkmkBtn.classList.remove('active');
    }
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
    if (activeFilters.author) url.searchParams.set('author', activeFilters.author);
    else url.searchParams.delete('author');
    if (activeFilters.q) url.searchParams.set('q', activeFilters.q);
    else url.searchParams.delete('q');
    if (activeFilters.bookmarksOnly) url.searchParams.set('bookmarks', 'true');
    else url.searchParams.delete('bookmarks');
    window.history.pushState({}, '', url);
    processUrlParamsAndRoute();
}

function showListView() {
    document.getElementById('main-reader-pane').classList.remove('active');
    document.getElementById('reading-progress-container').classList.add('hidden');
    document.getElementById('main-search-container').style.display = 'flex';
    document.getElementById('main-layout-wrapper').style.display = 'grid';
    buildSidebarFilters();
    renderPostList();
    if (savedScrollPosition > 0) {
        window.scrollTo({ top: savedScrollPosition, behavior: 'instant' });
        savedScrollPosition = 0;
    }
}
function toggleFilterDrawer() {
    const sidebar = document.getElementById('sidebar-filters');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function closeFilterDrawer() {
    const sidebar = document.getElementById('sidebar-filters');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.remove('active');
    overlay.classList.remove('active');
}

function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func.apply(this, args);
        }, delay);
    };
}

const debouncedSearch = debounce(() => {
    activeFilters.q = document.getElementById('search-bar').value;
    updateUrlState();
}, 500);

function handleSearchInput() {
    debouncedSearch();
}

function getBookmarkedArticles() {
    try {
        return JSON.parse(localStorage.getItem('clog_bookmarks')) || [];
    } catch (e) {
        return [];
    }
}

function isArticleBookmarked(articleId) {
    return getBookmarkedArticles().includes(articleId);
}

function toggleArticleBookmark(articleId) {
    let bookmarks = getBookmarkedArticles();
    const index = bookmarks.indexOf(articleId);
    if (index > -1) {
        bookmarks.splice(index, 1);
    } else {
        bookmarks.push(articleId);
    }
    localStorage.setItem('clog_bookmarks', JSON.stringify(bookmarks));
}

function toggleBookmarkOnlyView() {
    activeFilters.bookmarksOnly = !activeFilters.bookmarksOnly;
    updateUrlState();
}

function buildSidebarFilters() {
    const categoriesMap = {};
    indexData.forEach(item => {
        (item.Cat || []).forEach(c => { if (c) categoriesMap[c] = (categoriesMap[c] || 0) + 1; });
    });
    const catList = document.getElementById('category-filter-list');
    catList.innerHTML = '';
    Object.keys(categoriesMap).sort().forEach(cat => {
        const isActive = activeFilters.ct.includes(cat);
        const li = document.createElement('li');
        li.className = `filter-item ${isActive ? 'active' : ''}`;
        li.onclick = () => {
            toggleCategoryFilter(cat);
            closeFilterDrawer();
        };
        li.setAttribute('title', isActive ? `Click to deselect ${cat}` : `Click to filter by category: ${cat}`);
        li.innerHTML = `
          <div style="display:flex; align-items:center;">
            <span class="checkbox-box">${isActive ? '<svg class="icon" style="width:12px;height:12px;"><use href="#icon-check"></use></svg>' : ''}</span>
            <span>${cat}</span>
          </div>
          <span class="filter-count" title="${categoriesMap[cat]} publications in this category">${categoriesMap[cat]}</span>
        `;
        catList.appendChild(li);
    });
}

function renderPostList() {
    const grid = document.getElementById('publication-grid');
    grid.innerHTML = "";
    const bookmarkedList = getBookmarkedArticles();
    const filtered = indexData.filter(item => {
        if (activeFilters.bookmarksOnly && !bookmarkedList.includes(item.Article)) return false;
        if (activeFilters.ct.length > 0) {
            if (!item.Cat || !activeFilters.ct.some(selected => item.Cat.includes(selected))) return false;
        }
        if (activeFilters.tg && (!item.Tags || !item.Tags.includes(activeFilters.tg))) return false;
        if (activeFilters.author) {
            if (!item.Author || item.Author.toLowerCase() !== activeFilters.author.toLowerCase()) return false;
        }
        if (activeFilters.q) {
            const query = activeFilters.q.toLowerCase();
            const inTitle = item.Name && item.Name.toLowerCase().includes(query);
            const inDesc = item.Desc && item.Desc.toLowerCase().includes(query);
            const inAuthor = item.Author && item.Author.toLowerCase().includes(query);
            const inCats = item.Cat && item.Cat.some(c => c.toLowerCase().includes(query));
            const inTags = item.Tags && item.Tags.some(t => t.toLowerCase().includes(query));
            if (!inTitle && !inDesc && !inAuthor && !inCats && !inTags) return false;
        }
        return true;
    });

    const clearBtn = document.getElementById('clear-filters-btn');
    if (activeFilters.ct.length > 0 || activeFilters.tg || activeFilters.q || activeFilters.author || activeFilters.bookmarksOnly) {
        let resultsText = `Found ${filtered.length} matching publications`;
        if (activeFilters.author) {
            resultsText += ` by author "${activeFilters.author}"`;
        }
        if (activeFilters.bookmarksOnly) {
            resultsText += ` in bookmarks`;
        }
        document.getElementById('results-count').innerText = resultsText;
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
        const catHtml = (item.Cat || []).map(c => `<span class="card-category-badge" title="Category: ${c}">${c}</span>`).join('');
        const tagHtml = (item.Tags || []).map(t => `<span class="card-tag" onclick="clickCardTag('${t}', event)" title="Filter by tag: #${t}">#${t}</span>`).join('');
        const displayAuthor = item.Author || 'Unknown';
        const bookmarked = bookmarkedList.includes(item.Article);
        card.innerHTML = `
          <div class="card-img-wrapper" onclick="openPost('${item.Article}')" title="Click to read: ${item.Name}">
            <img src="${bannerImg}" alt="${item.Name}" class="card-img" loading="lazy">
            <div class="card-category-container">${catHtml}</div>
          </div>
          <div class="card-content">
            <div class="card-meta">
              <b>Updated:</b><span>${item.Date || ''}</span> &bull; 
              <b>Author:</b><span class="clickable-author" onclick="clickCardAuthor('${displayAuthor}', event)" title="Filter publications by ${displayAuthor}">${displayAuthor}</span>
            </div>
            <h2 class="card-title" onclick="openPost('${item.Article}')" title="Click to read: ${item.Name}">${item.Name}</h2>
            <p class="card-desc">${item.Desc || 'No description provided.'}</p>
            <div class="card-tags">${tagHtml}</div>
            
            <div class="card-actions-wrapper">
              <button class="bookmark-btn ${bookmarked ? 'active' : ''}" onclick="toggleBookmarkAction('${item.Article}', event)" title="${bookmarked ? 'Remove Bookmark' : 'Save to Bookmarks'}">
                <svg class="icon">
                  <use href="#icon-${bookmarked ? 'bookmark-filled' : 'bookmark'}"></use>
                </svg>
              </button>
            </div>
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

function toggleBookmarkAction(articleId, event) {
    event.stopPropagation();
    toggleArticleBookmark(articleId);
    renderPostList();
}

function clickCardTag(tag, event) {
    event.stopPropagation();
    activeFilters.tg = tag;
    updateUrlState();
}

function clickCardAuthor(author, event) {
    event.stopPropagation();
    activeFilters.author = author;
    updateUrlState();
}

function clearFiltersAndHome() {
    activeFilters = { ct: [], tg: null, q: "", author: null, bookmarksOnly: false };
    window.history.pushState({}, '', new URL(window.location.pathname, window.location.origin));
    processUrlParamsAndRoute();
}

function openPost(articleId) {
    savedScrollPosition = window.scrollY; // Set memory path anchor
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

function toggleLoaderState(show) {
    document.getElementById('loader-status').style.display = show ? 'block' : 'none';
}

async function loadAndRenderFullPost(logId) {
    document.getElementById('main-search-container').style.display = 'none';
    document.getElementById('main-layout-wrapper').style.display = 'none';
    const readerPane = document.getElementById('main-reader-pane');
    readerPane.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.getElementById('reading-progress-container').classList.remove('hidden');
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
        const displayAuthor = postData.Author || dbEntry.Author || "System Admin";
        document.getElementById('full-date').innerText = postData.Date || dbEntry.Date;
        const authorSpan = document.getElementById('full-author');
        authorSpan.innerText = displayAuthor;
        authorSpan.setAttribute('title', `Filter publications by ${displayAuthor}`);
        authorSpan.onclick = (event) => {
            clickCardAuthor(displayAuthor, event);
            exitReaderView();
        };
        document.getElementById('full-meta-block').style.display = 'flex';
        const catBadges = (postData.Categories || dbEntry.Cat || []).map(c => `<span class="cat-badge" title="Category: ${c}">${c}</span>`).join('');
        const tagBadges = (postData.Tags || []).map(t => `<span style="cursor:pointer;" onclick="clickCardTag('${t}', event); exitReaderView();" title="Filter by tag: #${t}">#${t}</span>`).join('');
        document.getElementById('full-tags').innerHTML = catBadges + tagBadges;
        const articleText = postData.Data || "";
        document.getElementById('reading-time').innerText = getEstimatedReadingTime(articleText);
        const bodyContainer = document.getElementById('full-body');
        if (window.marked) {
            bodyContainer.innerHTML = marked.parse(articleText);
            generateTableOfContents();
        } else {
            bodyContainer.innerHTML = `<p style="color:var(--danger)">Dependency Error: Marked.js missing.</p><pre>${articleText}</pre>`;
            document.getElementById('toc-container').style.display = 'none';
        }
        setupReaderBookmarkAction(logId);
        const shareBtn = document.getElementById('share-action-btn');
        shareBtn.onclick = () => shareTargetArticle(dbEntry.Name);
    } catch (err) {
        console.warn("Post load failure:", err);
        trigger404Redirect();
    } finally {
        toggleLoaderState(false);
    }
}

function getEstimatedReadingTime(text) {
    const cleanText = text.replace(/[#*`~_\[\]()\-]/g, '');
    const words = cleanText.trim().split(/\s+/).filter(Boolean).length;
    const wpm = 200;
    const minutes = Math.ceil(words / wpm);
    return `${minutes} min read`;
}

function generateTableOfContents() {
    const tocContainer = document.getElementById('toc-container');
    const tocList = document.getElementById('toc-list');
    tocList.innerHTML = '';
    const bodyContainer = document.getElementById('full-body');
    const headings = bodyContainer.querySelectorAll('h2, h3');
    if (headings.length === 0) {
        tocContainer.style.display = 'none';
        return;
    }
    tocContainer.removeAttribute('open'); // Initialize state closed
    tocContainer.style.display = 'block';
    headings.forEach((heading, index) => {
        if (!heading.id) {
            const rawText = heading.innerText.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            heading.id = `clog-heading-${index}-${rawText}`;
        }
        const anchor = document.createElement('a');
        anchor.href = `#${heading.id}`;
        anchor.className = `toc-item ${heading.tagName.toLowerCase()}`;
        anchor.innerText = heading.innerText;
        anchor.onclick = (e) => {
            e.preventDefault();
            heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        tocList.appendChild(anchor);
    });
}

function handleReaderProgressScroll() {
    const readerPane = document.getElementById('main-reader-pane');
    if (!readerPane || !readerPane.classList.contains('active')) return;
    const progressBar = document.getElementById('reading-progress-bar');
    if (!progressBar) return;
    const windowScroll = document.documentElement.scrollTop || document.body.scrollTop;
    const contentHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollPercentage = contentHeight > 0 ? (windowScroll / contentHeight) * 100 : 0;
    progressBar.style.width = `${scrollPercentage}%`;
}

function setupReaderBookmarkAction(logId) {
    const bkmkBtn = document.getElementById('bookmark-action-btn');
    const updateReaderBkmkBtnState = () => {
        const bookmarked = isArticleBookmarked(logId);
        bkmkBtn.innerHTML = `
          <svg class="icon">
            <use href="#icon-${bookmarked ? 'bookmark-filled' : 'bookmark'}"></use>
          </svg> ${bookmarked ? 'Saved' : 'Save'}
        `;
        bkmkBtn.setAttribute('title', bookmarked ? 'Remove Bookmark' : 'Save this Article');
    };
    updateReaderBkmkBtnState();
    bkmkBtn.onclick = () => {
        toggleArticleBookmark(logId);
        updateReaderBkmkBtnState();
    };
}

async function shareTargetArticle(title) {
    const shareData = {
        title: title,
        text: `Read "${title}" on Clog Reader`,
        url: window.location.href
    };
    try {
        if (navigator.share) {
            await navigator.share(shareData);
        } else {
            await navigator.clipboard.writeText(window.location.href);
            if (window.toaster && typeof window.toaster.show === 'function') {
                window.toaster.show('Article link copied to clipboard.');
            } else {
                alert('Article link copied to clipboard.');
            }
        }
    } catch (err) {
        console.warn('System share error occurred:', err);
    }
}

function trigger404Redirect() {
    const url = new URL(window.location);
    url.searchParams.set('log', '404');
    window.history.pushState({}, '', url);
    render404Page();
}

async function render404Page() {
    document.getElementById('full-meta-block').style.display = 'none';
    document.getElementById('toc-container').style.display = 'none';
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