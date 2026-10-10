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

  // Initialize once DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    initProductCardNavigation();
    initProductCardPreviews();
    initQuickViewModal();
    initViewportControls();
    initWishlist();
    initViewSwitcher();
    initCartRecommendations();
  });

  /* ==========================================================================
     0. PRODUCT CARD CLICK-THROUGH NAVIGATION (Standard Website Experience)
     - Clicking anywhere on a .pf-card navigates to card.dataset.productUrl
     - Ignores clicks on action buttons (Quick View, Wishlist, native anchors/buttons)
     - Preserves Ctrl+Click / Cmd+Click / Middle-Click to open in new tab
     ========================================================================== */
  function initProductCardNavigation() {
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

      // 1. INSTANT HOVER DETECTION (0ms delay) -> Switch 2D to 3D across entire card
      card.addEventListener('mouseenter', (e) => {
        cachedRect = card.getBoundingClientRect();
        card.classList.add('is-hovered');
        if (isModelLoaded) {
          card.classList.add('has-3d-ready');
          wrap.classList.add('is-ready');
        }
        updateRotation(e);
      });

      // 2. Cursor movement across ANY part of the card steers 360-degree rotation smoothly
      card.addEventListener('mousemove', updateRotation);

      // 3. UNHIGHLIGHT: Instant removal back to 2D image
      card.addEventListener('mouseleave', () => {
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

    const closeBtn = modal.querySelector('[data-pf-close-modal]');
    const qvModel = document.getElementById('pf-quickview-model');
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
      if (qvCat) qvCat.textContent = card.dataset.category || 'ASSET';
      if (qvPoly) qvPoly.textContent = card.dataset.poly || '18.4K Δ';
      if (qvFormat) qvFormat.textContent = card.dataset.format || 'FBX / GLB';
      if (qvEngine) qvEngine.textContent = card.dataset.engine || 'UE5 / Unity';
      if (qvTex) qvTex.textContent = card.dataset.tex || '4K PBR';
      if (qvVariantId) qvVariantId.value = card.dataset.variantId || '';
      if (qvFullLink) qvFullLink.href = card.dataset.productUrl || '#';

      // Load 3D Model in Viewport
      if (qvModel) {
        const modelUrl = card.dataset.modelUrl;
        const posterUrl = card.dataset.posterUrl;
        if (modelUrl) {
          qvModel.src = modelUrl;
          if (posterUrl) qvModel.poster = posterUrl;
          qvModel.style.display = 'block';
        } else {
          qvModel.src = '';
          qvModel.style.display = 'none';
        }
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
     5. GRID / LIST COLLECTION LAYOUT SWITCHER
     ========================================================================== */
  function initViewSwitcher() {
    const grid = document.querySelector('.pf-product-grid');
    const btns = document.querySelectorAll('.pf-view-btn');
    if (!grid || !btns.length) return;

    btns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.view;
        btns.forEach((b) => b.classList.remove('is-active'));
        btn.classList.add('is-active');

        if (mode === 'list') {
          grid.classList.add('is-list-view');
        } else {
          grid.classList.remove('is-list-view');
        }
      });
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
                  <div class="pf-cross-sell-price">$${price}</div>
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

})();
