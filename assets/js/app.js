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
        badgeCount: 0,
        qiblaDegree: 0,
        userLocation: null,
        calendarDate: new Date(),
        settings: {
            arabicFontSize: 36,
            transFontSize: 16,
            nightMode: false,
            effects3D: true,
            autoScroll: false,
            reminder: false,
            dailyAyah: false,
            city: 'Baku',
            azanFile: 'default.mp3',
            prayerNotify: false,
            method: '2',
            realtimeCompass: true,
            hourlyAyah: true
        }
    };

    let deferredPrompt;
    let dailyAyahInterval;
    let prayerInterval;
    let prayerTimesCache = null;
    let mapInstance = null;
    let userMarker = null;
    let uploadedAzanUrl = null;

    const AZAN_OPTIONS = [
        { file: 'https://www.aladhan.com/audio/azan/1/azan1.mp3', name: 'Məkkə (1)' },
        { file: 'https://www.aladhan.com/audio/azan/1/azan2.mp3', name: 'Məkkə (2)' },
        { file: 'https://www.aladhan.com/audio/azan/1/azan3.mp3', name: 'Mədinə' },
        { file: 'default.mp3', name: 'Yerli (default)' }
    ];

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
        elements.searchFilter = document.getElementById('searchFilter');
        elements.searchResults = document.getElementById('searchResults');
        elements.favoritesContainer = document.getElementById('favoritesContainer');
        elements.favoritesList = document.getElementById('favoritesList');
        elements.settingsPanel = document.getElementById('settingsPanel');
        elements.aboutPanel = document.getElementById('aboutPanel');
        elements.qiblaPanel = document.getElementById('qiblaPanel');
        elements.calendarPanel = document.getElementById('calendarPanel');
        elements.toast = document.getElementById('toast');
        elements.navTabs = document.querySelectorAll('.nav-tab');
        elements.arabicFontSize = document.getElementById('arabicFontSize');
        elements.transFontSize = document.getElementById('transFontSize');
        elements.nightMode = document.getElementById('nightMode');
        elements.effects3D = document.getElementById('effects3D');
        elements.autoScroll = document.getElementById('autoScroll');
        elements.reminderToggle = document.getElementById('reminderToggle');
        elements.dailyAyahToggle = document.getElementById('dailyAyahToggle');
        elements.cityInput = document.getElementById('cityInput');
        elements.methodSelect = document.getElementById('methodSelect');
        elements.azanSelect = document.getElementById('azanSelect');
        elements.azanUpload = document.getElementById('azanUpload');
        elements.prayerNotifyToggle = document.getElementById('prayerNotifyToggle');
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
        elements.nextPrayer = document.getElementById('nextPrayer');
        elements.qiblaCompass = document.getElementById('qiblaCompass');
        elements.qiblaArrow = document.getElementById('qiblaArrow');
        elements.qiblaDegree = document.getElementById('qiblaDegree');
        elements.qiblaMap = document.getElementById('qiblaMap');
        elements.qiblaManualBtn = document.getElementById('qiblaManualBtn');
        elements.shareAppBtn = document.getElementById('shareAppBtn');
        elements.calGrid = document.getElementById('calendarGrid');
        elements.calMonthYear = document.getElementById('calMonthYear');
        elements.calPrev = document.getElementById('calPrev');
        elements.calNext = document.getElementById('calNext');
        elements.prayerTimesDaily = document.getElementById('prayerTimesDaily');
        elements.permissionBtn = document.getElementById('permissionBtn');
        elements.disableBatteryOptBtn = document.getElementById('disableBatteryOptBtn');
        elements.scrollTopBtn = document.getElementById('scrollTopBtn');
        elements.scrollBottomBtn = document.getElementById('scrollBottomBtn');
        elements.notificationPanel = document.getElementById('notificationPanel');
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
            favs.push({
                surahIndex: state.currentSurahIndex,
                ayahIndex: state.currentAyahIndex,
                surahName: surah.name_az,
                arabic: ayah.arabic.substring(0, 40)
            });
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
        elements.aboutPanel.classList.toggle('active', tab === 'about');
        elements.qiblaPanel.classList.toggle('active', tab === 'qibla');
        elements.calendarPanel.classList.toggle('active', tab === 'calendar');
        elements.surahSelector.style.display = (tab === 'quran' && !state.fullscreen) ? 'block' : 'none';

        if (tab === 'search') {
            setTimeout(() => elements.searchInput.focus(), 300);
        }
        if (tab === 'favorites') {
            renderFavorites();
        }
        if (tab === 'qibla') {
            initQibla();
        }
        if (tab === 'calendar') {
            renderCalendar();
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
        const filter = elements.searchFilter ? elements.searchFilter.value : "all";
        const results = [];

        QURAN_DATA.surahs.forEach((surah, sIdx) => {
            surah.ayahs.forEach((ayah, aIdx) => {
                let score = 0;
                if (filter === "all" || filter === "ayah") {
                if (ayah.translation_az.toLowerCase().includes(q)) score += 3;
                if (ayah.transliteration.toLowerCase().includes(q)) score += 2;
                if (ayah.arabic.includes(q)) score += 1;
                }
                if ((filter === "all" || filter === "surah") && surah.name_az.toLowerCase().includes(q)) score += 5;
                if ((filter === "all" || filter === "surah") && surah.name_ar.includes(q)) score += 4;
                if ((filter === "all" || filter === "juz") && String(surah.juz || Math.ceil(surah.id * 0.85)) === q) score += 6;
                
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
        elements.cityInput.value = state.settings.city;
        elements.methodSelect.value = state.settings.method;
        elements.prayerNotifyToggle.checked = state.settings.prayerNotify;
        elements.arabicFontSize.value = state.settings.arabicFontSize;
        elements.transFontSize.value = state.settings.transFontSize;

        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (state.settings.nightMode) {
            metaTheme.setAttribute('content', '#050510');
        } else {
            metaTheme.setAttribute('content', '#1a0a00');
        }

        handleDailyAyahSchedule();
        schedulePrayerMonitoring();
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
            if (elements.notificationPanel) {
                const n = document.createElement('div');
                n.className = 'notif-item';
                n.textContent = `${new Date().toLocaleTimeString('az-AZ')} — ${title}: ${body}`;
                elements.notificationPanel.prepend(n);
            }
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
                    showToast('Bildiriş icazəsi verilmədi');
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
        updateNextPrayer();
    }

    function updateNextPrayer() {
        if (!prayerTimesCache) {
            elements.nextPrayer.textContent = '';
            return;
        }
        const now = new Date();
        const cur = now.getHours() * 60 + now.getMinutes();
        const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        let next = null, nextTime = null;
        for (const p of prayers) {
            const t = prayerTimesCache.timings[p];
            if (!t) continue;
            const [h, m] = t.split(':').map(Number);
            const mins = h * 60 + m;
            if (mins > cur) {
                next = p;
                nextTime = mins;
                break;
            }
        }
        if (!next) {
            elements.nextPrayer.textContent = 'Sabah Fajr';
            return;
        }
        const h = Math.floor(nextTime / 60), m = nextTime % 60;
        elements.nextPrayer.textContent = `${next}: ${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    async function fetchPrayerTimes(city, method) {
        try {
            const today = new Date().toLocaleDateString('en-CA');
            const cached = JSON.parse(localStorage.getItem('prayerTimesCache') || '{}');
            if (cached.date === today && cached.city === city && cached.method === method) {
                prayerTimesCache = cached;
                return;
            }
            const resp = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=Azerbaijan&method=${method}`);
            if (!resp.ok) throw new Error('Şəbəkə xətası');
            const data = await resp.json();
            prayerTimesCache = { city, method, date: today, timings: data.data.timings };
            localStorage.setItem('prayerTimesCache', JSON.stringify(prayerTimesCache));
        } catch (e) {
            const cached = JSON.parse(localStorage.getItem('prayerTimesCache') || '{}');
            if (cached.timings) {
                prayerTimesCache = cached;
                showToast('İnternet yoxdur, son yüklənmiş vaxtlar');
            } else {
                showToast('Namaz vaxtları alınmadı');
            }
        }
    }

    function schedulePrayerMonitoring() {
        if (prayerInterval) clearInterval(prayerInterval);
        if (!state.settings.prayerNotify) return;
        prayerInterval = setInterval(async () => {
            if (!prayerTimesCache) return;
            const now = new Date();
            const cur = now.getHours() * 60 + now.getMinutes();
            const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
            for (const p of prayers) {
                const t = prayerTimesCache.timings[p];
                if (!t) continue;
                const [h, m] = t.split(':').map(Number);
                const mins = h * 60 + m;
                if (mins - cur === 5) {
                    sendNotification(`Namaz vaxtı: ${p}`, `5 dəqiqə sonra ${p} namazıdır.`);
                    if (state.settings.prayerNotify) updateBadge(1);
                }
                if (mins === cur) {
                    if (document.visibilityState === 'visible') playAzan();
                    sendNotification(`Namaz vaxtı: ${p}`, `${p} namazının vaxtıdır.`);
                    if (state.settings.prayerNotify) updateBadge(1);
                }
            }
        }, 60000);
    }

    function playAzan() {
        try {
            const src = uploadedAzanUrl || state.settings.azanFile;
            const audio = new Audio(src);
            audio.play().catch(() => {});
        } catch (e) {}
    }

    async function updateBadge(count) {
        if (navigator.setAppBadge) {
            try {
                state.badgeCount += count;
                await navigator.setAppBadge(state.badgeCount);
            } catch (e) {}
        }
    }

    async function clearBadge() {
        if (navigator.clearAppBadge) {
            try {
                await navigator.clearAppBadge();
                state.badgeCount = 0;
            } catch (e) {}
        }
    }

    window.addEventListener('focus', () => clearBadge());

    function initQibla() {
        if (!navigator.geolocation) {
            showToast('GPS yoxdur');
            return;
        }
        navigator.geolocation.getCurrentPosition(pos => {
            state.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            const qibla = calculateQibla(state.userLocation.lat, state.userLocation.lng);
            state.qiblaDegree = qibla;
            elements.qiblaDegree.textContent = `${qibla.toFixed(1)}° (Kəbə istiqaməti)`;
            elements.qiblaArrow.style.transform = `translateX(-50%) rotate(${qibla}deg)`;
            if (window.DeviceOrientationEvent) {
                window.addEventListener('deviceorientation', handleOrientation);
            }
            if (!mapInstance) {
                mapInstance = L.map('qiblaMap').setView([state.userLocation.lat, state.userLocation.lng], 13);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);
            }
            if (userMarker) mapInstance.removeLayer(userMarker);
            userMarker = L.marker([state.userLocation.lat, state.userLocation.lng]).addTo(mapInstance);
            const kaaba = [21.4225, 39.8262];
            L.circleMarker(kaaba, { color: 'gold', radius: 6 }).addTo(mapInstance);
            L.polyline([[state.userLocation.lat, state.userLocation.lng], kaaba], { color: '#ff7b2c', weight: 2 }).addTo(mapInstance);
            mapInstance.setView([state.userLocation.lat, state.userLocation.lng], 13);
        }, () => showToast('Yer icazəsi verilmədi'));
    }

    function calculateQibla(lat, lng) {
        const kaabaLat = 21.4225, kaabaLng = 39.8262;
        const dLng = (kaabaLng - lng) * Math.PI / 180;
        const y = Math.sin(dLng) * Math.cos(kaabaLat * Math.PI / 180);
        const x = Math.cos(lat * Math.PI / 180) * Math.sin(kaabaLat * Math.PI / 180) - Math.sin(lat * Math.PI / 180) * Math.cos(kaabaLat * Math.PI / 180) * Math.cos(dLng);
        return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
    }

    function handleOrientation(e) {
        const compass = e.webkitCompassHeading ?? (e.alpha != null ? 360 - e.alpha : null);
        if (compass == null) return;
        const rotation = (state.qiblaDegree - compass + 360) % 360;
        elements.qiblaArrow.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
    }

    function renderCalendar() {
        const year = state.calendarDate.getFullYear(), month = state.calendarDate.getMonth();
        elements.calMonthYear.textContent = new Date(year, month).toLocaleDateString('az-AZ', { month: 'long', year: 'numeric' });
        const firstDay = new Date(year, month, 1).getDay(), daysInMonth = new Date(year, month + 1, 0).getDate();
        let html = '<div class="day-header">B.e</div><div class="day-header">Ç.a</div><div class="day-header">Ç</div><div class="day-header">C.a</div><div class="day-header">C</div><div class="day-header">Ş</div><div class="day-header">Ş</div>';
        for (let i = 0; i < (firstDay + 6) % 7; i++) html += '<div></div>';
        for (let d = 1; d <= daysInMonth; d++) {
            const date = new Date(year, month, d), isToday = date.toDateString() === new Date().toDateString();
            html += `<div class="day-cell${isToday ? ' today' : ''}">${d}</div>`;
        }
        elements.calGrid.innerHTML = html;
        if (prayerTimesCache) {
            const timings = prayerTimesCache.timings;
            elements.prayerTimesDaily.innerHTML = `
                <div class="prayer-row"><span>Fəcr</span><span>${timings.Fajr}</span></div>
                <div class="prayer-row"><span>Zöhr</span><span>${timings.Dhuhr}</span></div>
                <div class="prayer-row"><span>Əsr</span><span>${timings.Asr}</span></div>
                <div class="prayer-row"><span>Məğrib</span><span>${timings.Maghrib}</span></div>
                <div class="prayer-row"><span>İşa</span><span>${timings.Isha}</span></div>`;
        }
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
                deferredPrompt.userChoice.then(() => {
                    elements.pwaInstallBanner.classList.remove('show');
                });
            }
        });

        elements.dismissBannerBtn.addEventListener('click', () => {
            elements.pwaInstallBanner.classList.remove('show');
            localStorage.setItem('pwa-banner-dismissed', '1');
        });
    }

    function initAzanSelect() {
        elements.azanSelect.innerHTML = '';
        AZAN_OPTIONS.forEach(o => {
            const opt = document.createElement('option');
            opt.value = o.file;
            opt.textContent = o.name;
            elements.azanSelect.appendChild(opt);
        });
        if (uploadedAzanUrl) {
            const opt = document.createElement('option');
            opt.value = uploadedAzanUrl;
            opt.textContent = 'Yüklənmiş azan';
            opt.selected = true;
            elements.azanSelect.appendChild(opt);
        }
        elements.azanSelect.value = uploadedAzanUrl || state.settings.azanFile;
    }

    function bindEvents() {
        elements.surahSelect.addEventListener('change', function() {
            changeSurah(parseInt(this.value));
        });

        elements.prevAyah.addEventListener('click', () => changeAyah(-1));
        elements.nextAyah.addEventListener('click', () => changeAyah(1));

        elements.shareAyahBtn.addEventListener('click', shareCurrentAyah);
        elements.favoriteBtn.addEventListener('click', toggleFavorite);
        elements.fullscreenBtn.addEventListener('click', toggleFullscreen);
        elements.exitFullscreenBtn.addEventListener('click', toggleFullscreen);

        elements.navTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                switchTab(this.dataset.tab);
            });
        });

        elements.searchInput.addEventListener('input', function() {
            const val = this.value;
            elements.searchClear.style.display = val ? 'flex' : 'none';
            performSearch(val);
        });

        elements.searchClear.addEventListener('click', function() {
            elements.searchInput.value = '';
            elements.searchClear.style.display = 'none';
            elements.searchResults.classList.remove('active');
            elements.searchResults.innerHTML = '';
        });

        elements.searchFilter?.addEventListener('change', function(){ performSearch(elements.searchInput.value); });

        elements.searchInput.addEventListener('focus', function() {
            if (this.value.trim().length >= 2) {
                performSearch(this.value);
            }
        });

        document.addEventListener('click', function(e) {
            if (!elements.searchContainer.contains(e.target) && e.target !== elements.searchInput) {
                elements.searchResults.classList.remove('active');
            }
        });

        elements.arabicFontSize.addEventListener('input', function() {
            state.settings.arabicFontSize = parseInt(this.value);
            applySettings();
            saveSettings();
        });

        elements.transFontSize.addEventListener('input', function() {
            state.settings.transFontSize = parseInt(this.value);
            applySettings();
            saveSettings();
        });

        elements.nightMode.addEventListener('change', function() {
            state.settings.nightMode = this.checked;
            applySettings();
            saveSettings();
            showToast(this.checked ? 'Gecə modu aktiv' : 'Gecə modu deaktiv');
        });

        elements.effects3D.addEventListener('change', function() {
            state.settings.effects3D = this.checked;
            saveSettings();
            showToast(this.checked ? '3D effektlər aktiv' : '3D effektlər deaktiv');
        });

        elements.autoScroll.addEventListener('change', function() {
            state.settings.autoScroll = this.checked;
            saveSettings();
        });

        elements.reminderToggle.addEventListener('click', function(e) {
            e.preventDefault();
            handleReminderToggle();
        });

        elements.dailyAyahToggle.addEventListener('click', function(e) {
            e.preventDefault();
            handleDailyAyahToggle();
        });

        elements.cityInput.addEventListener('change', function() {
            state.settings.city = this.value;
            saveSettings();
            fetchPrayerTimes(state.settings.city, state.settings.method);
            schedulePrayerMonitoring();
        });

        elements.methodSelect.addEventListener('change', function() {
            state.settings.method = this.value;
            saveSettings();
            fetchPrayerTimes(state.settings.city, state.settings.method);
            schedulePrayerMonitoring();
        });

        elements.azanSelect.addEventListener('change', function() {
            state.settings.azanFile = this.value;
            uploadedAzanUrl = null;
            saveSettings();
        });

        elements.azanUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                uploadedAzanUrl = URL.createObjectURL(file);
                initAzanSelect();
            }
        });

        elements.prayerNotifyToggle.addEventListener('change', function() {
            state.settings.prayerNotify = this.checked;
            saveSettings();
            schedulePrayerMonitoring();
        });

        elements.closeSettings.addEventListener('click', function() {
            switchTab('quran');
        });

        elements.shareAppBtn.addEventListener('click', function() {
            const text = 'Quran Life [LM] - Quran oxu, tərcümə, namaz təqvimi, qiblə tapıcı: ' + window.location.href;
            if (navigator.share) {
                navigator.share({ title: 'Quran Life', text, url: window.location.href }).catch(() => {});
            } else {
                navigator.clipboard.writeText(text).then(() => showToast('Link kopyalandı'));
            }
        });

        elements.qiblaManualBtn.addEventListener('click', function() {
            const lat = prompt('Lat:');
            const lng = prompt('Lng:');
            if (lat && lng) {
                state.userLocation = { lat: parseFloat(lat), lng: parseFloat(lng) };
                initQibla();
            }
        });

        elements.calPrev.addEventListener('click', function() {
            state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
            renderCalendar();
        });

        elements.permissionBtn?.addEventListener('click', checkAndRequestPermissions);
        elements.disableBatteryOptBtn?.addEventListener('click', () => alert('Android: Settings > Battery > Unrestricted. iOS: Low Power Mode söndürün.'));
        elements.scrollTopBtn?.addEventListener('click', () => window.scrollTo({top:0,behavior:'smooth'}));
        elements.scrollBottomBtn?.addEventListener('click', () => window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'}));

        elements.calNext.addEventListener('click', function() {
            state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
            renderCalendar();
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowRight' && state.activeTab === 'quran') {
                e.preventDefault();
                changeAyah(-1);
            } else if (e.key === 'ArrowLeft' && state.activeTab === 'quran') {
                e.preventDefault();
                changeAyah(1);
            }
        });

        let touchStartX = 0;
        elements.ayahCard.addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
        }, { passive: true });

        elements.ayahCard.addEventListener('touchend', function(e) {
            const dx = e.changedTouches[0].clientX - touchStartX;
            if (Math.abs(dx) > 50 && state.activeTab === 'quran') {
                if (dx > 0) changeAyah(-1);
                else changeAyah(1);
            }
        });

        let wheelTimeout;
        elements.quranDisplay.addEventListener('wheel', function(e) {
            if (state.activeTab !== 'quran') return;
            clearTimeout(wheelTimeout);
            wheelTimeout = setTimeout(() => {
                if (e.deltaY > 30) changeAyah(1);
                else if (e.deltaY < -30) changeAyah(-1);
            }, 80);
        }, { passive: true });

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('quran-life-settings')) {
                state.settings.nightMode = e.matches;
                applySettings();
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

    

    async function checkAndRequestPermissions() {
        const msgs = [];
        if (Notification.permission !== 'granted') {
            const p = await Notification.requestPermission();
            msgs.push(`Bildiriş: ${p}`);
        }
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(() => msgs.push('Məkan: ok'), () => msgs.push('Məkan: rədd edildi'));
        }
        showToast(msgs.join(' | ') || 'İcazələr yoxlandı');
    }

    function startHourlyAyahNotifications() {
        setInterval(() => {
            if (Notification.permission === 'granted') {
                const a = getRandomAyah();
                sendNotification(`Saatlıq ayə — ${a.surahName} ${a.number}`, a.translation.substring(0,120));
            }
        }, 3600000);
    }

    function init() {
        cacheElements();
        loadSettings();
        populateSurahSelect();
        initAzanSelect();
        autoSetNightMode();
        applySettings();
        updateDisplay();
        createParticles();
        bindEvents();
        switchTab('quran');
        handlePwaInstall();
        initServiceWorker();
        setInterval(autoSetNightMode, 60000);
        setInterval(updateClock, 1000);
        updateClock();

        fetchPrayerTimes(state.settings.city, state.settings.method).then(() => { schedulePrayerMonitoring(); updateNextPrayer(); });
        checkAndRequestPermissions();
        startHourlyAyahNotifications();

        if (state.settings.reminder && Notification.permission === 'granted') {
            startReminders();
        }
        if (state.settings.dailyAyah && Notification.permission === 'granted') {
            handleDailyAyahSchedule();
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();