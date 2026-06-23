document.addEventListener('DOMContentLoaded', () => {

  // ================================
  // PAGE ENTRANCE ANIMATIONS
  // ================================
  
  // COMMENTED OUT: Page entrance animations for static feel
  // function initPageAnimations() {
  //   // Check if user prefers reduced motion
  //   if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  //     return; // Skip animations if user prefers reduced motion
  //   }
  //   
  //   // Get all elements that should be animated
  //   const headerElements = document.querySelectorAll('#name, .subtitle, nav');
  //   const carouselElement = document.querySelector('.carousel');
  //   const sectionElements = document.querySelectorAll('section, .section');
  //   const linkElements = document.querySelectorAll('.image-link');
  //   const logoElement = document.querySelector('.logo-link');
  //   
  //   const allElements = [
  //     ...(logoElement ? [logoElement] : []),
  //     ...headerElements,
  //     ...(carouselElement ? [carouselElement] : []),
  //     ...sectionElements,
  //     ...linkElements
  //   ];
  //   
  //   allElements.forEach(el => {
  //     el.style.opacity = '0';
  //     el.style.filter = 'blur(8px)';
  //     el.style.transform = 'translateY(12px) translateZ(0)';
  //     el.style.transition = 'all 0.4s cubic-bezier(0.20, 0.40, 0.40, 0.8)';
  //   });
  //   
  //   // Trigger animations after page load
  //   requestAnimationFrame(() => {
  //     setTimeout(() => {
  //       // Animate elements with staggered timing
  //       if (logoElement) {
  //         setTimeout(() => {
  //           logoElement.style.opacity = '1';
  //           logoElement.style.filter = 'blur(0px)';
  //           logoElement.style.transform = 'translateY(0px) translateZ(0)';
  //         }, 100);
  //       }
  //       
  //       headerElements.forEach((el, index) => {
  //         setTimeout(() => {
  //           el.style.opacity = '1';
  //           el.style.filter = 'blur(0px)';
  //           el.style.transform = 'translateY(0px) translateZ(0)';
  //         }, 150 + index * 50);
  //       });
  //       
  //       if (carouselElement) {
  //         setTimeout(() => {
  //           carouselElement.style.opacity = '1';
  //           carouselElement.style.filter = 'blur(0px)';
  //           carouselElement.style.transform = 'translateY(0px) translateZ(0)';
  //         }, 400);
  //       }
  //       
  //       sectionElements.forEach((el, index) => {
  //         setTimeout(() => {
  //           el.style.opacity = '1';
  //           el.style.filter = 'blur(0px)';
  //           el.style.transform = 'translateY(0px) translateZ(0)';
  //         }, 500 + index * 100);
  //       });
  //       
  //       linkElements.forEach((el, index) => {
  //         setTimeout(() => {
  //           el.style.opacity = '1';
  //           el.style.filter = 'blur(0px)';
  //           el.style.transform = 'translateY(0px) translateZ(0)';
  //         }, 700 + index * 30);
  //       });
  //     }, 100); // Small delay after page load
  //   });
  // }
  
  // Page transition handling for navigation
  function handlePageTransition(href) {
    // Only handle internal links
    if (href.startsWith('/') || href.includes(window.location.hostname)) {
      // COMMENTED OUT: Page transition animations for snappy navigation
      // Get all animated elements - target the main containers, not child elements
      // const logoElement = document.querySelector('.logo-link');
      // const nameElement = document.querySelector('#name');
      // const subtitleElement = document.querySelector('.subtitle.hideable'); // Only the main subtitle
      // const navElement = document.querySelector('nav');
      // const carouselElement = document.querySelector('.embla');
      // const sectionElements = document.querySelectorAll('section');
      // const linkElements = document.querySelectorAll('a.image-link.row'); // Specific to the work/product links
      
      // const allElements = [
      //   ...(logoElement ? [logoElement] : []),
      //   ...(nameElement ? [nameElement] : []),
      //   ...(subtitleElement ? [subtitleElement] : []),
      //   ...(navElement ? [navElement] : []),
      //   ...(carouselElement ? [carouselElement] : []),
      //   ...sectionElements,
      //   ...linkElements
      // ];
      
      // Animate elements out quickly
      // allElements.forEach((el, index) => {
      //   // Force override any existing transition
      //   el.style.transition = 'none';
      //   requestAnimationFrame(() => {
      //     el.style.transition = 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      //     setTimeout(() => {
      //       el.style.opacity = '0';
      //       el.style.filter = 'blur(8px)';
      //       el.style.transform = 'translateY(12px) translateZ(0)';
      //     }, index * 20); // Very quick stagger
      //   });
      // });
      
      // Also fade the page container
      // const pageContent = document.querySelector('.page-content');
      // if (pageContent) {
      //   pageContent.style.transition = 'opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      //   setTimeout(() => {
      //     pageContent.style.opacity = '0.3';
      //   }, 100);
      // }
      
      // setTimeout(() => {
      //   window.location.href = href;
      // }, 400); // Give enough time for exit animation
      
      // return false; // Prevent immediate navigation
      
      // Allow immediate navigation for snappy feel
      return true;
    }
    return true; // Allow navigation for external links
  }
  
  // Add transition handling to navigation links
  document.addEventListener('click', (e) => {
    if (e.target.tagName === 'A' && e.target.hasAttribute('href')) {
      const href = e.target.getAttribute('href');
      if (href && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (!handlePageTransition(href)) {
          e.preventDefault();
        }
      }
    }
  });
  
  // COMMENTED OUT: Animation initialization for static feel
  // let animationsInitialized = false;
  // 
  // function safeInitAnimations() {
  //   if (!animationsInitialized) {
  //     animationsInitialized = true;
  //     initPageAnimations();
  //   }
  // }
  // 
  // // Initialize immediately
  // safeInitAnimations();
  // 
  // // Also trigger on window load as a fallback
  // window.addEventListener('load', safeInitAnimations);

  // ================================
  // NATIVE SCROLL CAROUSEL IMPLEMENTATION
  // ================================
  
  function initCarousel(carouselContainer) {
    if (!carouselContainer) return;

    let isDragging = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasMoved = false;

    // Only handle drag events within the carousel container
    carouselContainer.addEventListener('mousedown', (e) => {
      // Only start drag if clicking within the carousel container or its children
      // Don't interfere with elements outside the carousel
      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      scrollLeft = carouselContainer.scrollLeft;
      carouselContainer.style.cursor = 'grabbing';
    });

    carouselContainer.addEventListener('mouseleave', (e) => {
      if (isDragging) {
        isDragging = false;
        hasMoved = false;
        carouselContainer.classList.remove('dragging');
        carouselContainer.style.cursor = 'grab';
      }
    });

    carouselContainer.addEventListener('mouseup', (e) => {
      if (isDragging) {
        isDragging = false;
        hasMoved = false;
        carouselContainer.classList.remove('dragging');
        carouselContainer.style.cursor = 'grab';
      }
    });

    carouselContainer.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      // Only add dragging class and disable pointer events if mouse actually moved
      if (!hasMoved) {
        const moved = Math.abs(e.clientX - startX) > 3;
        if (moved) {
          hasMoved = true;
          carouselContainer.classList.add('dragging');
        }
      }
      
      if (hasMoved) {
        const x = e.clientX;
        const walk = (x - startX) * 2;
        carouselContainer.scrollLeft = scrollLeft - walk;
        // Only prevent default when actually dragging within the carousel
        e.preventDefault();
        e.stopPropagation();
      }
    });

    // Set initial cursor style only on the carousel container
    carouselContainer.style.cursor = 'grab';
  }
  
  // Initialize all carousels on the page
  function initAllCarousels() {
    const carousels = document.querySelectorAll('.carousel-container');
    carousels.forEach(carousel => {
      initCarousel(carousel);
    });
  }
  
  // Initialize carousels
  initAllCarousels();

  // ================================
  // SIMPLE IMAGE CAROUSEL
  // ================================
  
  function initImageCarousels() {
    
    const carousels = document.querySelectorAll('.image-carousel');
    
    // Debug: let's see what elements are actually in the DOM
    const allDivs = document.querySelectorAll('div');
    
    // Check if any divs have carousel-related classes
    const carouselRelated = document.querySelectorAll('[class*="carousel"]');
    
    carousels.forEach((carousel, index) => {
      // Skip if already initialized
      if (carousel.dataset.initialized === 'true') {
        return;
      }
      
      const images = carousel.querySelectorAll('.carousel-image');
      const leftNav = carousel.querySelector('.carousel-nav.left');
      const rightNav = carousel.querySelector('.carousel-nav.right');
      
      if (images.length === 0) {
        return;
      }
      
      let currentIndex = 0;
      
      // Find pagination dots for this carousel
      const paginationContainer = carousel.querySelector('.carousel-pagination');
      const paginationDots = paginationContainer ? paginationContainer.querySelectorAll('.carousel-dot') : [];
      
      function updateCarousel() {
        images.forEach((img, index) => {
          img.classList.toggle('active', index === currentIndex);
        });
        
        // Update pagination dots
        paginationDots.forEach((dot, index) => {
          dot.classList.toggle('active', index === currentIndex);
        });
      }
      
      function nextImage() {
        currentIndex = (currentIndex + 1) % images.length;
        updateCarousel();
      }
      
      function prevImage() {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        updateCarousel();
      }
      
      // Add click handlers to navigation areas
      if (leftNav) {
        leftNav.addEventListener('click', prevImage);
      }
      
      if (rightNav) {
        rightNav.addEventListener('click', nextImage);
      }
      
      // Add click handlers directly to images as backup
      images.forEach(img => {
        img.addEventListener('click', (e) => {
          const rect = img.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const imageWidth = rect.width;
          
          if (clickX < imageWidth / 2) {
            prevImage();
          } else {
            nextImage();
          }
        });
        
        // Add mousemove handler to change cursor based on position
        img.addEventListener('mousemove', (e) => {
          const rect = img.getBoundingClientRect();
          const mouseX = e.clientX - rect.left;
          const imageWidth = rect.width;
          
          if (mouseX < imageWidth / 2) {
            img.style.cursor = 'w-resize';
          } else {
            img.style.cursor = 'e-resize';
          }
        });
        
        // Reset cursor when mouse leaves
        img.addEventListener('mouseleave', () => {
          img.style.cursor = 'pointer';
        });
      });
      
      // Add click handlers to pagination dots
      paginationDots.forEach((dot, index) => {
        dot.addEventListener('click', () => {
          currentIndex = index;
          updateCarousel();
        });
      });
      
      // Initialize first image as active
      updateCarousel();
      
      // Mark as initialized
      carousel.dataset.initialized = 'true';
    });
  }
  
  // Initialize image carousels with multiple timing strategies
  initImageCarousels();

  // ================================
  // CHESSMONO COLOR PICKER
  // ================================

  function initChessmonoColorPickers() {
    const pickers = document.querySelectorAll('[data-chessmono-colors]');

    pickers.forEach((picker) => {
      if (picker.dataset.initialized === 'true') return;

      const device = picker.querySelector('.chessmono-device');
      const activeImage = picker.querySelector('.chessmono-active-image');
      const nextImage = picker.querySelector('.chessmono-next-image');
      const swatches = Array.from(picker.querySelectorAll('.chessmono-swatch'));

      if (!device || !activeImage || !nextImage || swatches.length === 0) return;

      let currentIndex = Math.max(0, swatches.findIndex((swatch) => swatch.getAttribute('aria-pressed') === 'true'));
      let isAnimating = false;

      const setPressed = (nextIndex) => {
        swatches.forEach((swatch, index) => {
          swatch.setAttribute('aria-pressed', String(index === nextIndex));
        });
      };

      const finishTransition = (nextIndex, nextSrc, nextAlt) => {
        activeImage.src = nextSrc;
        activeImage.alt = nextAlt;
        device.classList.remove('is-animating');
        nextImage.removeAttribute('src');
        currentIndex = nextIndex;
        isAnimating = false;
        setPressed(nextIndex);
      };

      swatches.forEach((swatch, nextIndex) => {
        swatch.addEventListener('click', () => {
          const nextSrc = swatch.dataset.src;
          const nextAlt = swatch.dataset.alt || swatch.getAttribute('aria-label') || '';

          if (!nextSrc || nextIndex === currentIndex || isAnimating) return;

          isAnimating = true;
          setPressed(nextIndex);

          const direction = nextIndex > currentIndex ? 'forward' : 'backward';
          device.dataset.direction = direction;
          device.classList.remove('is-animating');

          nextImage.src = nextSrc;
          nextImage.alt = '';
          nextImage.setAttribute('aria-hidden', 'true');

          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              device.classList.add('is-animating');
            });
          });

          const onTransitionEnd = (event) => {
            if (event.target !== nextImage || event.propertyName !== 'clip-path') return;
            nextImage.removeEventListener('transitionend', onTransitionEnd);
            finishTransition(nextIndex, nextSrc, nextAlt);
          };

          nextImage.addEventListener('transitionend', onTransitionEnd);

          if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            finishTransition(nextIndex, nextSrc, nextAlt);
          }
        });
      });

      picker.dataset.initialized = 'true';
    });
  }

  initChessmonoColorPickers();

  function initChessmonoAppIconPickers() {
    const pickers = document.querySelectorAll('[data-chessmono-app-icon]');

    pickers.forEach((picker) => {
      if (picker.dataset.initialized === 'true') return;

      const icon = picker.querySelector('.chessmono-app-icon');
      const iconImage = icon ? icon.querySelector('img') : null;
      const pieceButtons = Array.from(picker.querySelectorAll('.chessmono-piece-button'));
      const colorButtons = Array.from(picker.querySelectorAll('.chessmono-app-color-picker .chessmono-swatch'));

      if (!icon || !iconImage) return;

      const setPressed = (buttons, selectedButton) => {
        buttons.forEach((button) => {
          button.setAttribute('aria-pressed', String(button === selectedButton));
        });
      };

      pieceButtons.forEach((button) => {
        button.addEventListener('click', () => {
          if (!button.dataset.src) return;
          iconImage.src = button.dataset.src;
          iconImage.alt = button.dataset.alt || button.getAttribute('aria-label') || '';
          setPressed(pieceButtons, button);
        });
      });

      colorButtons.forEach((button) => {
        button.addEventListener('click', () => {
          if (!button.dataset.bg) return;
          icon.style.setProperty('--app-icon-bg', button.dataset.bg);
          setPressed(colorButtons, button);
        });
      });

      picker.dataset.initialized = 'true';
    });
  }

  initChessmonoAppIconPickers();
  
  // Also initialize on window load as backup
  window.addEventListener('load', () => {
    setTimeout(() => {
      initImageCarousels();
      initChessmonoColorPickers();
      initChessmonoAppIconPickers();
    }, 500);
  });
  
  // Use MutationObserver to detect when carousel elements are added
  const observer = new MutationObserver((mutations) => {
    let shouldInitialize = false;
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          if (node.classList && node.classList.contains('image-carousel')) {
            shouldInitialize = true;
          } else if (node.querySelector && node.querySelector('.image-carousel')) {
            shouldInitialize = true;
          }
        }
      });
    });
    
    if (shouldInitialize) {
      setTimeout(() => {
        initImageCarousels();
      }, 100);
    }
  });
  
  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // Final backup - initialize after a longer delay
  setTimeout(() => {
    initImageCarousels();
  }, 2000);

  // ================================
  // EMBLA CAROUSEL INITIALIZATION
  // ================================

  if (typeof EmblaCarousel !== 'undefined') {

    // Helper: Attach grabbing cursor (with movement threshold)
    function attachDragCursor(emblaApi, targetEl) {
      if (!emblaApi || !targetEl) return;

      const DRAG_THRESHOLD = 6;
      let startX = 0;
      let startY = 0;
      let isGrabbing = false;
      let pointerActive = false;

      const setGrabbing = () => {
        if (isGrabbing) return;
        isGrabbing = true;
        targetEl.classList.add('is-grabbing');
      };

      const unsetGrabbing = () => {
        isGrabbing = false;
        pointerActive = false;
        targetEl.classList.remove('is-grabbing');
      };

      targetEl.addEventListener('pointerdown', (e) => {
        startX = e.clientX;
        startY = e.clientY;
        pointerActive = true;
        isGrabbing = false;
      });

      targetEl.addEventListener('pointermove', (e) => {
        if (!pointerActive || isGrabbing) return;
        const dx = Math.abs(e.clientX - startX);
        const dy = Math.abs(e.clientY - startY);
        if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
          setGrabbing();
        }
      });

      targetEl.addEventListener('pointerup', unsetGrabbing);
      targetEl.addEventListener('pointercancel', unsetGrabbing);
      emblaApi.on('pointerUp', unsetGrabbing);
      emblaApi.on('pointerLeave', unsetGrabbing);
    }

    // Helper: Fade in carousel once visible images/videos have loaded
    function fadeInWhenVisibleMediaLoaded(emblaApi, emblaNode) {
      const wrapper = emblaNode.querySelector('.wrapper');
      if (!wrapper) return;

      const addLoaded = () => {
        if (emblaNode.classList.contains('embla-loaded')) return;
        emblaNode.classList.add('embla-loaded');
      };

      const run = () => {
        const slides = Array.from(wrapper.children);
        const inView =
          (typeof emblaApi.slidesInView === 'function' && emblaApi.slidesInView()) ||
          (slides.length > 0 ? [0] : []);

        const media = [];
        inView.forEach((idx) => {
          const slide = slides[idx];
          if (!slide) return;
          media.push(...slide.querySelectorAll('img, video'));
        });

        if (media.length === 0) {
          addLoaded();
          return;
        }

        let pending = media.length;
        const check = () => {
          pending -= 1;
          if (pending <= 0) addLoaded();
        };

        media.forEach((el) => {
          if (el.tagName === 'IMG') {
            if (el.complete) check();
            else {
              el.addEventListener('load', check, { once: true });
              el.addEventListener('error', check, { once: true });
            }
          } else {
            if (el.readyState >= 2) check();
            else {
              el.addEventListener('loadeddata', check, { once: true });
              el.addEventListener('error', check, { once: true });
            }
          }
        });
      };

      emblaApi.on('init', run);
      run();
    }

    // Initialize a generic Embla carousel
    function initEmblaCarousel(emblaNode, options = {}, plugins = [], isAuto = false) {
      const wrapper = emblaNode.querySelector('.wrapper');
      if (!wrapper) return;

      const slides = Array.from(wrapper.children);
      const emblaApi = EmblaCarousel(emblaNode, options, plugins);

      attachDragCursor(emblaApi, wrapper);

      const setActiveSlide = () => {
        const selectedIndex = emblaApi.selectedScrollSnap();
        const total = slides.length;

        slides.forEach((slide, index) => {
          slide.classList.toggle('active', index === selectedIndex);
          const distance = Math.min(
            Math.abs(index - selectedIndex),
            total - Math.abs(index - selectedIndex)
          );
          slide.classList.toggle('is-non-interactive', distance >= 2);
        });
      };

      emblaApi.on('init', setActiveSlide);
      emblaApi.on('select', setActiveSlide);

      if (!isAuto) {
        slides.forEach((slide, index) => {
          slide.addEventListener('click', (e) => {
            if (e.target.closest('a, button')) return;
            emblaApi.stop();
            emblaApi.scrollTo(index, true);
          });
        });
      }

      fadeInWhenVisibleMediaLoaded(emblaApi, emblaNode);
    }

    // Auto-scrolling carousels (infinite loop + slow auto-scroll)
    document.querySelectorAll('.embla-auto').forEach((emblaNode) => {
      const plugins = [
        EmblaCarouselAutoScroll({
          speed: 0.9,
          startDelay: 0,
          stopOnInteraction: false,
          stopOnMouseEnter: true
        })
      ];

      if (typeof EmblaCarouselWheelGestures !== 'undefined') {
        plugins.push(
          EmblaCarouselWheelGestures({
            forceWheelAxis: 'x',
            wheelDraggingClass: 'is-wheel-dragging'
          })
        );
      }

      initEmblaCarousel(emblaNode, { loop: true, dragFree: true }, plugins, true);
    });

  }
});
