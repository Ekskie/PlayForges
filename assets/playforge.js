/**
 * PlayForge — 3D Asset Marketplace Core Controller
 * Handles:
 * - Card 3D Preview (hover debounce, cursor tracking orbit, mobile tap)
 * - Quick View Modal & AJAX Add-to-Cart
 * - Viewport Inspection Controls (Reset, Rotate, Grid, Fullscreen)
 * - Grid / List Collection Layout Switcher
 * - Wishlist LocalStorage Persistence
 * - Cart Drawer "Complete your environment" Cross-Sells
 */

(function () {
  'use strict';

  // State
  const activeViewers = new Map();
  let hoverTimeout = null;
  let viewSwitcherDelegated = false;
  let sortDropdownInitialized = false;
  let cardNavInitialized = false;

  function safeInit(name, fn) {
    try {
      fn();
    } catch (err) {
      console.warn(`[PlayForge] ${name} initialization error:`, err);
    }
  }

  // Initialize once DOM is ready
  function initAll() {
    safeInit('ThemeSwitcher', initThemeSwitcher);
    safeInit('ProductCardNavigation', initProductCardNavigation);
    safeInit('ProductCardPreviews', initProductCardPreviews);
    safeInit('QuickViewModal', initQuickViewModal);
    safeInit('ViewportControls', initViewportControls);
    safeInit('ModelViewerLoaders', initModelViewerLoaders);
    safeInit('Wishlist', initWishlist);
    safeInit('ViewSwitcher', initViewSwitcher);
    safeInit('CartRecommendations', initCartRecommendations);
    safeInit('CustomSortDropdown', initCustomSortDropdown);
    safeInit('AjaxGridObserver', initAjaxGridObserver);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }
  document.addEventListener('shopify:section:load', initAll);

  /* ==========================================================================
     0. PRODUCT CARD CLICK-THROUGH NAVIGATION (Standard Website Experience)
     - Clicking anywhere on a .pf-card navigates to card.dataset.productUrl
     - Ignores clicks on action buttons (Quick View, Wishlist, native anchors/buttons)
     - Preserves Ctrl+Click / Cmd+Click / Middle-Click to open in new tab
     ========================================================================== */
  function initProductCardNavigation() {
    if (cardNavInitialized) return;
    cardNavInitialized = true;

    const handleCardNavigation = (e) => {
      const card = e.target.closest('.pf-card');
      if (!card) return;

      // Ignore interactive buttons, modal triggers, and explicit links
      if (e.target.closest('[data-pf-quickview-btn], [data-pf-fav-btn], a, button')) return;

      const productUrl = card.dataset.productUrl;
      if (!productUrl) return;

      // Open in new tab on Ctrl / Cmd or Middle click
      if (e.ctrlKey || e.metaKey || e.button === 1) {
        window.open(productUrl, '_blank');
      } else {
        window.location.href = productUrl;
      }
    };

    document.addEventListener('click', handleCardNavigation);

    // Support middle mouse click (auxclick)
    document.addEventListener('auxclick', (e) => {
      if (e.button === 1) {
        handleCardNavigation(e);
      }
    });

    // Support keyboard activation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const card = e.target.closest('.pf-card');
        if (card && e.target === card) {
          const productUrl = card.dataset.productUrl;
          if (productUrl) {
            window.location.href = productUrl;
          }
        }
      }
    });
  }

  /* ==========================================================================
     1. PRODUCT CARD 3D HOVER & CURSOR-FOLLOWING PREVIEWS
     - Instant hover recognition across entire card
     - rAF-throttled 360-degree rotation following cursor position smoothly
     - Clean 2D to 3D transition only when model is fully ready
     - Instant removal back to 2D image when not highlighted
     ========================================================================== */
  function initProductCardPreviews() {
    const cards = document.querySelectorAll('.pf-card[data-model-url]');
    if (!cards.length) return;

    cards.forEach((card) => {
      const media = card.querySelector('[data-pf-card-media]');
      const wrap = card.querySelector('[data-pf-3d-wrap]');
      const modelUrl = card.dataset.modelUrl;
      const posterUrl = card.dataset.posterUrl;
      if (!media || !wrap || !modelUrl) return;
      if (card.__pfPreviewInit) return;
      card.__pfPreviewInit = true;

      let modelViewer = null;
      let isModelLoaded = false;
      let cachedRect = null;
      let rAFId = null;
      let pendingRatioX = 0.5;
      let pendingRatioY = 0.5;

      // Mounts the 3D viewer with native drag, zoom, and pan completely disabled
      const mountViewer = () => {
        if (modelViewer) return modelViewer;

        modelViewer = document.createElement('model-viewer');
        modelViewer.setAttribute('src', modelUrl);
        if (posterUrl) modelViewer.setAttribute('poster', posterUrl);
        modelViewer.setAttribute('alt', card.dataset.title || '3D Asset');
        modelViewer.setAttribute('loading', 'eager');
        modelViewer.setAttribute('reveal', 'auto');
        modelViewer.setAttribute('interaction-prompt', 'none');
        modelViewer.setAttribute('shadow-intensity', '0.8');
        modelViewer.setAttribute('exposure', '1.0');
        modelViewer.setAttribute('camera-orbit', '0deg 76deg 105%');
        modelViewer.setAttribute('bounds', 'tight');
        // Explicitly disable native drag, zoom, and pan — turntable is driven purely by cursor position
        modelViewer.removeAttribute('camera-controls');
        modelViewer.setAttribute('disable-zoom', '');
        modelViewer.setAttribute('disable-pan', '');

        modelViewer.addEventListener('load', () => {
          isModelLoaded = true;
          if (card.matches(':hover') || card.classList.contains('is-hovered')) {
            card.classList.add('is-hovered', 'has-3d-ready');
            wrap.classList.add('is-ready');
            applyRotation();
          }
        });

        wrap.appendChild(modelViewer);
        return modelViewer;
      };

      // Preload viewer when card approaches viewport so hover response is instant (0ms)
      if ('IntersectionObserver' in window) {
        const observer = new IntersectionObserver((entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              mountViewer();
              obs.unobserve(card);
            }
          });
        }, { rootMargin: '600px' });
        observer.observe(card);
      } else {
        mountViewer();
      }

      // Smoothly applies rotation calculations to model-viewer
      const applyRotation = () => {
        if (!modelViewer) return;
        const yaw = (pendingRatioX - 0.5) * 360;
        const pitch = 76 + ((pendingRatioY - 0.5) * 16);
        modelViewer.cameraOrbit = `${yaw.toFixed(1)}deg ${pitch.toFixed(1)}deg 105%`;
      };

      // Calculates smooth 360-degree rotation based on cursor position across the entire card
      const updateRotation = (e) => {
        mountViewer();

        if (!cachedRect) {
          cachedRect = card.getBoundingClientRect();
        }
        if (cachedRect.width <= 0 || cachedRect.height <= 0) return;

        // Ensure active hover classes are present
        if (!card.classList.contains('is-hovered')) {
          card.classList.add('is-hovered');
          if (isModelLoaded) {
            card.classList.add('has-3d-ready');
            wrap.classList.add('is-ready');
          }
        }

        // Normalized cursor coordinates across full card (0.0 to 1.0)
        const relX = Math.max(0, Math.min(cachedRect.width, e.clientX - cachedRect.left));
        const relY = Math.max(0, Math.min(cachedRect.height, e.clientY - cachedRect.top));

        pendingRatioX = relX / cachedRect.width;
        pendingRatioY = relY / cachedRect.height;

        if (!rAFId) {
          rAFId = requestAnimationFrame(() => {
            rAFId = null;
            applyRotation();
          });
        }
      };

      let hoverTimer = null;

      modelViewer?.addEventListener('error', () => {
        isModelLoaded = false;
        card.classList.remove('has-3d-ready');
        wrap.classList.remove('is-ready');
      });

      // 1. INTENTIONAL HOVER DELAY (220ms) -> Prevents heavy 3D loads on accidental mouse travel
      card.addEventListener('mouseenter', (e) => {
        cachedRect = card.getBoundingClientRect();
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(() => {
          mountViewer();
          card.classList.add('is-hovered');
          if (isModelLoaded) {
            card.classList.add('has-3d-ready');
            wrap.classList.add('is-ready');
          }
          updateRotation(e);
        }, 220);
      });

      // 2. Cursor movement across card steers rotation smoothly
      card.addEventListener('mousemove', (e) => {
        if (card.classList.contains('is-hovered')) {
          updateRotation(e);
        }
      });

      // 3. UNHIGHLIGHT: Return to calm idle position and restore 2D poster
      card.addEventListener('mouseleave', () => {
        clearTimeout(hoverTimer);
        hoverTimer = null;
        cachedRect = null;
        if (rAFId) {
          cancelAnimationFrame(rAFId);
          rAFId = null;
        }
        card.classList.remove('is-hovered', 'has-3d-ready');
        wrap.classList.remove('is-ready');
        if (modelViewer) {
          modelViewer.cameraOrbit = '0deg 76deg 105%';
        }
      });

      // Touch / Mobile Support: Tap card media to toggle between 2D and 3D
      media.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
          e.preventDefault();
          e.stopPropagation();
          mountViewer();
          const isNowActive = card.classList.toggle('is-hovered');
          if (isModelLoaded) {
            card.classList.toggle('has-3d-ready', isNowActive);
            wrap.classList.toggle('is-ready', isNowActive);
          }
        }
      });
    });
  }

  /* ==========================================================================
     2. QUICK VIEW MODAL & AJAX ADD-TO-CART
     ========================================================================== */
  function initQuickViewModal() {
    const modal = document.getElementById('pf-quickview-modal');
    if (!modal) return;
    if (modal._pfInitialized) return;
    modal._pfInitialized = true;

    const closeBtn = modal.querySelector('[data-pf-close-modal]');
    const qvModel = document.getElementById('pf-quickview-model');
    const qvLoader = document.getElementById('pf-quickview-loader') || modal.querySelector('.pf-viewer-loader');
    const qvTitle = document.getElementById('pf-qv-title');
    const qvPrice = document.getElementById('pf-qv-price');
    const qvCat = document.getElementById('pf-qv-category');
    const qvPoly = document.getElementById('pf-qv-poly');
    const qvFormat = document.getElementById('pf-qv-format');
    const qvEngine = document.getElementById('pf-qv-engine');
    const qvTex = document.getElementById('pf-qv-tex');
    const qvVariantId = document.getElementById('pf-qv-variant-id');
    const qvFullLink = document.getElementById('pf-qv-full-link');
    const qvForm = document.getElementById('pf-qv-form');
    const qvSubmitBtn = document.getElementById('pf-qv-submit-btn');

    let loadWatchdog = null;

    const showLoader = () => {
      if (qvLoader) {
        qvLoader.classList.remove('is-hidden');
        qvLoader.style.display = 'flex';
        qvLoader.style.opacity = '1';
        qvLoader.style.visibility = 'visible';
      }
    };

    const hideLoader = () => {
      if (loadWatchdog) {
        clearTimeout(loadWatchdog);
        loadWatchdog = null;
      }
      if (qvLoader) {
        qvLoader.classList.add('is-hidden');
        qvLoader.style.opacity = '0';
        qvLoader.style.visibility = 'hidden';
        qvLoader.style.display = 'none';
      }
    };

    // Attach listeners on qvModel to immediately dismiss loader when rendered
    if (qvModel) {
      qvModel.addEventListener('load', () => {
        hideLoader();
      });
      qvModel.addEventListener('error', () => {
        hideLoader();
      });
      qvModel.addEventListener('model-visibility', (e) => {
        if (e.detail && e.detail.visible) {
          hideLoader();
        }
      });
      qvModel.addEventListener('progress', (e) => {
        if (e.detail && e.detail.totalProgress >= 1) {
          setTimeout(hideLoader, 100);
        }
      });
    }

    // Open Quick View
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pf-quickview-btn]');
      if (!btn) return;

      const card = btn.closest('.pf-card');
      if (!card) return;

      e.preventDefault();

      // Populate Data
      if (qvTitle) qvTitle.textContent = card.dataset.title || '';
      if (qvPrice) qvPrice.textContent = card.dataset.price || '';
      if (qvCat) qvCat.textContent = card.dataset.category || 'Asset';

      const updateSpec = (el, val) => {
        if (!el) return;
        const parentCell = el.closest('.pf-spec-cell');
        if (val && val.trim() !== '') {
          el.textContent = val;
          if (parentCell) parentCell.style.display = '';
        } else {
          if (parentCell) parentCell.style.display = 'none';
        }
      };

      updateSpec(qvPoly, card.dataset.poly);
      updateSpec(qvFormat, card.dataset.format);
      updateSpec(qvEngine, card.dataset.engine);
      updateSpec(qvTex, card.dataset.tex);

      const specsWrap = modal.querySelector('.pf-specs-table-wrap');
      if (specsWrap) {
        const hasSpecs = [card.dataset.poly, card.dataset.format, card.dataset.engine, card.dataset.tex].some(v => v && v.trim() !== '');
        specsWrap.style.display = hasSpecs ? '' : 'none';
      }

      if (qvVariantId) qvVariantId.value = card.dataset.variantId || '';
      if (qvFullLink) qvFullLink.href = card.dataset.productUrl || '#';

      // Load 3D Model in Viewport
      if (qvModel) {
        const modelUrl = card.dataset.modelUrl;
        const posterUrl = card.dataset.posterUrl;
        if (modelUrl) {
          qvModel.style.display = 'block';

          // Check if already loaded with exact same model
          if (qvModel.src === modelUrl && qvModel.loaded) {
            hideLoader();
          } else {
            showLoader();
            qvModel.src = modelUrl;
            if (posterUrl) qvModel.poster = posterUrl;

            // Failsafe watchdog timer: ensure loader disappears if model already cached or quick rendered
            if (loadWatchdog) clearTimeout(loadWatchdog);
            loadWatchdog = setTimeout(hideLoader, 2000);
          }
        } else {
          qvModel.src = '';
          qvModel.style.display = 'none';
          hideLoader();
        }
      } else {
        hideLoader();
      }

      // Open Modal
      modal.classList.add('is-open');
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    });

    // Close Modal Handler
    const closeModal = () => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      hideLoader();
      if (qvModel) {
        qvModel.src = ''; // Clean up memory
      }
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('is-open')) {
        closeModal();
      }
    });

    // Handle AJAX Add-to-Cart from Quick View
    if (qvForm) {
      qvForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const variantId = qvVariantId.value;
        if (!variantId) return;

        qvSubmitBtn.disabled = true;
        const origText = qvSubmitBtn.textContent;
        qvSubmitBtn.textContent = 'Adding to Library...';

        fetch(window.routes?.cart_add_url || '/cart/add.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            id: variantId,
            quantity: 1,
          }),
        })
          .then((res) => res.json())
          .then((item) => {
            qvSubmitBtn.textContent = 'Added!';
            setTimeout(() => {
              qvSubmitBtn.disabled = false;
              qvSubmitBtn.textContent = origText;
              closeModal();

              // Open Shopify cart drawer if present
              const drawer = document.querySelector('cart-drawer');
              if (drawer && typeof drawer.open === 'function') {
                drawer.open();
              } else {
                window.location.href = window.routes?.cart_url || '/cart';
              }
            }, 600);
          })
          .catch((err) => {
            console.error('Add to Cart error:', err);
            qvSubmitBtn.disabled = false;
            qvSubmitBtn.textContent = 'Error adding';
          });
      });
    }
  }

  /* ==========================================================================
     3. 3D VIEWPORT CONTROLS (RESET, ROTATE, GRID, FULLSCREEN)
     ========================================================================== */
  function initViewportControls() {
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pf-action]');
      if (!btn) return;

      const container = btn.closest('.pf-viewer-container') || btn.closest('.pf-quickview-viewport') || btn.closest('.pf-hero-viewport-wrap');
      if (!container) return;

      const modelViewer = container.querySelector('model-viewer');
      if (!modelViewer) return;

      const action = btn.dataset.pfAction;

      switch (action) {
        case 'reset-camera':
          modelViewer.cameraOrbit = '0deg 75deg 105%';
          modelViewer.fieldOfView = 'auto';
          break;

        case 'toggle-rotate':
          modelViewer.autoRotate = !modelViewer.autoRotate;
          btn.classList.toggle('is-active', modelViewer.autoRotate);
          break;

        case 'toggle-grid':
          container.classList.toggle('is-grid-bg');
          btn.classList.toggle('is-active', container.classList.contains('is-grid-bg'));
          break;

        case 'toggle-fullscreen':
          if (!document.fullscreenElement) {
            container.requestFullscreen?.().catch((err) => console.log(err));
          } else {
            document.exitFullscreen?.().catch((err) => console.log(err));
          }
          break;
      }
    });
  }

  /* ==========================================================================
     3.1 GLOBAL 3D MODEL-VIEWER LOADER DISMISSAL
     ========================================================================== */
  function initModelViewerLoaders() {
    const bindLoader = (mv) => {
      if (mv._pfLoaderBound) return;
      mv._pfLoaderBound = true;

      const container = mv.closest('.pf-viewer-container, .pf-quickview-viewport, .pf-hero-viewport-wrap') || mv.parentElement;
      const loader = container ? container.querySelector('.pf-viewer-loader') : mv.querySelector('.pf-viewer-loader');
      if (!loader) return;

      const hideLoader = () => {
        loader.classList.add('is-hidden');
        loader.style.opacity = '0';
        loader.style.visibility = 'hidden';
        loader.style.display = 'none';
      };

      if (mv.loaded) {
        hideLoader();
      }

      mv.addEventListener('load', hideLoader);
      mv.addEventListener('error', hideLoader);
      mv.addEventListener('model-visibility', (e) => {
        if (e.detail?.visible) hideLoader();
      });
      mv.addEventListener('progress', (e) => {
        if (e.detail?.totalProgress >= 1) {
          setTimeout(hideLoader, 100);
        }
      });
    };

    document.querySelectorAll('model-viewer').forEach(bindLoader);
  }

  /* ==========================================================================
     4. WISHLIST LOCALSTORAGE PERSISTENCE
     ========================================================================== */
  function initWishlist() {
    const STORAGE_KEY = 'playforge_wishlist';
    let wishlist = [];

    try {
      wishlist = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      wishlist = [];
    }

    // Restore state
    const updateButtons = () => {
      document.querySelectorAll('[data-pf-fav-btn]').forEach((btn) => {
        const id = btn.dataset.pfFavBtn;
        const isFav = wishlist.includes(id);
        btn.classList.toggle('is-favorited', isFav);
      });
    };

    updateButtons();

    // Toggle on click
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pf-fav-btn]');
      if (!btn) return;

      e.preventDefault();
      const id = btn.dataset.pfFavBtn;
      if (!id) return;

      if (wishlist.includes(id)) {
        wishlist = wishlist.filter((item) => item !== id);
      } else {
        wishlist.push(id);
      }

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(wishlist));
      } catch (e) {}

      updateButtons();
    });
  }


  /* ==========================================================================
     6. CART DRAWER "COMPLETE YOUR ENVIRONMENT" RECOMMENDATIONS
     ========================================================================== */
  function initCartRecommendations() {
    const drawer = document.getElementById('CartDrawer');
    if (!drawer) return;

    // Check if recommendations block exists or inject it dynamically
    const renderRecommendations = (productId) => {
      let recContainer = drawer.querySelector('.pf-cart-cross-sell');
      if (!recContainer) {
        recContainer = document.createElement('div');
        recContainer.className = 'pf-cart-cross-sell';
        const inner = drawer.querySelector('.drawer__inner');
        if (inner) inner.appendChild(recContainer);
      }

      fetch(`/recommendations/products.json?product_id=${productId}&limit=3`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.products || !data.products.length) return;

          let html = `
            <div class="pf-cross-sell-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              Complete Your Environment
            </div>
          `;

          data.products.forEach((prod) => {
            const price = (prod.price / 100).toFixed(2);
            html += `
              <div class="pf-cross-sell-item">
                <img src="${prod.featured_image || ''}" class="pf-cross-sell-thumb" alt="${prod.title}">
                <div class="pf-cross-sell-details">
                  <div class="pf-cross-sell-name">${prod.title}</div>
                  <div class="pf-cross-sell-price">₱${price}</div>
                </div>
                <button type="button" class="pf-cross-sell-add" data-quick-add-id="${prod.variants[0]?.id}">
                  + Add
                </button>
              </div>
            `;
          });

          recContainer.innerHTML = html;

          // Wire Add buttons
          recContainer.querySelectorAll('[data-quick-add-id]').forEach((b) => {
            b.addEventListener('click', () => {
              const varId = b.dataset.quickAddId;
              b.textContent = '...';
              fetch('/cart/add.js', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: varId, quantity: 1 }),
              }).then(() => {
                b.textContent = 'Added';
                // Trigger cart drawer refresh
                if (typeof drawer.closest('cart-drawer')?.renderContents === 'function') {
                  drawer.closest('cart-drawer').renderContents();
                } else {
                  location.reload();
                }
              });
            });
          });
        })
        .catch(() => {});
    };

    // Listen to Cart updates
    const firstItem = drawer.querySelector('[data-product-id]');
    if (firstItem && firstItem.dataset.productId) {
      renderRecommendations(firstItem.dataset.productId);
    }
  }

  /* ==========================================================================
     7.5 ASSET BROWSER VIEW SWITCHER (GRID vs DETAILED LIST)
     - Switches between 3D grid cards and detailed studio list layout
     - Document event delegation so view mode survives Shopify AJAX reloads
     - Persists choice in localStorage ('pf-asset-view-mode')
     ========================================================================== */
  function applyAssetViewMode(mode) {
    const activeMode = mode === 'list' ? 'list' : 'grid';
    const grid = document.querySelector('.pf-product-grid') || document.getElementById('product-grid');
    if (grid) {
      grid.classList.toggle('is-list-view', activeMode === 'list');
    }

    document.querySelectorAll('.pf-view-btn').forEach((btn) => {
      const isActive = btn.dataset.view === activeMode;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    try {
      localStorage.setItem('pf-asset-view-mode', activeMode);
    } catch (e) {}
  }

  function initViewSwitcher() {
    // Restore and re-apply saved view preference
    try {
      const saved = localStorage.getItem('pf-asset-view-mode') || 'grid';
      applyAssetViewMode(saved);
    } catch (e) {}

    if (viewSwitcherDelegated) return;
    viewSwitcherDelegated = true;

    // Delegated click on document so re-rendered AJAX buttons always work
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.pf-view-btn');
      if (!btn) return;
      e.preventDefault();
      const targetView = btn.dataset.view;
      if (targetView) applyAssetViewMode(targetView);
    });
  }

  /* ==========================================================================
     8. DARK / LIGHT MODE THEME ENGINE & ZERO-FLICKER SYNCHRONIZATION
     - Header & Drawer Sun/Moon button toggling
     - Keyboard shortcut: Ctrl + Shift + D (or Cmd + Shift + D)
     - localStorage persistence ('pf-theme': 'dark' | 'light')
     - Custom event 'pf:themechange' dispatch
     - Model-viewer illumination sync
     ========================================================================== */
  function initThemeSwitcher() {
    const getStoredTheme = () => {
      try {
        return localStorage.getItem('pf-theme') || 'light';
      } catch (e) {
        return 'light';
      }
    };

    const applyTheme = (theme, animate = false) => {
      const activeTheme = theme === 'light' ? 'light' : 'dark';
      
      if (animate) {
        document.documentElement.classList.add('pf-theme-transitioning');
      }

      document.documentElement.setAttribute('data-theme', activeTheme);
      document.documentElement.classList.remove('pf-theme-dark', 'pf-theme-light');
      document.documentElement.classList.add(`pf-theme-${activeTheme}`);

      try {
        localStorage.setItem('pf-theme', activeTheme);
      } catch (e) {}

      // Update theme-color meta tag
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.setAttribute('content', activeTheme === 'dark' ? '#0d0e12' : '#f8fafc');
      }

      // Update accessibility labels on all toggle buttons
      const toggles = document.querySelectorAll('[data-pf-theme-toggle]');
      toggles.forEach((btn) => {
        const nextMode = activeTheme === 'dark' ? 'Light' : 'Dark';
        btn.setAttribute('aria-label', `Switch to ${nextMode} mode`);
        btn.setAttribute('title', `Switch to ${nextMode} mode (Ctrl+Shift+D)`);
      });

      // Notify viewers and external listeners
      window.dispatchEvent(new CustomEvent('pf:themechange', { detail: { theme: activeTheme } }));

      // Adjust model-viewers if needed
      document.querySelectorAll('model-viewer').forEach((mv) => {
        if (activeTheme === 'light') {
          mv.setAttribute('exposure', '1.1');
          mv.setAttribute('shadow-intensity', '0.85');
        } else {
          mv.setAttribute('exposure', '1.0');
          mv.setAttribute('shadow-intensity', '1.0');
        }
      });

      if (animate) {
        setTimeout(() => {
          document.documentElement.classList.remove('pf-theme-transitioning');
        }, 300);
      }
    };

    const toggleTheme = () => {
      const current = document.documentElement.getAttribute('data-theme') || getStoredTheme();
      const next = current === 'dark' ? 'light' : 'dark';
      applyTheme(next, true);
    };

    // Attach click handlers to all theme toggles
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-pf-theme-toggle]');
      if (!btn) return;
      e.preventDefault();
      toggleTheme();
    });

    // Keyboard shortcut: Ctrl + Shift + D or Cmd + Shift + D
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        toggleTheme();
      }
    });

    // Initial label sync
    const currentTheme = document.documentElement.getAttribute('data-theme') || getStoredTheme();
    applyTheme(currentTheme, false);
  }

  /* ==========================================================================
     11. CUSTOM EDITORIAL SORT DROPDOWN (Replaces OS Native Select)
     - Interactive popover listbox with full theme awareness
     - Bi-directional synchronization with hidden native <select name="sort_by">
     - Fires bubbling 'input'/'change' events to seamlessly trigger FacetFiltersForm AJAX reload
     - Full keyboard navigation (Arrow Up/Down, Enter/Space, Escape) & click-outside
     ========================================================================== */
  function initCustomSortDropdown() {
    if (sortDropdownInitialized) {
      syncAllDropdownsFromNative();
      return;
    }
    sortDropdownInitialized = true;

    // Helper: Close a dropdown (handles both <details> and .is-open <div>)
    function closeDropdown(dropdown) {
      if (dropdown.tagName === 'DETAILS') {
        dropdown.open = false;
        dropdown.removeAttribute('open');
      }
      dropdown.classList.remove('is-open');
      const trigger = dropdown.querySelector('[data-pf-sort-trigger]');
      if (trigger) trigger.setAttribute('aria-expanded', 'false');
    }

    // Helper: Open a dropdown
    function openDropdown(dropdown) {
      // Close other dropdowns first
      document.querySelectorAll('[data-pf-sort-dropdown]').forEach((dd) => {
        if (dd !== dropdown) closeDropdown(dd);
      });

      if (dropdown.tagName === 'DETAILS') {
        dropdown.open = true;
        dropdown.setAttribute('open', '');
      } else {
        dropdown.classList.add('is-open');
      }
      const trigger = dropdown.querySelector('[data-pf-sort-trigger]');
      if (trigger) trigger.setAttribute('aria-expanded', 'true');
    }

    // Helper: Sync UI state
    function syncDropdownUI(dropdown, val, label) {
      dropdown.querySelectorAll('.pf-sort-option').forEach((opt) => {
        const isMatch = opt.dataset.value === val;
        opt.classList.toggle('is-selected', isMatch);
        opt.setAttribute('aria-selected', isMatch ? 'true' : 'false');
      });

      const labelSpan = dropdown.querySelector('[data-pf-sort-label]');
      if (labelSpan && label) {
        labelSpan.textContent = label;
      }
      const trigger = dropdown.querySelector('[data-pf-sort-trigger]');
      if (trigger && label) {
        trigger.setAttribute('aria-label', `Sort by: ${label}`);
      }
    }

    // Helper: Select an option and trigger Shopify AJAX
    function selectOption(dropdown, val, label) {
      syncDropdownUI(dropdown, val, label);

      const nativeSelect = dropdown.querySelector('select[name="sort_by"]')
        || dropdown.closest('form')?.querySelector('select[name="sort_by"]')
        || document.querySelector('select[name="sort_by"]');

      if (nativeSelect) {
        nativeSelect.value = val;
        // Dispatch bubbling input and change events for FacetFiltersForm AJAX reload
        nativeSelect.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        nativeSelect.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));

        // Fallback: If not inside a facet-filters-form custom element, submit form
        const parentFacetForm = nativeSelect.closest('facet-filters-form');
        if (!parentFacetForm && nativeSelect.form) {
          nativeSelect.form.submit();
        }
      }
    }

    // Close any other open dropdown when another <details> is opened
    document.addEventListener('toggle', (e) => {
      const target = e.target;
      if (target && target.matches && target.matches('details[data-pf-sort-dropdown]') && target.open) {
        document.querySelectorAll('details[data-pf-sort-dropdown][open]').forEach((other) => {
          if (other !== target) closeDropdown(other);
        });
      }
    }, true);

    // Global Click Handler: delegation for options, triggers, and clicking outside
    document.addEventListener('click', (e) => {
      // 1. Option Button Clicked
      const optionBtn = e.target.closest('.pf-sort-option');
      if (optionBtn) {
        e.preventDefault();
        e.stopPropagation();
        const dropdown = optionBtn.closest('[data-pf-sort-dropdown]');
        if (!dropdown) return;

        const val = optionBtn.dataset.value;
        const label = optionBtn.dataset.label;
        selectOption(dropdown, val, label);
        closeDropdown(dropdown);

        const trg = dropdown.querySelector('[data-pf-sort-trigger]');
        if (trg) trg.focus();
        return;
      }

      // 2. Trigger Button Clicked (only needed for non-<details> fallback)
      const trigger = e.target.closest('[data-pf-sort-trigger]');
      if (trigger && trigger.tagName !== 'SUMMARY') {
        e.preventDefault();
        e.stopPropagation();
        const dropdown = trigger.closest('[data-pf-sort-dropdown]');
        if (!dropdown) return;

        const isOpen = dropdown.hasAttribute('open') || dropdown.classList.contains('is-open');
        if (isOpen) {
          closeDropdown(dropdown);
        } else {
          openDropdown(dropdown);
        }
        return;
      }

      // 3. Clicked Outside any sort dropdown
      if (!e.target.closest('[data-pf-sort-dropdown]')) {
        document.querySelectorAll('[data-pf-sort-dropdown]').forEach((dd) => {
          if (dd.hasAttribute('open') || dd.classList.contains('is-open')) {
            closeDropdown(dd);
          }
        });
      }
    });

    // Global Keyboard Navigation
    document.addEventListener('keydown', (e) => {
      // Escape closes all open dropdowns
      if (e.key === 'Escape') {
        document.querySelectorAll('[data-pf-sort-dropdown]').forEach((dd) => {
          if (dd.hasAttribute('open') || dd.classList.contains('is-open')) {
            closeDropdown(dd);
            const trg = dd.querySelector('[data-pf-sort-trigger]');
            if (trg) trg.focus();
          }
        });
        return;
      }

      const dropdown = e.target.closest('[data-pf-sort-dropdown]');
      if (!dropdown) return;

      const trigger = dropdown.querySelector('[data-pf-sort-trigger]');
      const options = Array.from(dropdown.querySelectorAll('.pf-sort-option'));
      const isOpen = dropdown.hasAttribute('open') || dropdown.classList.contains('is-open');

      // Trigger / Summary focused
      if (e.target === trigger) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (!isOpen) openDropdown(dropdown);
          const firstActive = dropdown.querySelector('.pf-sort-option.is-selected') || options[0];
          if (firstActive) firstActive.focus();
        }
        return;
      }

      // Option button focused
      if (isOpen && e.target.classList.contains('pf-sort-option')) {
        const currentIndex = options.indexOf(e.target);

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % options.length;
          options[nextIndex].focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIndex = (currentIndex - 1 + options.length) % options.length;
          options[prevIndex].focus();
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const val = e.target.dataset.value;
          const label = e.target.dataset.label;
          selectOption(dropdown, val, label);
          closeDropdown(dropdown);
          if (trigger) trigger.focus();
        } else if (e.key === 'Tab') {
          closeDropdown(dropdown);
        }
      }
    });

    // Sync on external native select change (e.g. from popstate or reset)
    document.addEventListener('change', (e) => {
      if (e.target && e.target.matches && e.target.matches('select[name="sort_by"]')) {
        const dropdown = e.target.closest('[data-pf-sort-dropdown]');
        if (!dropdown) return;
        const selectedOption = e.target.options[e.target.selectedIndex];
        if (selectedOption) {
          syncDropdownUI(dropdown, selectedOption.value, selectedOption.text);
        }
      }
    });

    syncAllDropdownsFromNative();
  }

  function syncAllDropdownsFromNative() {
    document.querySelectorAll('[data-pf-sort-dropdown]').forEach((dropdown) => {
      const nativeSelect = dropdown.querySelector('select[name="sort_by"]');
      if (nativeSelect && nativeSelect.selectedIndex >= 0) {
        const selectedOption = nativeSelect.options[nativeSelect.selectedIndex];
        if (selectedOption) {
          const val = selectedOption.value;
          const label = selectedOption.text;
          dropdown.querySelectorAll('.pf-sort-option').forEach((opt) => {
            const isMatch = opt.dataset.value === val;
            opt.classList.toggle('is-selected', isMatch);
            opt.setAttribute('aria-selected', isMatch ? 'true' : 'false');
          });
          const labelSpan = dropdown.querySelector('[data-pf-sort-label]');
          if (labelSpan) labelSpan.textContent = label;
        }
      }
    });
  }

  /* ==========================================================================
     12. AJAX RE-HYDRATION OBSERVER
     - Re-applies grid/list mode and 3D preview listeners when Shopify Dawn FacetFiltersForm
       re-renders #ProductGridContainer via AJAX
     ========================================================================== */
  function initAjaxGridObserver() {
    const gridContainer = document.getElementById('ProductGridContainer');
    if (!gridContainer || gridContainer.__pfObserver) return;
    gridContainer.__pfObserver = true;

    const observer = new MutationObserver((mutations) => {
      let hasAddedNodes = false;
      for (const m of mutations) {
        if (m.type === 'childList' && m.addedNodes.length > 0) {
          hasAddedNodes = true;
          break;
        }
      }
      if (hasAddedNodes) {
        // Re-apply saved view mode (grid vs list)
        try {
          const saved = localStorage.getItem('pf-asset-view-mode') || 'grid';
          applyAssetViewMode(saved);
        } catch (e) {}

        // Re-bind 3D previews to new cards
        safeInit('ProductCardPreviews', initProductCardPreviews);

        // Sync dropdown labels
        syncAllDropdownsFromNative();
      }
    });

    observer.observe(gridContainer, { childList: true, subtree: true });
  }

})();

