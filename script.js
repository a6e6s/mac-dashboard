/**
 * macOS Style Admin Dashboard
 *
 * This script handles all the interactive functionality of the dashboard,
 * including window management, drag-and-drop, animations, and responsive
 * layout switching between desktop and mobile views.
 */
document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element Selection ---
    const desktop = document.getElementById('desktop');
    const windowsContainer = document.getElementById('windows-container');
    const dock = document.getElementById('dock');
    const mobileHomeScreen = document.getElementById('mobile-home-screen');
    const clock = document.getElementById('clock');
    const themeSwitcher = document.getElementById('theme-switcher');
    const fullscreenToggle = document.getElementById('fullscreen-toggle');
    const activeAppMenu = document.getElementById('active-app-menu');
    const notificationIcon = document.getElementById('notification-icon');
    const notificationDrawer = document.getElementById('notification-drawer');
    const notificationDrawerContent = document.getElementById('notification-drawer-content');
    const profileIcon = document.getElementById('profile-icon');
    const profileMenu = document.getElementById('profile-menu');

    // --- State Variables ---
    let highestZIndex = 10;
    let openWindows = {};
    let activeWindow = null;
    let initialMouseX, initialMouseY, initialWindowX, initialWindowY, initialWidth, initialHeight;
    let isDragging = false;
    let isResizing = false;
    let dragTarget = null;
    let resizeTarget = null;
    let isMobile = false;
    
    // --- App & Notification Definitions ---
    const apps = [
        { id: 'dashboard', name: 'Dashboard', icon: '🏠', contentUrl: 'content/dashboard.html', content: null },
        { id: 'users', name: 'Users', icon: '👥', contentUrl: 'content/users.html', content: null },
        { id: 'settings', name: 'Settings', icon: '⚙️', contentUrl: 'content/settings.html', content: null },
        { id: 'reports', name: 'Reports', icon: '📊', contentUrl: 'content/reports.html', content: null }
    ];

    const notifications = [
        { icon: '🚀', text: 'New version deployed successfully.', time: '5m ago' },
        { icon: '⚠️', text: 'Server CPU usage is at 92%.', time: '1h ago' },
        { icon: '👥', text: 'A new user "David" has registered.', time: '3h ago' },
        { icon: '📊', text: 'Your weekly report is ready.', time: '1d ago' },
    ];

    /**
     * Initializes the dashboard, sets up event listeners, and renders initial UI.
     */
    function init() {
        checkViewport();
        renderDock();
        renderMobileHomeScreen();
        renderNotifications();
        updateClock();
        setInterval(updateClock, 1000); // Update clock every second
        themeSwitcher.addEventListener('click', toggleTheme);
        fullscreenToggle.addEventListener('click', toggleFullScreen);
        notificationIcon.addEventListener('click', toggleNotificationDrawer);
        profileIcon.addEventListener('click', toggleProfileMenu);
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        window.addEventListener('resize', checkViewport);
        document.addEventListener('click', handleGlobalClick);
        
        if (!isMobile) {
            openApp('dashboard');
        }
    }

    /**
     * Checks the viewport width and toggles the mobile class on the body.
     */
    function checkViewport() {
        isMobile = window.innerWidth < 768;
        document.body.classList.toggle('is-mobile', isMobile);
        
        if (isMobile) {
            Object.keys(openWindows).forEach(closeApp);
            mobileHomeScreen.style.display = 'grid';
        } else {
            mobileHomeScreen.style.display = 'none';
            if (Object.keys(openWindows).length === 0) {
                openApp('dashboard');
            }
        }
    }

    /**
     * Updates the clock in the menu bar with the current time.
     */
    function updateClock() {
        const now = new Date();
        const options = { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        clock.textContent = now.toLocaleDateString('en-US', options).replace(',', '');
    }

    /**
     * Toggles between light and dark themes.
     */
    function toggleTheme() {
        document.documentElement.classList.toggle('dark');
    }

    /**
     * Toggles the browser's fullscreen mode.
     */
    function toggleFullScreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    }

    // --- UI Rendering ---

    /**
     * Renders the application icons in the dock.
     */
    function renderDock() {
        dock.innerHTML = '';
        apps.forEach(app => {
            const dockItem = document.createElement('div');
            dockItem.className = 'dock-item w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl cursor-pointer relative';
            dockItem.dataset.appId = app.id;
            dockItem.innerHTML = `
                ${app.icon}
                <div class="app-name-tooltip text-sm bg-gray-800 text-white px-2 py-1 rounded-md">${app.name}</div>
                <div class="active-dot bg-cyan-400 hidden"></div>
            `;
            dockItem.addEventListener('click', () => handleDockClick(app.id));
            dock.appendChild(dockItem);
        });
    }

    /**
     * Renders the application icons on the mobile home screen.
     */
    function renderMobileHomeScreen() {
        mobileHomeScreen.innerHTML = '';
        apps.forEach(app => {
            const mobileIcon = document.createElement('div');
            mobileIcon.className = 'flex flex-col items-center justify-center space-y-2 cursor-pointer';
            mobileIcon.dataset.appId = app.id;
            mobileIcon.innerHTML = `
                <div class="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-4xl">${app.icon}</div>
                <span class="text-white text-sm font-medium">${app.name}</span>
            `;
            mobileIcon.addEventListener('click', () => openApp(app.id));
            mobileHomeScreen.appendChild(mobileIcon);
        });
    }

    /**
     * Renders the list of notifications in the notification drawer.
     */
    function renderNotifications() {
        notificationDrawerContent.innerHTML = notifications.map(n => `
            <div class="flex items-start p-4 border-b border-white/10 hover:bg-white/5">
                <div class="text-xl mr-4">${n.icon}</div>
                <div>
                    <p class="text-sm">${n.text}</p>
                    <p class="text-xs text-gray-400 mt-1">${n.time}</p>
                </div>
            </div>
        `).join('');
    }
    
    /**
     * Handles clicks on dock items to open, focus, or minimize apps.
     * @param {string} appId - The ID of the app to handle.
     */
    function handleDockClick(appId) {
        const windowEl = openWindows[appId];
        if (windowEl) {
            if (windowEl === activeWindow && windowEl.style.display !== 'none') {
                minimizeWindow(windowEl);
            } else {
                if (windowEl.style.display === 'none') {
                    restoreWindow(windowEl);
                }
                focusWindow(windowEl);
            }
        } else {
            openApp(appId);
        }
    }

    /**
     * Updates the active indicator dots in the dock.
     */
    function updateDockIndicators() {
        document.querySelectorAll('.dock-item').forEach(item => {
            const appId = item.dataset.appId;
            const dot = item.querySelector('.active-dot');
            if (openWindows[appId]) {
                dot.classList.remove('hidden');
            } else {
                dot.classList.add('hidden');
            }
        });
    }

    // --- Window Management ---

    /**
     * Creates and opens a new application window, loading its content via AJAX.
     * @param {string} appId - The ID of the app to open.
     */
    function openApp(appId) {
        if (openWindows[appId]) {
            focusWindow(openWindows[appId]);
            return;
        }

        const app = apps.find(a => a.id === appId);
        if (!app) return;

        const windowEl = document.createElement('div');
        windowEl.id = `window-${app.id}`;
        windowEl.className = 'app-window bg-gray-200/70 dark:bg-gray-800/70 backdrop-blur-xl border border-white/20 rounded-lg flex flex-col';
        
        if (!isMobile) {
            windowEl.classList.add('absolute');
            windowEl.style.left = `${Math.random() * 200 + 50}px`;
            windowEl.style.top = `${Math.random() * 100 + 50}px`;
            windowEl.style.width = '500px';
            windowEl.style.height = '350px';
        } else {
            mobileHomeScreen.style.display = 'none';
        }
        
        windowEl.innerHTML = `
            <div class="title-bar flex items-center justify-between px-3 text-gray-800 dark:text-gray-200">
                <div class="flex items-center space-x-2">
                    <button class="close-btn w-3 h-3 bg-red-500 rounded-full"></button>
                    <button class="min-btn w-3 h-3 bg-yellow-500 rounded-full"></button>
                    <button class="max-btn w-3 h-3 bg-green-500 rounded-full"></button>
                </div>
                <span class="font-medium text-sm">${app.name}</span>
                <div></div>
            </div>
            <div class="window-content flex-grow p-4 overflow-auto text-gray-900 dark:text-gray-100">
                <!-- Content will be loaded here -->
            </div>
            <div class="resizer text-gray-400 dark:text-gray-600">
                <svg width="12" height="12" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 1L1 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                    <path d="M9 5L5 9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
            </div>
        `;

        windowsContainer.appendChild(windowEl);
        openWindows[appId] = windowEl;

        const contentArea = windowEl.querySelector('.window-content');
        contentArea.innerHTML = '<div class="flex items-center justify-center h-full"><p>Loading...</p></div>';

        if (app.content) {
            contentArea.innerHTML = app.content;
        } else {
            fetch(app.contentUrl)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.text();
                })
                .then(html => {
                    app.content = html;
                    contentArea.innerHTML = html;
                })
                .catch(error => {
                    console.error("Error fetching content for " + app.name + ":", error);
                    contentArea.innerHTML = `<div class="p-4 text-red-500">Error loading content.</div>`;
                });
        }

        windowEl.querySelector('.close-btn').addEventListener('click', (e) => { e.stopPropagation(); closeApp(appId); });
        windowEl.querySelector('.min-btn').addEventListener('click', (e) => { e.stopPropagation(); minimizeWindow(windowEl); });
        windowEl.querySelector('.max-btn').addEventListener('click', (e) => { e.stopPropagation(); toggleMaximizeWindow(windowEl); });
        windowEl.querySelector('.title-bar').addEventListener('dblclick', () => toggleMaximizeWindow(windowEl));
        
        focusWindow(windowEl);
        updateDockIndicators();
    }

    /**
     * Closes an application window.
     * @param {string} appId - The ID of the app to close.
     */
    function closeApp(appId) {
        const windowEl = openWindows[appId];
        if (windowEl) {
            if (activeWindow === windowEl) {
                activeWindow = null;
                activeAppMenu.textContent = 'Finder';
            }
            windowEl.remove();
            delete openWindows[appId];
            updateDockIndicators();

            if (isMobile) {
                mobileHomeScreen.style.display = 'grid';
            }
        }
    }
    
    /**
     * Minimizes a window with a "genie" animation towards the dock.
     * @param {HTMLElement} windowEl - The window element to minimize.
     */
    function minimizeWindow(windowEl) {
        if (!windowEl || windowEl.style.display === 'none' || isMobile) return;

        const appId = windowEl.id.replace('window-', '');
        const dockItem = document.querySelector(`.dock-item[data-app-id="${appId}"]`);
        if (!dockItem) return;

        const windowRect = windowEl.getBoundingClientRect();
        const dockRect = dockItem.getBoundingClientRect();
        const deltaX = dockRect.left - windowRect.left + (dockRect.width / 2) - (windowRect.width / 2);
        const deltaY = dockRect.top - windowRect.top + (dockRect.height / 2) - (windowRect.height / 2);
        
        windowEl.style.transition = 'transform 0.4s cubic-bezier(0.5, 0, 1, 0.5), opacity 0.4s ease-out';
        windowEl.style.transform = `translate(${deltaX}px, ${deltaY}px) scale(0.1)`;
        windowEl.style.opacity = '0';

        setTimeout(() => { windowEl.style.display = 'none'; }, 400);

        if (activeWindow === windowEl) {
            activeWindow = null;
            activeAppMenu.textContent = 'Finder';
        }
    }
    
    /**
     * Restores a minimized window from the dock.
     * @param {HTMLElement} windowEl - The window element to restore.
     */
    function restoreWindow(windowEl) {
        windowEl.style.display = 'flex';
        
        requestAnimationFrame(() => {
            windowEl.style.transition = 'transform 0.4s cubic-bezier(0, 0.5, 0.5, 1), opacity 0.4s ease-in';
            windowEl.style.transform = 'translate(0, 0) scale(1)';
            windowEl.style.opacity = '1';
            setTimeout(() => { 
                windowEl.style.transition = 'all 0.2s ease-in-out';
                windowEl.style.transform = '';
            }, 400);
        });
    }

    /**
     * Toggles a window between its maximized and normal states.
     * @param {HTMLElement} windowEl - The window element to maximize/restore.
     */
    function toggleMaximizeWindow(windowEl) {
        if (isMobile) return;
        if (windowEl.dataset.maximized === 'true') {
            windowEl.style.top = windowEl.dataset.lastTop;
            windowEl.style.left = windowEl.dataset.lastLeft;
            windowEl.style.width = windowEl.dataset.lastWidth;
            windowEl.style.height = windowEl.dataset.lastHeight;
            windowEl.dataset.maximized = "false";
        } else {
            windowEl.dataset.lastTop = windowEl.style.top;
            windowEl.dataset.lastLeft = windowEl.style.left;
            windowEl.dataset.lastWidth = windowEl.style.width;
            windowEl.dataset.lastHeight = windowEl.style.height;

            const menuBarHeight = 32;

            windowEl.style.top = `${menuBarHeight}px`;
            windowEl.style.left = '0px';
            windowEl.style.width = '100%';
            windowEl.style.height = `calc(100vh - ${menuBarHeight}px)`;
            windowEl.dataset.maximized = 'true';
        }
    }

    /**
     * Brings a window to the front and sets it as the active window.
     * @param {HTMLElement} windowEl - The window to focus.
     */
    function focusWindow(windowEl) {
        if(activeWindow === windowEl) return;
        highestZIndex++;
        windowEl.style.zIndex = highestZIndex;
        if(activeWindow){
            activeWindow.classList.remove('border-cyan-400');
        }
        activeWindow = windowEl;
        if (!isMobile) {
            activeWindow.classList.add('border-cyan-400');
        }
        const appId = windowEl.id.replace('window-', '');
        const app = apps.find(a => a.id === appId);
        activeAppMenu.textContent = app.name;
    }

    // --- Top Bar UI Handlers ---

    /**
     * Toggles the visibility of the notification drawer.
     * @param {Event} e - The click event.
     */
    function toggleNotificationDrawer(e) {
        e.stopPropagation();
        profileMenu.classList.remove('open');
        notificationDrawer.classList.toggle('open');
    }

    /**
     * Toggles the visibility of the profile dropdown menu.
     * @param {Event} e - The click event.
     */
    function toggleProfileMenu(e) {
        e.stopPropagation();
        notificationDrawer.classList.remove('open');
        profileMenu.classList.toggle('open');
    }

    /**
     * Handles global clicks to close open menus/drawers.
     * @param {Event} e - The click event.
     */
    function handleGlobalClick(e) {
        if (!notificationDrawer.contains(e.target) && !notificationIcon.contains(e.target)) {
            notificationDrawer.classList.remove('open');
        }
        if (!profileMenu.contains(e.target) && !profileIcon.contains(e.target)) {
            profileMenu.classList.remove('open');
        }
    }

    // --- Mouse Event Handlers for Drag & Resize ---

    /**
     * Handles the mousedown event to initiate dragging or resizing.
     * @param {MouseEvent} e - The mousedown event.
     */
    function onMouseDown(e) {
        if (isMobile) return;
        const target = e.target.closest('.resizer') || e.target;
        if (target.closest('.app-window')) {
            const windowEl = target.closest('.app-window');
            focusWindow(windowEl);
            if (target.classList.contains('title-bar')) {
                if (windowEl.dataset.maximized === 'true') return; 
                isDragging = true;
                dragTarget = windowEl;
                dragTarget.classList.add('is-dragging');
                initialWindowX = parseFloat(dragTarget.style.left) || 0;
                initialWindowY = parseFloat(dragTarget.style.top) || 0;
                initialMouseX = e.clientX;
                initialMouseY = e.clientY;
            } else if (target.classList.contains('resizer')) {
                if (windowEl.dataset.maximized === 'true') return;
                isResizing = true;
                resizeTarget = windowEl;
                const rect = resizeTarget.getBoundingClientRect();
                initialMouseX = e.clientX;
                initialMouseY = e.clientY;
                initialWidth = rect.width;
                initialHeight = rect.height;
            }
        }
    }

    /**
     * Handles the mousemove event to perform dragging or resizing.
     * @param {MouseEvent} e - The mousemove event.
     */
    function onMouseMove(e) {
        if (isMobile) return;
        if (isDragging && dragTarget) {
            const dx = e.clientX - initialMouseX;
            const dy = e.clientY - initialMouseY;
            dragTarget.style.transform = `translate(${dx}px, ${dy}px)`;
        } else if (isResizing && resizeTarget) {
            const dw = e.clientX - initialMouseX;
            const dh = e.clientY - initialMouseY;
            resizeTarget.style.width = `${initialWidth + dw}px`;
            resizeTarget.style.height = `${initialHeight + dh}px`;
        }
    }

    /**
     * Handles the mouseup event to end dragging or resizing.
     * @param {MouseEvent} e - The mouseup event.
     */
    function onMouseUp(e) {
        if (isMobile) return;

        if (isDragging && dragTarget) {
            const dx = e.clientX - initialMouseX;
            const dy = e.clientY - initialMouseY;
            dragTarget.style.left = `${initialWindowX + dx}px`;
            dragTarget.style.top = `${initialWindowY + dy}px`;
            dragTarget.style.transform = '';
            dragTarget.classList.remove('is-dragging');
        }

        isDragging = false;
        isResizing = false;
        dragTarget = null;
        resizeTarget = null;
    }

    // --- Start the App ---
    init();
});
