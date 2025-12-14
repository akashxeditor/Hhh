<script type="module">
        
        // --- Supabase / API কনফিগারেশন ---
        const API_URL = "https://bnlxkclylntwrgrprakq.supabase.co/functions/v1/swift-endpoint";

        // --- মেইন লজিক ---
        let adminAvatar = "https://via.placeholder.com/36"; 
        
        let allData = [];
        let currentItem = null;
        
        // ১. ডাটা লোড ফাংশন (Fetch ব্যবহার করে)
        async function loadData() {
            const container = document.getElementById('contentGrid');
            
            try {
                // API কল করা
                const response = await fetch(API_URL);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                const data = await response.json();
                
                allData = [];
                // ডাটা ফরম্যাট হ্যান্ডলিং (যদি অবজেক্ট বা অ্যারে হয়)
                if (Array.isArray(data)) {
                    allData = data;
                } else if (data && typeof data === 'object') {
                    Object.keys(data).forEach(key => allData.push({ id: key, ...data[key] }));
                }

                // রিভার্স অর্ডারে দেখানো
                allData.reverse();

                // গ্রিড রেন্ডার করা
                window.renderGrid(allData, 'contentGrid');
                const trending = allData.filter(d => parseFloat(d.rating) >= 4.5);
                window.renderGrid(trending, 'trendingGrid');
                
                // --- ফিক্স: পেজ লোড হলে URL চেক করা ---
                checkUrlAndOpenModal(allData);

            } catch (error) {
                console.error("Error loading data from API:", error);
                container.innerHTML = "<p style='text-align:center; color:red;'>Failed to load content. Check API URL.</p>";
            }
        }

        // স্ক্রিপ্ট লোড হওয়ার সাথে সাথে ডাটা লোড শুরু করা
        loadData();


        // ** ফিক্সড ফাংশন: URL চেক করে সঠিক ইমেজ ওপেন করা **
        function checkUrlAndOpenModal(dataList) {
            const urlParams = new URLSearchParams(window.location.search);
            const viewSlug = urlParams.get('view');

            if (viewSlug) {
                // URL এর স্ল্যাগ ডিকোড ও ছোট হাতের করা
                const targetSlug = decodeURIComponent(viewSlug).trim().toLowerCase();
                
                // ডাটাবেস থেকে টাইটেল মিলিয়ে দেখা
                const foundItem = dataList.find(item => {
                    if (!item.title) return false; 
                    // টাইটেল থেকে স্ল্যাগ তৈরি (ঠিক যেমন openModal তৈরি করে)
                    const itemSlug = item.title.trim().replace(/\s+/g, '-').toLowerCase();
                    return itemSlug === targetSlug;
                });

                if (foundItem) {
                    const timeStr = timeAgo(foundItem.timestamp);
                    // মোডাল ওপেন (হিস্ট্রি পুশ ছাড়া)
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
                // ইউজার ক্লিকের জন্য pushHistory=true
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
            // API থেকে টাইমস্ট্যাম্প স্ট্রিং হিসেবে আসতে পারে
            const dateNum = typeof ts === 'number' ? ts : Date.parse(ts);
            if(isNaN(dateNum)) return "Recently";
            
            const sec = Math.floor((Date.now() - dateNum)/1000);
            if(sec>86400) return Math.floor(sec/86400) + " days ago";
            if(sec>3600) return Math.floor(sec/3600) + " hours ago";
            if(sec>60) return Math.floor(sec/60) + " mins ago";
            return "Just now";
        }

        // ৫. মোডাল এবং URL হ্যান্ডলিং (আপডেট করা হয়েছে)
        window.openModal = (item, time, pushHistory = true) => {
            currentItem = item;
            document.getElementById('modalImg').src = item.imgLink;
            document.getElementById('modalTitle').innerText = item.title;
            document.getElementById('modalPrompt').innerText = item.prompt;
            document.getElementById('modalMeta').innerText = `Posted: ${time} • Rating: ${item.rating || 'N/A'}`;
            
            // URL তৈরি (স্পেস সরিয়ে ড্যাশ)
            const slug = item.title.trim().replace(/\s+/g, '-');
            const newUrl = `?view=${encodeURIComponent(slug)}`;
            
            // হিস্ট্রিতে পুশ করা (যদি ইউজার ক্লিক করে থাকে)
            if(pushHistory) {
                window.history.pushState({modalOpen: true, itemId: item.id}, "", newUrl);
            }

            const cBox = document.getElementById('modalComments');
            cBox.innerHTML = "";
            
            // কমেন্টস হ্যান্ডলিং
            const comments = item.comments ? (Array.isArray(item.comments) ? item.comments : Object.values(item.comments)) : [];
            
            if(comments.length > 0) {
                comments.forEach(c => {
                    const commentText = c.text || c;
                    cBox.innerHTML += `<div style="border-bottom:1px dashed var(--border-color); padding:5px 0; margin-bottom:5px;">
                        <span style="color:var(--accent-color); font-weight:bold;">Visitor:</span> ${commentText}
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

        // ৬. কপি এবং শেয়ার
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
        
        // কমেন্ট পোস্ট (বর্তমানে শুধু অ্যালার্ট দেবে)
        document.getElementById('postComment').addEventListener('click', () => {
            alert("Comment posting is currently disabled as it requires a specific API endpoint for posting.");
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
