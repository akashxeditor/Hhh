// --- Supabase কনফিগারেশন ---
// আপনার তৈরি করা নতুন ফাংশনের লিংক
const API_URL = "https://bnlxkclylntwrgrprakq.supabase.co/functions/v1/swift-endpoint";


// --- মেইন লজিক ---
let adminAvatar = "https://via.placeholder.com/36"; 

let allData = [];
let currentItem = null;

// ১. ডাটাবেস থেকে অবতার চেক করা
const settingsRef = ref(db, 'settings/adminAvatar');
onValue(settingsRef, (snap) => {
    const url = snap.val();
    if(url) {
        adminAvatar = url;
        document.querySelectorAll('.channel-icon').forEach(img => {
            img.src = adminAvatar;
        });
    }
});

// ২. কার্ড ডাটা লোড ও URL হ্যান্ডলিং
onValue(ref(db, 'prompts/'), (snapshot) => {
    const data = snapshot.val();
    allData = [];
    if (data) {
        Object.keys(data).forEach(key => allData.push({ id: key, ...data[key] }));
        allData.reverse();
        window.renderGrid(allData, 'contentGrid');
        window.renderGrid(allData.filter(d => parseFloat(d.rating) >= 4.5), 'trendingGrid');
        
        // --- পেজ লোডের পরে URL চেক করা ---
        checkUrlAndOpenModal(allData);
        // ---------------------------------

    } else {
        document.getElementById('contentGrid').innerHTML = "<p style='text-align:center'>No Data</p>";
    }
});

// **নতুন ফাংশন:** URL চেক করে মোডাল ওপেন করা
function checkUrlAndOpenModal(dataList) {
    const urlParams = new URLSearchParams(window.location.search);
    const viewSlug = urlParams.get('view');

    if (viewSlug) {
        // Slug থেকে আসল টাইটেল ফরমেটে নিয়ে আসা
        const titleToFind = decodeURIComponent(viewSlug).replace(/-/g, ' ').trim().toLowerCase();
        
        // টাইটেল অনুযায়ী ডাটা খুঁজে বের করা
        const foundItem = dataList.find(item => item.title.toLowerCase() === titleToFind);

        if (foundItem) {
            const timeStr = timeAgo(foundItem.timestamp);
            // মোডাল ওপেন করা
            window.openModal(foundItem, timeStr, false); // false মানে হিস্ট্রি push দরকার নেই
        }
    }
}


// ৩. গ্রিড রেন্ডারার
window.renderGrid = (list, containerId) => {
    const container = document.getElementById(containerId);
    container.innerHTML = "";
    list.forEach(item => {
        const timeStr = timeAgo(item.timestamp);
        const card = document.createElement('div');
        card.className = 'card';
        card.onclick = () => window.openModal(item, timeStr, true); // true মানে ইউজার ক্লিক করেছে
        card.innerHTML = `
            <div class="thumbnail-container">
                <img src="${item.imgLink}" class="card-img" onerror="this.src='https://via.placeholder.com/480x270'">
            </div>
            <div class="card-meta">
                <img src="${adminAvatar}" class="channel-icon">
                <div class="text-info">
                    <div class="card-title">${item.title}</div>
                    <div class="card-subtitle">Rating: ${item.rating} • ${timeStr}</div>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
};

// ৪. টাইম Ago ফাংশন
function timeAgo(ts) {
    if(!ts) return "Recently";
    const sec = Math.floor((Date.now()-ts)/1000);
    if(sec>86400) return Math.floor(sec/86400) + " days ago";
    if(sec>3600) return Math.floor(sec/3600) + " hours ago";
    if(sec>60) return Math.floor(sec/60) + " mins ago";
    return "Just now";
}

// ৫. মোডাল এবং URL হ্যান্ডলিং
window.openModal = (item, time, pushHistory = true) => {
    currentItem = item;
    document.getElementById('modalImg').src = item.imgLink;
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalPrompt').innerText = item.prompt;
    document.getElementById('modalMeta').innerText = `Posted: ${time} • Rating: ${item.rating}`;
    
    // URL তৈরি করা
    const slug = item.title.trim().replace(/\s+/g, '-');
    const newUrl = `?view=${encodeURIComponent(slug)}`;
    
    if (pushHistory) {
        window.history.pushState({modalOpen: true, itemId: item.id}, "", newUrl);
    }

    const cBox = document.getElementById('modalComments');
    cBox.innerHTML = "";
    if(item.comments) {
        Object.values(item.comments).forEach(c => {
            cBox.innerHTML += `<div style="border-bottom:1px dashed var(--border-color); padding:5px 0; margin-bottom:5px;">
                <span style="color:var(--accent-color); font-weight:bold;">Visitor:</span> ${c.text}
            </div>`;
        });
    } else cBox.innerHTML = "<p>No comments.</p>";

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
    const data = { title: currentItem.title, text: `Check this AI Art!\n${currentItem.title}\n${window.location.href}`, url: window.location.href };
    try { await navigator.share(data); } catch { alert("Link copied!"); navigator.clipboard.writeText(data.text); }
}
document.getElementById('postComment').addEventListener('click', () => {
    const txt = document.getElementById('commentInput').value;
    if(currentItem && txt) {
        push(ref(db, `prompts/${currentItem.id}/comments`), { text: txt, timestamp: serverTimestamp() });
        document.getElementById('commentInput').value = "";
    }
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

const sInput = document.getElementById('searchInput');
const sBox = document.getElementById('suggestionsBox');
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
    if(document.getElementById('homePage').classList.contains('active')) window.renderGrid(filtered, 'contentGrid');
});
document.onclick=(e)=>{ if(!e.target.closest('.search-container')) sBox.style.display='none'; }
        
            
    
