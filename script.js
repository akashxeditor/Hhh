// --- Supabase / API কনফিগারেশন ---
const API_URL = "https://bnlxkclylntwrgrprakq.supabase.co/functions/v1/swift-endpoint";

// --- ভেরিয়েবল ---
let adminAvatar = "https://via.placeholder.com/36"; 
let allData = [];
let currentItem = null;

// ১. ডাটা লোড ফাংশন (Firebase এর বদলে fetch ব্যবহার করা হয়েছে)
async function loadData() {
    const container = document.getElementById('contentGrid');
    
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("Failed to load data");
        
        const data = await response.json();
        
        // ডাটা ফরম্যাট হ্যান্ডলিং (যদি অবজেক্ট বা অ্যারে হয়)
        allData = [];
        if (Array.isArray(data)) {
            allData = data;
        } else if (data && typeof data === 'object') {
            Object.keys(data).forEach(key => allData.push({ id: key, ...data[key] }));
        }

        // রিভার্স অর্ডারে দেখানো (নতুন আগে)
        allData.reverse();

        // গ্রিড রেন্ডার করা
        window.renderGrid(allData, 'contentGrid');
        
        // ট্রেন্ডিং সেকশন
        const trending = allData.filter(d => parseFloat(d.rating) >= 4.5);
        window.renderGrid(trending, 'trendingGrid');
        
        // --- পেজ লোডের পরে URL চেক করা ---
        checkUrlAndOpenModal(allData);
        // ---------------------------------

    } catch (error) {
        console.error("Error loading data:", error);
        container.innerHTML = "<p style='text-align:center; color:red;'>Failed to load content.</p>";
    }
}

// ফাংশনটি কল করুন
loadData();


// ২. URL চেক করে মোডাল ওপেন করা (স্ল্যাগ ফিক্স সহ)
function checkUrlAndOpenModal(dataList) {
    const urlParams = new URLSearchParams(window.location.search);
    const viewSlug = urlParams.get('view');

    if (viewSlug) {
        // ১. URL এর ভ্যালু ডিকোড করা এবং লোয়ারকেস করা
        const targetSlug = decodeURIComponent(viewSlug).trim().toLowerCase();
        
        // ২. লিস্ট থেকে সঠিক আইটেমটি খোঁজা
        const foundItem = dataList.find(item => {
            // ডাটাবেসের টাইটেল থেকে স্ল্যাগ তৈরি করছি
            const itemSlug = item.title.trim().replace(/\s+/g, '-').toLowerCase();
            // মিলিয়ে দেখা
            return itemSlug === targetSlug;
        });

        if (foundItem) {
            const timeStr = timeAgo(foundItem.timestamp);
            window.openModal(foundItem, timeStr, false); 
        }
    }
}

// ৩. গ্রিড রেন্ডারার
window.renderGrid = (list, containerId) => {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    
    if(list.length === 0) {
        container.innerHTML = "<p style='text-align:center'>No Data Found</p>";
        return;
    }

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

// ৪. টাইম Ago ফাংশন
function timeAgo(ts) {
    if(!ts) return "Recently";
    // যদি timestamp স্ট্রিং হয়, নাম্বারে কনভার্ট করুন
    const dateNum = typeof ts === 'number' ? ts : Date.parse(ts);
    if(isNaN(dateNum)) return "Recently";

    const sec = Math.floor((Date.now() - dateNum)/1000);
    if(sec > 86400) return Math.floor(sec/86400) + " days ago";
    if(sec > 3600) return Math.floor(sec/3600) + " hours ago";
    if(sec > 60) return Math.floor(sec/60) + " mins ago";
    return "Just now";
}

// ৫. মোডাল এবং URL হ্যান্ডলিং
window.openModal = (item, time, pushHistory = true) => {
    currentItem = item;
    document.getElementById('modalImg').src = item.imgLink;
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalPrompt').innerText = item.prompt;
    document.getElementById('modalMeta').innerText = `Posted: ${time} • Rating: ${item.rating || 'N/A'}`;
    
    // URL তৈরি করা (স্পেস সরিয়ে ড্যাশ বসানো)
    const slug = item.title.trim().replace(/\s+/g, '-');
    const newUrl = `?view=${encodeURIComponent(slug)}`;
    
    if (pushHistory) {
        window.history.pushState({modalOpen: true, itemId: item.id}, "", newUrl);
    }

    const cBox = document.getElementById('modalComments');
    cBox.innerHTML = "";
    
    // কমেন্টস হ্যান্ডলিং (Supabase বা API থেকে কমেন্ট আসলে অ্যারে হিসেবে আসতে পারে)
    const comments = item.comments ? (Array.isArray(item.comments) ? item.comments : Object.values(item.comments)) : [];
    
    if(comments.length > 0) {
        comments.forEach(c => {
            cBox.innerHTML += `<div style="border-bottom:1px dashed var(--border-color); padding:5px 0; margin-bottom:5px;">
                <span style="color:var(--accent-color); font-weight:bold;">Visitor:</span> ${c.text || c}
            </div>`;
        });
    } else {
        cBox.innerHTML = "<p>No comments.</p>";
    }

    document.getElementById('detailModal').style.display = 'block';
    saveHistory(item);
}

// মোডাল ক্লোজ করা
window.closeModal = () => {
    if (window.location.search.includes("view=")) {
        window.history.back();
    } else {
        document.getElementById('detailModal').style.display = 'none';
    }
}

// ব্রাউজারের ব্যাক বাটন হ্যান্ডেল করা
window.onpopstate = (event) => {
    document.getElementById('detailModal').style.display = 'none';
};

// ৬. কপি এবং শেয়ার
window.copyPrompt = () => {
    navigator.clipboard.writeText(document.getElementById('modalPrompt').innerText);
    alert("Copied!");
}

window.shareItem = async () => {
    if(!currentItem) return;
    const shareUrl = window.location.href; // বর্তমান URL (যেটাতে ?view=Title আছে)
    const data = { 
        title: currentItem.title, 
        text: `Check this AI Art!\n${currentItem.title}\n${shareUrl}`, 
        url: shareUrl 
    };
    try { 
        await navigator.share(data); 
    } catch { 
        alert("Link copied!"); 
        navigator.clipboard.writeText(data.text); 
    }
}

// কমেন্ট পোস্ট (API ছাড়া স্ট্যাটিক কাজ করবে না, তাই অ্যালার্ট দেওয়া হলো)
document.getElementById('postComment').addEventListener('click', () => {
    alert("Comment posting requires backend integration update.");
    // এখানে আপনার Supabase POST লজিক বসাতে হবে যদি প্রয়োজন হয়
});

// ৭. সেটিংস ও নেভিগেশন
window.openThemeSelector = () => document.getElementById('themeModal').classList.add('active');
window.closeThemeSelector = () => document.getElementById('themeModal').classList.remove('active');
window.setTheme = t => { document.body.className = t; localStorage.setItem('theme', t); closeThemeSelector(); }
document.body.className = localStorage.getItem('theme') || 'theme-gradient';

function saveHistory(item) {
    let hist = JSON.parse(localStorage.getItem('hist')) || [];
    hist = hist.filter(h => h.id !== item.id);
    hist.unshift(item);
    localStorage.setItem('hist', JSON.stringify(hist));
}

window.openHistoryPage = () => {
    window.showPage('historyPage');
    window.renderGrid(JSON.parse(localStorage.getItem('hist'))||[], 'historyGrid');
}

window.shareApp = () => { navigator.clipboard.writeText(window.location.href); alert("App Link Copied!"); }

window.switchTab = (id, el) => {
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    el.classList.add('active');
}

window.showPage = id => {
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

// সার্চ লজিক
const sInput = document.getElementById('searchInput');
const sBox = document.getElementById('suggestionsBox');
sInput.addEventListener('input', function() {
    const val = this.value.toLowerCase();
    sBox.innerHTML = "";
    if(!val) { sBox.style.display='none'; window.renderGrid(allData, 'contentGrid'); return; }
    
    const filtered = allData.filter(d => d.title && d.title.toLowerCase().includes(val));
    
    if(filtered.length > 0) {
        sBox.style.display='block';
        filtered.slice(0,5).forEach(item => {
            const d = document.createElement('div');
            d.className='suggestion-item'; d.innerText=item.title;
            d.onclick = () => { sInput.value=item.title; window.renderGrid([item], 'contentGrid'); sBox.style.display='none'; };
            sBox.appendChild(d);
        });
    } else {
        sBox.style.display='none';
    }
    
    if(document.getElementById('homePage').classList.contains('active')) window.renderGrid(filtered, 'contentGrid');
});

document.onclick=(e)=>{ if(!e.target.closest('.search-container')) sBox.style.display='none'; }
