<script type="module">
        
        // --- Supabase / API কনফিগারেশন ---
        const API_URL = "https://bnlxkclylntwrgrprakq.supabase.co/functions/v1/swift-endpoint";
        
        // আপনার যদি Supabase ANON KEY থাকে, তাহলে নিচের কোটেশনের ভেতরে বসান। না থাকলে ফাঁকা রাখুন।
        const SUPABASE_ANON_KEY = ""; 

        // --- মেইন লজিক ---
        let adminAvatar = "https://via.placeholder.com/36"; 
        
        let allData = [];
        let currentItem = null;
        
        // ১. ডাটা লোড ফাংশন
        async function loadData() {
            const container = document.getElementById('contentGrid');
            container.innerHTML = "<p style='text-align:center; color:yellow;'>Loading Data from Supabase...</p>";
            
            try {
                // হেডার সেট করা (প্রয়োজন হতে পারে)
                const headers = {
                    "Content-Type": "application/json"
                };
                if(SUPABASE_ANON_KEY) {
                    headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
                }

                // API কল করা
                const response = await fetch(API_URL, {
                    method: 'GET', // অথবা 'POST' হতে পারে, আপনার ফাংশন অনুযায়ী
                    headers: headers
                });

                if (!response.ok) {
                    throw new Error(`Server Error: ${response.status} ${response.statusText}`);
                }
                
                const data = await response.json();
                
                // ডাটা ফরম্যাট চেক এবং অ্যারেতে কনভার্ট করা
                allData = [];
                
                // যদি ডাটা সরাসরি অ্যারে হয়
                if (Array.isArray(data)) {
                    allData = data;
                } 
                // যদি ডাটা কোনো অবজেক্টের ভেতরে থাকে (যেমন: { prompts: [...] })
                else if (data && typeof data === 'object') {
                    // চেষ্টা ১: সরাসরি অবজেক্ট কি (Firebase style)
                    Object.keys(data).forEach(key => {
                        // চেক করছি ভেতরের ভ্যালুগুলো অবজেক্ট কিনা
                        if(typeof data[key] === 'object') {
                            allData.push({ id: key, ...data[key] });
                        }
                    });
                }

                if (allData.length === 0) {
                    container.innerHTML = "<p style='text-align:center'>No Data Found (Format might be wrong)</p>";
                    console.log("Received Data:", data); // কনসোলে ডাটা চেক করুন
                    return;
                }

                // রিভার্স অর্ডারে দেখানো
                allData.reverse();

                // গ্রিড রেন্ডার করা
                window.renderGrid(allData, 'contentGrid');
                const trending = allData.filter(d => d.rating && parseFloat(d.rating) >= 4.5);
                window.renderGrid(trending, 'trendingGrid');
                
                // URL চেক
                checkUrlAndOpenModal(allData);

            } catch (error) {
                console.error("Load Error:", error);
                // স্ক্রিনে এরর দেখানো
                container.innerHTML = `
                    <div style="text-align:center; padding:20px; color:red; border:1px solid red; margin:10px; border-radius:10px;">
                        <h3>⚠️ Error Loading Data</h3>
                        <p>${error.message}</p>
                        <p style="font-size:12px; color:#ccc;">(Check Console for details or CORS issues)</p>
                        <button onclick="location.reload()" style="padding:10px; margin-top:10px;">Retry</button>
                    </div>`;
            }
        }

        // স্ক্রিপ্ট লোড হওয়ার সাথে সাথে কল হবে
        loadData();


        // ** URL ফিক্সড ফাংশন **
        function checkUrlAndOpenModal(dataList) {
            const urlParams = new URLSearchParams(window.location.search);
            const viewSlug = urlParams.get('view');

            if (viewSlug) {
                const targetSlug = decodeURIComponent(viewSlug).trim().toLowerCase();
                const foundItem = dataList.find(item => {
                    if (!item.title) return false; 
                    const itemSlug = item.title.trim().replace(/\s+/g, '-').toLowerCase();
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
            
            if(!list || list.length === 0) {
                if(containerId === 'contentGrid') container.innerHTML = "<p style='text-align:center'>No Data Available</p>";
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
                            <div class="card-title">${item.title || 'Untitled'}</div>
                            <div class="card-subtitle">Rating: ${item.rating || 'N/A'} • ${timeStr}</div>
                        </div>
                    </div>
                `;
                container.appendChild(card);
            });
        };

        // ৪. টাইম Ago
        function timeAgo(ts) {
            if(!ts) return "Recently";
            const dateNum = typeof ts === 'number' ? ts : Date.parse(ts);
            if(isNaN(dateNum)) return "Recently";
            const sec = Math.floor((Date.now() - dateNum)/1000);
            if(sec>86400) return Math.floor(sec/86400) + " days ago";
            if(sec>3600) return Math.floor(sec/3600) + " hours ago";
            if(sec>60) return Math.floor(sec/60) + " mins ago";
            return "Just now";
        }

        // ৫. মোডাল
        window.openModal = (item, time, pushHistory = true) => {
            currentItem = item;
            document.getElementById('modalImg').src = item.imgLink;
            document.getElementById('modalTitle').innerText = item.title;
            document.getElementById('modalPrompt').innerText = item.prompt;
            document.getElementById('modalMeta').innerText = `Posted: ${time} • Rating: ${item.rating || 'N/A'}`;
            
            const slug = item.title ? item.title.trim().replace(/\s+/g, '-') : 'item';
            const newUrl = `?view=${encodeURIComponent(slug)}`;
            
            if(pushHistory) {
                window.history.pushState({modalOpen: true, itemId: item.id}, "", newUrl);
            }

            const cBox = document.getElementById('modalComments');
            cBox.innerHTML = "";
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

        window.closeModal = () => {
            if (window.location.search.includes("view=")) {
                window.history.back();
            } else {
                document.getElementById('detailModal').style.display = 'none';
            }
        }

        window.onpopstate = (event) => {
            document.getElementById('detailModal').style.display = 'none';
        };

        window.copyPrompt = () => {
            navigator.clipboard.writeText(document.getElementById('modalPrompt').innerText);
            alert("Copied!");
        }
        window.shareItem = async () => {
            if(!currentItem) return;
            const shareUrl = window.location.href;
            const data = { title: currentItem.title, text: `Check this AI Art!\n${currentItem.title}\n${shareUrl}`, url: shareUrl };
            try { await navigator.share(data); } catch { alert("Link copied!"); navigator.clipboard.writeText(data.text); }
        }
        
        document.getElementById('postComment').addEventListener('click', () => {
            alert("Posting comments needs backend setup.");
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
            const filtered = allData.filter(d => d.title && d.title.toLowerCase().includes(val));
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
    </script>
