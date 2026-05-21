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
        settings: {
            arabicFontSize: 36,
            transFontSize: 16,
            nightMode: false,
            effects3D: true,
            autoScroll: false,
            reminder: false
        }
    };

    let deferredPrompt;
    const elements = {};

    function cacheElements() {
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
        elements.settingsPanel = document.getElementById('settingsPanel');
        elements.toast = document.getElementById('toast');
        elements.navTabs = document.querySelectorAll('.nav-tab');
        elements.arabicFontSize = document.getElementById('arabicFontSize');
        elements.transFontSize = document.getElementById('transFontSize');
        elements.nightMode = document.getElementById('nightMode');
        elements.effects3D = document.getElementById('effects3D');
        elements.autoScroll = document.getElementById('autoScroll');
        elements.reminderToggle = document.getElementById('reminderToggle');
        elements.arabicSizeValue = document.getElementById('arabicSizeValue');
        elements.transSizeValue = document.getElementById('transSizeValue');
        elements.closeSettings = document.getElementById('closeSettings');
        elements.particles = document.getElementById('particles');
        elements.shareAyahBtn = document.getElementById('shareAyahBtn');
        elements.pwaInstallBanner = document.getElementById('pwaInstallBanner');
        elements.installPwaBtn = document.getElementById('installPwaBtn');
        elements.dismissBannerBtn = document.getElementById('dismissBannerBtn');
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

        if (elements.ayahCard && state.settings.effects3D) {
            elements.ayahCard.classList.remove('card-flip');
            void elements.ayahCard.offsetWidth;
            elements.ayahCard.classList.add('card-flip');
        }
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
        elements.settingsPanel.classList.toggle('active', tab === 'settings');
        document.querySelector('.surah-selector').style.display = tab === 'quran' ? 'block' : 'none';

        if (tab === 'search') {
            setTimeout(() => elements.searchInput.focus(), 300);
        }
    }

    function performSearch(query) {
        elements.searchResults.innerHTML = '';
        if (!query || query.trim().length < 2) {
            elements.searchResults.classList.remove('active');
            return;
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
            elements.searchResults.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">Nəticə tapılmadı</div>';
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
        elements.arabicFontSize.value = state.settings.arabicFontSize;
        elements.transFontSize.value = state.settings.transFontSize;

        const metaTheme = document.querySelector('meta[name="theme-color"]');
        if (state.settings.nightMode) {
            metaTheme.setAttribute('content', '#050510');
        } else {
            metaTheme.setAttribute('content', '#1a0a00');
        }

        if (state.settings.reminder) {
            scheduleReminders();
        } else {
            cancelReminders();
        }
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
    function scheduleReminders() {
        cancelReminders();
        reminderInterval = setInterval(() => {
            const hour = new Date().getHours();
            if (hour === 6 || hour === 18) {
                if (Notification.permission === 'granted') {
                    new Notification('Quran oxumağı unutma', {
                        body: 'Allahın kəlamı ilə ürəyini nurlandır.',
                        icon: 'icons/icon-192.png'
                    });
                } else if (Notification.permission === 'default') {
                    Notification.requestPermission();
                }
            }
        }, 60000);
    }

    function cancelReminders() {
        if (reminderInterval) clearInterval(reminderInterval);
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
        banner.style.cssText = `
            position: fixed; bottom: 100px; left: 50%; transform: translateX(-50%);
            background: #ff7b2c; color: #fff; padding: 12px 20px;
            border-radius: 30px; z-index: 999; box-shadow: 0 8px 30px rgba(0,0,0,0.5);
            display: flex; gap: 12px; align-items: center; font-size: 14px;
            animation: slideUp 0.4s ease-out; font-family: 'Inter', sans-serif;
        `;
        banner.innerHTML = `
            <span>Yeni versiya mövcuddur</span>
            <button id="updateAppBtn" style="padding:6px 16px; border-radius:15px; border:none; background:#fff; color:#ff7b2c; font-weight:700; cursor:pointer;">Yenilə</button>
        `;
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

    function bindEvents() {
        elements.surahSelect.addEventListener('change', function() {
            changeSurah(parseInt(this.value));
        });

        elements.prevAyah.addEventListener('click', () => changeAyah(-1));
        elements.nextAyah.addEventListener('click', () => changeAyah(1));

        elements.shareAyahBtn.addEventListener('click', shareCurrentAyah);

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

        elements.reminderToggle.addEventListener('change', function() {
            state.settings.reminder = this.checked;
            applySettings();
            saveSettings();
            showToast(this.checked ? 'Xatırlatma aktiv' : 'Xatırlatma deaktiv');
        });

        elements.closeSettings.addEventListener('click', function() {
            switchTab('quran');
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
                navigator.serviceWorker.register('/sw.js').catch(() => {});
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
    }

    document.addEventListener('DOMContentLoaded', init);
})();
