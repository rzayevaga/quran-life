// js/app.js
(function() {
    if (typeof QURAN_DATA === 'undefined') {
        console.error('Quran data not loaded');
        return;
    }

    const state = {
        currentSurahIndex: 0,
        currentAyahIndex: 0,
        activeTab: 'quran',
        fullscreen: false,
        settings: {
            arabicFontSize: 36,
            transFontSize: 16,
            nightMode: false,
            effects3D: true,
            autoScroll: false,
            reminder: false,
            dailyAyah: false
        }
    };

    let deferredPrompt;
    let dailyAyahInterval;
    const elements = {};

    function cacheElements() {
        elements.appHeader = document.getElementById('appHeader');
        elements.bottomNav = document.getElementById('bottomNav');
        elements.surahSelector = document.getElementById('surahSelector');
        elements.surahSelect = document.getElementById('surahSelect');
        elements.quranDisplay = document.getElementById('quranDisplay');
        elements.ayahCard = document.getElementById('ayahCard');
        elements.ayahArabic = document.getElementById('ayahArabic');
        elements.ayahTransliteration = document.getElementById('ayahTransliteration');
        elements.ayahTranslation = document.getElementById('ayahTranslation');
        elements.ayahNumber = document.getElementById('ayahNumber');
        elements.surahNameDisplay = document.getElementById('surahNameDisplay');
        elements.ayahIndicator = document.getElementById('ayahIndicator');
        elements.prevAyah = document.getElementById('prevAyah');
        elements.nextAyah = document.getElementById('nextAyah');
        elements.currentSurah = document.getElementById('currentSurah');
        elements.currentAyah = document.getElementById('currentAyah');
        elements.currentJuz = document.getElementById('currentJuz');
        elements.searchContainer = document.getElementById('searchContainer');
        elements.searchInput = document.getElementById('searchInput');
        elements.searchClear = document.getElementById('searchClear');
        elements.searchResults = document.getElementById('searchResults');
        elements.favoritesContainer = document.getElementById('favoritesContainer');
        elements.favoritesList = document.getElementById('favoritesList');
        elements.settingsPanel = document.getElementById('settingsPanel');
        elements.toast = document.getElementById('toast');
        elements.navTabs = document.querySelectorAll('.nav-tab');
        elements.arabicFontSize = document.getElementById('arabicFontSize');
        elements.transFontSize = document.getElementById('transFontSize');
        elements.nightMode = document.getElementById('nightMode');
        elements.effects3D = document.getElementById('effects3D');
        elements.autoScroll = document.getElementById('autoScroll');
        elements.reminderToggle = document.getElementById('reminderToggle');
        elements.dailyAyahToggle = document.getElementById('dailyAyahToggle');
        elements.arabicSizeValue = document.getElementById('arabicSizeValue');
        elements.transSizeValue = document.getElementById('transSizeValue');
        elements.closeSettings = document.getElementById('closeSettings');
        elements.particles = document.getElementById('particles');
        elements.shareAyahBtn = document.getElementById('shareAyahBtn');
        elements.favoriteBtn = document.getElementById('favoriteBtn');
        elements.fullscreenBtn = document.getElementById('fullscreenBtn');
        elements.exitFullscreenBtn = document.getElementById('exitFullscreenBtn');
        elements.pwaInstallBanner = document.getElementById('pwaInstallBanner');
        elements.installPwaBtn = document.getElementById('installPwaBtn');
        elements.dismissBannerBtn = document.getElementById('dismissBannerBtn');
        elements.clockTime = document.getElementById('clockTime');
        elements.clockDate = document.getElementById('clockDate');
    }

    function getSurahData(index) {
        return QURAN_DATA.surahs[index];
    }

    function getAyahData(surahIndex, ayahIndex) {
        const surah = getSurahData(surahIndex);
        if (!surah || !surah.ayahs || ayahIndex >= surah.ayahs.length) return null;
        return surah.ayahs[ayahIndex];
    }

    function populateSurahSelect() {
        elements.surahSelect.innerHTML = '';
        QURAN_DATA.surahs.forEach((surah, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = `${surah.id}. ${surah.name_az} (${surah.name_ar}) - ${surah.ayah_count} ayə`;
            elements.surahSelect.appendChild(option);
        });
        elements.surahSelect.value = state.currentSurahIndex;
    }

    function updateDisplay() {
        const surah = getSurahData(state.currentSurahIndex);
        const ayah = getAyahData(state.currentSurahIndex, state.currentAyahIndex);
        if (!surah || !ayah) return;

        elements.ayahArabic.textContent = ayah.arabic;
        elements.ayahTransliteration.textContent = ayah.transliteration;
        elements.ayahTranslation.textContent = ayah.translation_az;
        elements.ayahNumber.textContent = ayah.number;
        elements.surahNameDisplay.textContent = surah.name_az;
        elements.ayahIndicator.textContent = `${state.currentAyahIndex + 1} / ${surah.ayah_count}`;
        elements.currentSurah.textContent = surah.id;
        elements.currentAyah.textContent = ayah.number;
        elements.currentJuz.textContent = surah.juz || Math.ceil(surah.id * 0.85);

        elements.prevAyah.disabled = state.currentAyahIndex === 0;
        elements.nextAyah.disabled = state.currentAyahIndex >= surah.ayah_count - 1;

        elements.surahSelect.value = state.currentSurahIndex;

        const favs = getFavorites();
        const isFav = favs.some(f => f.surahIndex === state.currentSurahIndex && f.ayahIndex === state.currentAyahIndex);
        elements.favoriteBtn.classList.toggle('active-fav', isFav);

        animateAyahCard();
    }

    function animateAyahCard() {
        if (state.settings.effects3D) {
            elements.ayahCard.style.transition = 'transform 0.35s cubic-bezier(0.25, 0.8, 0.25, 1.2), opacity 0.35s ease';
            elements.ayahCard.style.transform = 'translateX(30px)';
            elements.ayahCard.style.opacity = '0';
            requestAnimationFrame(() => {
                elements.ayahCard.style.transform = 'translateX(0)';
                elements.ayahCard.style.opacity = '1';
            });
        }
    }

    function getFavorites() {
        try {
            return JSON.parse(localStorage.getItem('quran-favorites') || '[]');
        } catch (e) { return []; }
    }

    function saveFavorites(favs) {
        localStorage.setItem('quran-favorites', JSON.stringify(favs));
    }

    function toggleFavorite() {
        const favs = getFavorites();
        const index = favs.findIndex(f => f.surahIndex === state.currentSurahIndex && f.ayahIndex === state.currentAyahIndex);
        if (index > -1) {
            favs.splice(index, 1);
            showToast('Sevimlilərdən çıxarıldı');
        } else {
            const surah = getSurahData(state.currentSurahIndex);
            const ayah = getAyahData(state.currentSurahIndex, state.currentAyahIndex);
            favs.push({ surahIndex: state.currentSurahIndex, ayahIndex: state.currentAyahIndex, surahName: surah.name_az, arabic: ayah.arabic.substring(0, 40) });
            showToast('Sevimlilərə əlavə edildi');
        }
        saveFavorites(favs);
        updateDisplay();
        if (state.activeTab === 'favorites') renderFavorites();
    }

    function renderFavorites() {
        const favs = getFavorites();
        elements.favoritesList.innerHTML = '';
        if (favs.length === 0) {
            elements.favoritesList.innerHTML = '<div style="padding:1.5rem;text-align:center;color:var(--text-muted);">Hələ sevimli yoxdur</div>';
            return;
        }
        favs.forEach((f, idx) => {
            const item = document.createElement('div');
            item.className = 'fav-item';
            item.innerHTML = `
                <div class="fav-item-info" data-surah="${f.surahIndex}" data-ayah="${f.ayahIndex}">
                    <span class="fav-item-arabic">${f.arabic}...</span>
                    <span class="fav-item-surah">${f.surahName} - ${f.ayahIndex + 1}. ayə</span>
                </div>
                <button class="fav-item-remove" data-idx="${idx}">✕</button>
            `;
            item.querySelector('.fav-item-info').addEventListener('click', function() {
                state.currentSurahIndex = f.surahIndex;
                state.currentAyahIndex = f.ayahIndex;
                updateDisplay();
                switchTab('quran');
            });
            item.querySelector('.fav-item-remove').addEventListener('click', function(e) {
                e.stopPropagation();
                const favs = getFavorites();
                favs.splice(idx, 1);
                saveFavorites(favs);
                renderFavorites();
                updateDisplay();
                showToast('Silindi');
            });
            elements.favoritesList.appendChild(item);
        });
    }

    function shareCurrentAyah() {
        const surah = getSurahData(state.currentSurahIndex);
        const ayah = getAyahData(state.currentSurahIndex, state.currentAyahIndex);
        if (!ayah) return;
        const text = `${surah.name_az} surəsi, ${ayah.number}. ayə:\n${ayah.arabic}\n${ayah.transliteration}\n${ayah.translation_az}\n\nQur'an Life [LM] vasitəsilə`;
        if (navigator.share) {
            navigator.share({ text }).catch(() => {});
        } else {
            navigator.clipboard.writeText(text).then(() => showToast('Ayə kopyalandı'));
        }
    }

    function changeSurah(index) {
        if (index < 0 || index >= QURAN_DATA.surahs.length) return;
        state.currentSurahIndex = index;
        state.currentAyahIndex = 0;
        updateDisplay();
        showToast(`${getSurahData(index).name_az} surəsi yükləndi`);
    }

    function changeAyah(delta) {
        const surah = getSurahData(state.currentSurahIndex);
        const newIndex = state.currentAyahIndex + delta;
        if (newIndex < 0) {
            if (state.currentSurahIndex > 0) {
                state.currentSurahIndex--;
                state.currentAyahIndex = getSurahData(state.currentSurahIndex).ayah_count - 1;
                updateDisplay();
            }
        } else if (newIndex >= surah.ayah_count) {
            if (state.currentSurahIndex < QURAN_DATA.surahs.length - 1) {
                state.currentSurahIndex++;
                state.currentAyahIndex = 0;
                updateDisplay();
            }
        } else {
            state.currentAyahIndex = newIndex;
            updateDisplay();
        }
    }

    function switchTab(tab) {
        state.activeTab = tab;
        elements.navTabs.forEach(t => t.classList.remove('active'));
        const activeTabEl = document.querySelector(`.nav-tab[data-tab="${tab}"]`);
        if (activeTabEl) activeTabEl.classList.add('active');

        elements.quranDisplay.style.display = tab === 'quran' ? 'flex' : 'none';
        elements.searchContainer.classList.toggle('active', tab === 'search');
        elements.favoritesContainer.classList.toggle('active', tab === 'favorites');
        elements.settingsPanel.classList.toggle('active', tab === 'settings');
        elements.surahSelector.style.display = (tab === 'quran' && !state.fullscreen) ? 'block' : 'none';

        if (tab === 'search') {
            setTimeout(() => elements.searchInput.focus(), 300);
        }
        if (tab === 'favorites') {
            renderFavorites();
        }
    }

    function performSearch(query) {
        elements.searchResults.innerHTML = '';
        if (!query || query.trim().length < 2) {
            elements.searchResults.classList.remove('active');
            return;
        }

        const directMatch = query.match(/^(\d+)\s*:\s*(\d+)$/);
        if (directMatch) {
            const surahId = parseInt(directMatch[1]);
            const ayahNum = parseInt(directMatch[2]);
            const surahIndex = QURAN_DATA.surahs.findIndex(s => s.id === surahId);
            if (surahIndex !== -1 && ayahNum > 0 && ayahNum <= QURAN_DATA.surahs[surahIndex].ayah_count) {
                state.currentSurahIndex = surahIndex;
                state.currentAyahIndex = ayahNum - 1;
                updateDisplay();
                switchTab('quran');
                elements.searchInput.value = '';
                elements.searchResults.classList.remove('active');
                elements.searchClear.style.display = 'none';
                showToast(`${surahId}:${ayahNum} ayəsinə keçid edildi`);
                return;
            } else {
                showToast('Keçərli surə:ayə daxil edin');
                return;
            }
        }

        const q = query.toLowerCase().trim();
        const results = [];

        QURAN_DATA.surahs.forEach((surah, sIdx) => {
            surah.ayahs.forEach((ayah, aIdx) => {
                let score = 0;
                if (ayah.translation_az.toLowerCase().includes(q)) score += 3;
                if (ayah.transliteration.toLowerCase().includes(q)) score += 2;
                if (ayah.arabic.includes(q)) score += 1;
                if (surah.name_az.toLowerCase().includes(q)) score += 5;
                if (surah.name_ar.includes(q)) score += 4;

                if (score > 0) {
                    results.push({ surahIndex: sIdx, ayahIndex: aIdx, score, surah, ayah });
                }
            });
        });

        results.sort((a, b) => b.score - a.score);
        const topResults = results.slice(0, 30);

        if (topResults.length === 0) {
            elements.searchResults.innerHTML = '<div style="padding:1.25rem;text-align:center;color:var(--text-muted);">Nəticə tapılmadı</div>';
        } else {
            topResults.forEach(r => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.innerHTML = `
                    <span class="search-result-surah">${r.surah.name_az} - ${r.ayah.number}. ayə</span>
                    <span class="search-result-arabic">${r.ayah.arabic}</span>
                    <span class="search-result-trans">${r.ayah.translation_az.substring(0, 80)}...</span>
                `;
                item.addEventListener('click', () => {
                    state.currentSurahIndex = r.surahIndex;
                    state.currentAyahIndex = r.ayahIndex;
                    updateDisplay();
                    switchTab('quran');
                    elements.searchInput.value = '';
                    elements.searchResults.classList.remove('active');
                    elements.searchClear.style.display = 'none';
                });
                elements.searchResults.appendChild(item);
            });
        }
        elements.searchResults.classList.add('active');
    }

    function showToast(message) {
        elements.toast.textContent = message;
        elements.toast.classList.add('show');
        clearTimeout(elements.toast._timeout);
        elements.toast._timeout = setTimeout(() => {
            elements.toast.classList.remove('show');
        }, 2000);
    }

    function createParticles() {
        const container = elements.particles;
        container.innerHTML = '';
        for (let i = 0; i < 25; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.width = (Math.random() * 4 + 2) + 'px';
            particle.style.height = particle.style.width;
            particle.style.animationDuration = (Math.random() * 8 + 5) + 's';
            particle.style.animationDelay = Math.random() * 8 + 's';
            container.appendChild(particle);
        }
    }

    function applySettings() {
        document.body.classList.toggle('night-mode', state.settings.nightMode);
        elements.ayahArabic.style.fontSize = state.settings.arabicFontSize + 'px';
        elements.ayahTranslation.style.fontSize = state.settings.transFontSize + 'px';
        elements.arabicSizeValue.textContent = state.settings.arabicFontSize + 'px';
        elements.transSizeValue.textContent = state.settings.transFontSize + 'px';
        elements.nightMode.checked = state.settings.nightMode;
        elements.effects3D.checked = state.settings.effects3D;
        elements.autoScroll.checked = state.settings.autoScroll;
        elements.reminderToggle.checked = state.settings.reminder;
        elements.dailyAyahToggle.checked = state.settings.dailyAyah;
        elements.arabicFontSize.value = state.settings.arabicFontSize;
        elements.transFontSize.value = state.settings.transFontSize;

        const metaTheme = document.querySelector('meta[name="theme-color"]');
        metaTheme.setAttribute('content', state.settings.nightMode ? '#050510' : '#1a0a00');

        handleDailyAyahSchedule();
    }

    function saveSettings() {
        try {
            localStorage.setItem('quran-life-settings', JSON.stringify(state.settings));
        } catch (e) {}
    }

    function loadSettings() {
        try {
            const saved = localStorage.getItem('quran-life-settings');
            if (saved) {
                Object.assign(state.settings, JSON.parse(saved));
            }
        } catch (e) {}
    }

    function autoSetNightMode() {
        const hour = new Date().getHours();
        const shouldBeNight = hour >= 18 || hour < 6;
        if (state.settings.nightMode !== shouldBeNight) {
            state.settings.nightMode = shouldBeNight;
            applySettings();
            saveSettings();
        }
    }

    let reminderInterval;
    function handleReminderToggle() {
        const perm = Notification.permission;
        if (perm === 'granted') {
            state.settings.reminder = !state.settings.reminder;
            elements.reminderToggle.checked = state.settings.reminder;
            saveSettings();
            if (state.settings.reminder) {
                startReminders();
            } else {
                stopReminders();
            }
        } else if (perm === 'default') {
            Notification.requestPermission().then(p => {
                if (p === 'granted') {
                    state.settings.reminder = true;
                    elements.reminderToggle.checked = true;
                    saveSettings();
                    startReminders();
                } else {
                    state.settings.reminder = false;
                    elements.reminderToggle.checked = false;
                    saveSettings();
                    showToast('Bildiriş icazəsi verilmədi');
                }
            });
        } else {
            state.settings.reminder = false;
            elements.reminderToggle.checked = false;
            saveSettings();
            showToast('Bildirişlər bloklanıb. Brauzer ayarlarından icazə verin.');
        }
    }

    function startReminders() {
        stopReminders();
        reminderInterval = setInterval(() => {
            const hour = new Date().getHours();
            if (hour === 6 || hour === 18) {
                sendNotification('Quran oxumağı unutma', 'Allahın kəlamı ilə ürəyini nurlandır.');
            }
        }, 60000);
        showToast('Xatırlatma aktiv edildi');
    }

    function stopReminders() {
        if (reminderInterval) clearInterval(reminderInterval);
    }

    function getRandomAyah() {
        const randomSurahIndex = Math.floor(Math.random() * QURAN_DATA.surahs.length);
        const surah = QURAN_DATA.surahs[randomSurahIndex];
        const randomAyahIndex = Math.floor(Math.random() * surah.ayahs.length);
        return {
            surahName: surah.name_az,
            number: surah.ayahs[randomAyahIndex].number,
            arabic: surah.ayahs[randomAyahIndex].arabic.substring(0, 60),
            translation: surah.ayahs[randomAyahIndex].translation_az
        };
    }

    function sendNotification(title, body) {
        if (Notification.permission === 'granted') {
            new Notification(title, { body, icon: 'icons/icon-192.png' });
        }
    }

    function handleDailyAyahToggle() {
        const perm = Notification.permission;
        if (perm === 'granted') {
            state.settings.dailyAyah = !state.settings.dailyAyah;
            elements.dailyAyahToggle.checked = state.settings.dailyAyah;
            saveSettings();
            handleDailyAyahSchedule();
        } else if (perm === 'default') {
            Notification.requestPermission().then(p => {
                if (p === 'granted') {
                    state.settings.dailyAyah = true;
                    elements.dailyAyahToggle.checked = true;
                    saveSettings();
                    handleDailyAyahSchedule();
                } else {
                    state.settings.dailyAyah = false;
                    elements.dailyAyahToggle.checked = false;
                    saveSettings();
                    showToast('İcazə verilmədi');
                }
            });
        } else {
            state.settings.dailyAyah = false;
            elements.dailyAyahToggle.checked = false;
            saveSettings();
            showToast('Bildirişlər bloklanıb');
        }
    }

    function handleDailyAyahSchedule() {
        if (state.settings.dailyAyah && Notification.permission === 'granted') {
            if (dailyAyahInterval) clearInterval(dailyAyahInterval);
            dailyAyahInterval = setInterval(() => {
                const hour = new Date().getHours();
                if (hour === 6 || hour === 12 || hour === 18) {
                    const ayah = getRandomAyah();
                    sendNotification(`📖 ${ayah.surahName} ${ayah.number}: ${ayah.arabic}`, ayah.translation.substring(0, 100));
                }
            }, 60000);
            showToast('Gündəlik ayə aktiv');
        } else {
            if (dailyAyahInterval) clearInterval(dailyAyahInterval);
        }
    }

    function toggleFullscreen() {
        state.fullscreen = !state.fullscreen;
        document.body.classList.toggle('fullscreen-mode', state.fullscreen);
        if (state.fullscreen) {
            elements.exitFullscreenBtn.style.display = 'flex';
            elements.surahSelector.style.display = 'none';
        } else {
            elements.exitFullscreenBtn.style.display = 'none';
            elements.surahSelector.style.display = 'block';
        }
    }

    function updateClock() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString('az-AZ', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateStr = now.toLocaleDateString('az-AZ', options);
        elements.clockTime.textContent = timeStr;
        elements.clockDate.textContent = dateStr;
    }

    function listenForSWUpdates() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'UPDATE_AVAILABLE') {
                    showUpdateBanner();
                }
            });
        }
    }

    function showUpdateBanner() {
        const existing = document.getElementById('updateBanner');
        if (existing) existing.remove();

        const banner = document.createElement('div');
        banner.id = 'updateBanner';
        banner.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:#ff7b2c;color:#fff;padding:12px 20px;border-radius:30px;z-index:999;box-shadow:0 8px 30px rgba(0,0,0,0.5);display:flex;gap:12px;align-items:center;font-size:14px;font-family:Inter,sans-serif;';
        banner.innerHTML = '<span>Yeni versiya mövcuddur</span><button id="updateAppBtn" style="padding:6px 16px;border-radius:15px;border:none;background:#fff;color:#ff7b2c;font-weight:700;cursor:pointer;">Yenilə</button>';
        document.body.appendChild(banner);
        document.getElementById('updateAppBtn').addEventListener('click', () => {
            if (navigator.serviceWorker) {
                navigator.serviceWorker.getRegistration().then(reg => {
                    reg && reg.waiting && reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                });
            }
            window.location.reload();
        });
    }

    function handlePwaInstall() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if (!localStorage.getItem('pwa-banner-dismissed')) {
                elements.pwaInstallBanner.classList.add('show');
            }
        });
        elements.installPwaBtn.addEventListener('click', () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then(() => elements.pwaInstallBanner.classList.remove('show'));
            }
        });
        elements.dismissBannerBtn.addEventListener('click', () => {
            elements.pwaInstallBanner.classList.remove('show');
            localStorage.setItem('pwa-banner-dismissed', '1');
        });
    }

    function bindEvents() {
        elements.surahSelect.addEventListener('change', function() { changeSurah(parseInt(this.value)); });
        elements.prevAyah.addEventListener('click', () => changeAyah(-1));
        elements.nextAyah.addEventListener('click', () => changeAyah(1));
        elements.shareAyahBtn.addEventListener('click', shareCurrentAyah);
        elements.favoriteBtn.addEventListener('click', toggleFavorite);
        elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
        elements.exitFullscreenBtn.addEventListener('click', toggleFullscreen);

        elements.navTabs.forEach(tab => {
            tab.addEventListener('click', function() { switchTab(this.dataset.tab); });
        });

        elements.searchInput.addEventListener('input', function() {
            const val = this.value;
            elements.searchClear.style.display = val ? 'flex' : 'none';
            performSearch(val);
        });
        elements.searchClear.addEventListener('click', () => {
            elements.searchInput.value = '';
            elements.searchClear.style.display = 'none';
            elements.searchResults.classList.remove('active');
            elements.searchResults.innerHTML = '';
        });
        elements.searchInput.addEventListener('focus', function() {
            if (this.value.trim().length >= 2) performSearch(this.value);
        });
        document.addEventListener('click', function(e) {
            if (!elements.searchContainer.contains(e.target) && e.target !== elements.searchInput) {
                elements.searchResults.classList.remove('active');
            }
        });

        elements.arabicFontSize.addEventListener('input', function() { state.settings.arabicFontSize = parseInt(this.value); applySettings(); saveSettings(); });
        elements.transFontSize.addEventListener('input', function() { state.settings.transFontSize = parseInt(this.value); applySettings(); saveSettings(); });
        elements.nightMode.addEventListener('change', function() { state.settings.nightMode = this.checked; applySettings(); saveSettings(); });
        elements.effects3D.addEventListener('change', function() { state.settings.effects3D = this.checked; saveSettings(); });
        elements.autoScroll.addEventListener('change', function() { state.settings.autoScroll = this.checked; saveSettings(); });
        elements.reminderToggle.addEventListener('click', function(e) { e.preventDefault(); handleReminderToggle(); });
        elements.dailyAyahToggle.addEventListener('click', function(e) { e.preventDefault(); handleDailyAyahToggle(); });
        elements.closeSettings.addEventListener('click', () => switchTab('quran'));

        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight' && state.activeTab === 'quran') { e.preventDefault(); changeAyah(-1); }
            else if (e.key === 'ArrowLeft' && state.activeTab === 'quran') { e.preventDefault(); changeAyah(1); }
        });

        let touchStartX = 0;
        elements.ayahCard.addEventListener('touchstart', function(e) { touchStartX = e.touches[0].clientX; }, { passive: true });
        elements.ayahCard.addEventListener('touchend', function(e) {
            const dx = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(dx) > 50 && state.activeTab === 'quran') {
                dx > 0 ? changeAyah(-1) : changeAyah(1);
            }
        });
    }

    function initServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js').catch(() => {});
            });
        }
    }

    function init() {
        cacheElements();
        loadSettings();
        populateSurahSelect();
        autoSetNightMode();
        applySettings();
        updateDisplay();
        createParticles();
        bindEvents();
        switchTab('quran');
        handlePwaInstall();
        initServiceWorker();
        listenForSWUpdates();
        setInterval(autoSetNightMode, 60000);
        setInterval(updateClock, 1000);
        updateClock();

        if (state.settings.reminder && Notification.permission === 'granted') startReminders();
        if (state.settings.dailyAyah && Notification.permission === 'granted') handleDailyAyahSchedule();
    }

    document.addEventListener('DOMContentLoaded', init);
})();
