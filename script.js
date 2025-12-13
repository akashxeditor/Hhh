// --- Supabase কনফিগারেশন ---
// আপনার তৈরি করা নতুন ফাংশনের লিংক
const API_URL = "https://bnlxkclylntwrgrprakq.supabase.co/functions/v1/swift-endpoint";

// --- মেইন লজিক ---
let adminAvatar = "https://via.placeholder.com/36"; // ডিফল্ট অবতার
let allData = [];
let currentItem = null;

// ১. পেজ লোড হলে Supabase থেকে ডাটা আনা
document.addEventListener("DOMContentLoaded", () => {
    loadData();
});

async function loadData() {
    const grid = document.getElementById('contentGrid');
    // লোডিং এনিমেশন বা টেক্সট
    if(grid) grid.innerHTML = "<p style='text-align:center; margin-top:20px;'>Loading content...</p>";

    try {
        const response = await fetch(API_URL);
        
        if (!response.ok) {
            throw new Error(`Server Error: ${response.status}`);
        }

        const data = await response.json();
        
        // ডাটা প্রসেসিং (Object থেকে Array)
        allData = [];
        if (data) {
            Object.keys(data).forEach(key => {
                allData.push({ id: key, ...data[key] });
            });
            allData.reverse(); // নতুন পোস্ট আগে দেখাবে

            // গ্রিড রেন্ডার করা
            if(window.renderGrid) {
                window.renderGrid(allData, 'contentGrid');
                // ট্রেন্ডিং সেকশন (যাদের রেটিং ৪.৫ এর উপরে)
                const trending = allData.filter(d => d.rating && parseFloat(d.rating) >= 4.5);
                window.renderGrid(trending, 'trendingGrid');
            }
            
            // URL চেক করে মোডাল ওপেন করা (যদি শেয়ার্ড লিংক থাকে)
            checkUrlAndOpenModal(allData);

        } else {
            if(grid) grid.innerHTML = "<p style='text-align:center'>No Data Found</p>";
        }

    } catch (error) {
        console.error("Error loading data:", error);
        if(grid) grid.innerHTML = "<p style='text-align:center; color:red;'>Failed to load data. Please try again.</p>";
    }
}

// ** URL চেক করে মোডাল ওপেন করা **
function checkUrlAndOpenModal(dataList) {
    const urlParams = new URLSearchParams(window.location.search);
    const viewSlug = urlParams.get('view');

    if (viewSlug) {
        // Slug থেকে আসল টাইটেল বের করা
        const titleToFind = decodeURIComponent(viewSlug).replace(/-/g, ' ').trim().toLowerCase();
        
        const foundItem = dataList.find(item => item.title.toLowerCase() === titleToFind);

        if (foundItem) {
            const timeStr = timeAgo(foundItem.timestamp);
            window.openModal(foundItem, timeStr, false); 
        }
    }
}

// ২. গ্রিড রেন্ডারার
window.renderGrid = (list, containerId) => {
    const container = document.getElementById(containerId);
    if(!container) return;

    container.innerHTML = "";
    list.forEach(item => {
        const timeStr = timeAgo(item.timestamp);
        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => window.openModal(item, timeStr, true);
        
        card.innerHTML = `
            <div class="thumbnail-container">
                <img src="${item.imgLink}" class="card-img" onerror="this.src='https://via.placeholder.com/480x270'">
            </div>
            <div class="card-meta">
                <img src="${adminAvatar}" class="channel-icon">
                <div class="text-info">
                    <div class="card-title">${item.title}</div>
                    <div class="card-subtitle">Rating: ${item.rating || 'N/A'} • ${timeStr}</div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
};

// ৩. টাইম Ago ফাংশন
function timeAgo(ts) {
    if(!ts) return "Recently";
    const sec = Math.floor((Date.now()-ts)/1000);
    if(sec>86400) return Math.floor(sec/86400) + " days ago";
    if(sec>3600) return Math.floor(sec/3600) + " hours ago";
    if(sec>60) return Math.floor(sec/60) + " mins ago";
    return "Just now";
}

// ৪. মোডাল এবং URL হ্যান্ডলিং
window.openModal = (item, time, pushHistory = true) => {
    currentItem = item;
    
    // সেফটি চেক: এলিমেন্ট আছে কিনা দেখে নেওয়া
    const setIfExists = (id, val) => { const el = document.getElementById(id); if(el) el.innerText = val; };
    const setSrcIfExists = (id, val) => { const el = document.getElementById(id); if(el) el.src = val; };

    setSrcIfExists('modalImg', item.imgLink);
    setIfExists('modalTitle', item.title);
    setIfExists('modalPrompt', item.prompt);
    setIfExists('modalMeta', `Posted: ${time} • Rating: ${item.rating || 'N/A'}`);
    
    // URL আপডেট করা
    const slug = item.title.trim().replace(/\s+/g, '-');
    const newUrl = `?view=${encodeURIComponent(slug)}`;
    
    if (pushHistory) {
        window.history.pushState({modalOpen: true, itemId: item.id}, "", newUrl);
    }

    // কমেন্ট সেকশন রেন্ডার
    const cBox = document.getElementById('modalComments');
    if(cBox) {
        cBox.innerHTML = "";
        if(item.comments) {
            Object.values(item.comments).forEach(c => {
                cBox.innerHTML += `<div style="border-bottom:1px dashed var(--border-color); padding:5px 0; margin-bottom:5px;">
                    <span style="color:var(--accent-color); font-weight:bold;">Visitor:</span> ${c.text}
                </div>`;
            });
        } else {
            cBox.innerHTML = "<p>No comments yet.</p>";
        }
    }

    const modal = document.getElementById('detailModal');
    if(modal) modal.style.display = 'block';
    
    saveHistory(item);
}

// মোডাল ক্লোজ করা
window.closeModal = () => {
    if (window.location.search.includes("view=")) {
        window.history.back();
    } else {
        const modal = document.getElementById('detailModal');
        if(modal) modal.style.display = 'none';
    }
}

// ব্রাউজারের ব্যাক বাটন হ্যান্ডেল করা
window.onpopstate = (event) => {
    const modal = document.getElementById('detailModal');
    if(modal) modal.style.display = 'none';
};

// ৫. কপি এবং শেয়ার
window.copyPrompt = () => {
    const pText = document.getElementById('modalPrompt');
    if(pText) {
        navigator.clipboard.writeText(pText.innerText);
        alert("Prompt Copied!");
    }
}
window.shareItem = async () => {
    if(!currentItem) return;
    const data = { title: currentItem.title, text: `Check this AI Art!\n${currentItem.title}\n${window.location.href}`, url: window.location.href };
    try { await navigator.share(data); } catch { alert("Link copied!"); navigator.clipboard.writeText(data.text); }
}

// **নোট:** কমেন্ট পোস্ট বাটন হ্যান্ডলার (আপাতত ডিজেবল করা হয়েছে কারণ URL লুকানো আছে)
const postBtn = document.getElementById('postComment');
if(postBtn) {
    postBtn.addEventListener('click', () => {
        alert("Posting comments is currently disabled for security updates.");
        // এখানে কমেন্ট পোস্ট করতে হলে আপনাকে আরেকটি Supabase Function বানাতে হবে।
    });
}

// ৬. সেটিংস ও নেভিগেশন
window.openThemeSelector = () => {
    const m = document.getElementById('themeModal');
    if(m) m.classList.add('active');
}
window.closeThemeSelector = () => {
    const m = document.getElementById('themeModal');
    if(m) m.classList.remove('active');
}
window.setTheme = t => { 
    document.body.className = t; 
    localStorage.setItem('theme', t); 
    closeThemeSelector(); 
}
document.body.className = localStorage.getItem('theme') || 'theme-gradient';

function saveHistory(item) {
    let hist = JSON.parse(localStorage.getItem('hist')) || [];
    hist = hist.filter(h => h.id !== item.id);
    hist.unshift(item);
    localStorage.setItem('hist', JSON.stringify(hist));
}

window.openHistoryPage = () => {
    if(window.showPage) window.showPage('historyPage');
    if(window.renderGrid) window.renderGrid(JSON.parse(localStorage.getItem('hist'))||[], 'historyGrid');
}
window.shareApp = () => { navigator.clipboard.writeText(window.location.href); alert("App Link Copied!"); }

window.switchTab = (id, el) => {
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const p = document.getElementById(id);
    if(p) p.classList.add('active');

    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    if(el) el.classList.add('active');
}
window.showPage = id => {
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    const p = document.getElementById(id);
    if(p) p.classList.add('active');
}

// সার্চ লজিক
const sInput = document.getElementById('searchInput');
const sBox = document.getElementById('suggestionsBox');
if(sInput && sBox) {
    sInput.addEventListener('input', function() {
        const val = this.value.toLowerCase();
        sBox.innerHTML = "";
        if(!val) { sBox.style.display='none'; window.renderGrid(allData, 'contentGrid'); return; }
        
        const filtered = allData.filter(d => d.title.toLowerCase().includes(val));
        if(filtered.length > 0) {
            sBox.style.display='block';
            filtered.slice(0,5).forEach(item => {
                const d = document.createElement('div');
                d.className='suggestion-item'; d.innerText=item.title;
                d.onclick = () => { sInput.value=item.title; window.renderGrid([item], 'contentGrid'); sBox.style.display='none'; };
                sBox.appendChild(d);
            });
        } else sBox.style.display='none';
        
        const home = document.getElementById('homePage');
        if(home && home.classList.contains('active')) window.renderGrid(filtered, 'contentGrid');
    });
}
document.onclick=(e)=>{ 
    if(sBox && !e.target.closest('.search-container')) sBox.style.display='none'; 
}
