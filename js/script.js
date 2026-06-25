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
      carouselContainer.dataset.wasDragging = 'false';
      startX = e.clientX;
      scrollLeft = carouselContainer.scrollLeft;
    });

    carouselContainer.addEventListener('mouseleave', (e) => {
      if (isDragging) {
        isDragging = false;
        if (hasMoved) carouselContainer.dataset.wasDragging = 'true';
        hasMoved = false;
        carouselContainer.classList.remove('dragging');
        carouselContainer.style.cursor = 'grab';
      }
    });

    carouselContainer.addEventListener('mouseup', (e) => {
      if (isDragging) {
        isDragging = false;
        if (hasMoved) {
          carouselContainer.dataset.wasDragging = 'true';
          window.setTimeout(() => {
            carouselContainer.dataset.wasDragging = 'false';
          }, 0);
        }
        hasMoved = false;
        carouselContainer.classList.remove('dragging');
        carouselContainer.style.cursor = 'grab';
      }
    });

    carouselContainer.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      // Only add dragging class and disable pointer events if mouse actually moved
      if (!hasMoved) {
        const moved = Math.abs(e.clientX - startX) > 8;
        if (moved) {
          hasMoved = true;
          carouselContainer.classList.add('dragging');
          carouselContainer.style.cursor = 'grabbing';
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
  // INLINE IMAGE ZOOM
  // ================================

  function initInlineImageZoom() {
    if (document.body.dataset.inlineZoomInitialized === 'true') return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contentRoot = document.querySelector('.spa-content-container') || document;
    const shouldZoomImage = (img) => {
      if (img.closest('.carousel, .chessmono-device, .chessmono-icon-card, .chessmono-app-icon, .chessmono-app-mark')) return false;
      if (img.closest('header, nav, footer, button, .site-logo, .chessmono-picker, .chessmono-app-controls')) return false;
      if (img.closest('a')) return false;
      return true;
    };
    const standaloneImages = Array.from(contentRoot.querySelectorAll('img'))
      .filter(shouldZoomImage);
    const carousels = Array.from(contentRoot.querySelectorAll('.carousel'))
      .filter((carousel) => carousel.querySelector('.carousel-container .carousel-scroll img'));
    const interactiveBlocks = Array.from(contentRoot.querySelectorAll('[data-zoomable]'))
      .filter((target) => target.tagName !== 'IMG' && !target.closest('.carousel'));
    const zoomTargets = [...standaloneImages, ...carousels, ...interactiveBlocks];

    if (zoomTargets.length === 0) return;

    let activeTarget = null;
    const dismissVisibleRatio = 0.35;
    const carouselZoomOptions = {
      type: 'tween',
      duration: 0.9,
      ease: [0.33, 0, 0.2, 1],
      easing: 'cubic-bezier(0.33, 0, 0.2, 1)'
    };
    document.body.dataset.inlineZoomEngine =
      window.Motion && typeof window.Motion.animate === 'function' ? 'motion' : 'waapi';

    const animateStyles = (target, keyframes, options = {}) => {
      if (!target) return null;

      if (reduceMotion.matches) {
        const finalStyles = keyframes[keyframes.length - 1] || {};
        Object.entries(finalStyles).forEach(([property, value]) => {
          target.style[property] = value;
        });
        return null;
      }

      if (window.Motion && typeof window.Motion.animate === 'function') {
        return window.Motion.animate(
          target,
          keyframes[keyframes.length - 1],
          { type: 'spring', stiffness: 260, damping: 30, mass: 0.8, ...options }
        );
      }

      return target.animate(
        keyframes,
        {
          duration: options.duration ? options.duration * 1000 : 360,
          easing: options.easing || 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'forwards'
        }
      );
    };

    const getZoomMetrics = (target) => {
      const rect = target.getBoundingClientRect();
      const styles = window.getComputedStyle(target);
      const marginLeft = parseFloat(styles.marginLeft) || 0;
      const marginRight = parseFloat(styles.marginRight) || 0;

      return {
        width: rect.width,
        height: rect.height,
        marginLeft,
        marginRight,
        expandedWidth: rect.width * 2,
        expandedHeight: rect.height * 2,
        expandedMarginLeft: marginLeft - (rect.width / 2),
        expandedMarginRight: marginRight - (rect.width / 2)
      };
    };

    const setImportantSize = (target, metrics) => {
      target.style.setProperty('width', `${metrics.width}px`, 'important');
      target.style.setProperty('max-width', 'none', 'important');
      target.style.marginLeft = `${metrics.marginLeft}px`;
      target.style.marginRight = `${metrics.marginRight}px`;
    };

    const animateCenteredBox = (target, metrics, expand) => {
      const from = expand ? {
        width: `${metrics.width}px`,
        marginLeft: `${metrics.marginLeft}px`,
        marginRight: `${metrics.marginRight}px`
      } : {
        width: target.style.width || `${metrics.expandedWidth}px`,
        marginLeft: target.style.marginLeft || `${metrics.expandedMarginLeft}px`,
        marginRight: target.style.marginRight || `${metrics.expandedMarginRight}px`
      };
      const to = expand ? {
        width: `${metrics.expandedWidth}px`,
        marginLeft: `${metrics.expandedMarginLeft}px`,
        marginRight: `${metrics.expandedMarginRight}px`
      } : {
        width: `${metrics.width}px`,
        marginLeft: `${metrics.marginLeft}px`,
        marginRight: `${metrics.marginRight}px`
      };

      animateStyles(target, [from, to]);
    };

    const ensureZoomContent = (target) => {
      let content = target.querySelector(':scope > .inline-zoom-content');
      if (content) return content;

      content = document.createElement('div');
      content.className = 'inline-zoom-content';
      while (target.firstChild) {
        content.appendChild(target.firstChild);
      }
      target.appendChild(content);
      return content;
    };

    const getCarouselZoomItems = (target) => Array.from(
      target.querySelectorAll('.carousel-slide')
    );

    const getCarouselZoomVisual = (item) => (
      item.querySelector('.chessmono-icon-card') ||
      item.querySelector('img') ||
      item
    );

    const setCarouselItemMetrics = (item) => {
      const visual = getCarouselZoomVisual(item);
      const itemRect = item.getBoundingClientRect();
      const visualRect = visual.getBoundingClientRect();

      item.dataset.inlineZoomBaseWidth = String(itemRect.width);
      item.dataset.inlineZoomBaseHeight = String(itemRect.height);
      visual.dataset.inlineZoomBaseWidth = String(visualRect.width);
      visual.dataset.inlineZoomBaseHeight = String(visualRect.height);

      item.style.width = `${itemRect.width}px`;
      item.style.height = `${itemRect.height}px`;
      visual.style.width = `${visualRect.width}px`;
      visual.style.height = `${visualRect.height}px`;

      return {
        item,
        visual,
        itemWidth: itemRect.width,
        itemHeight: itemRect.height,
        visualWidth: visualRect.width,
        visualHeight: visualRect.height
      };
    };

    const getCarouselClickAnchor = (target, event) => {
      const scroller = target.querySelector('.carousel-container');
      if (!scroller || !event) return null;

      const items = getCarouselZoomItems(target);
      if (items.length === 0) return null;

      const clickedItem = event.target.closest('.carousel-slide') || items.reduce((closest, item) => {
        const rect = item.getBoundingClientRect();
        const distance = Math.abs(event.clientX - (rect.left + rect.width / 2));
        return !closest || distance < closest.distance ? { item, distance } : closest;
      }, null).item;

      const scrollerRect = scroller.getBoundingClientRect();
      const itemRect = clickedItem.getBoundingClientRect();
      const ratio = itemRect.width > 0
        ? Math.max(0, Math.min(1, (event.clientX - itemRect.left) / itemRect.width))
        : 0.5;

      return {
        item: clickedItem,
        ratio,
        viewportOffset: event.clientX - scrollerRect.left
      };
    };

    const getRectUnion = (rects) => {
      if (rects.length === 0) return null;
      const left = Math.min(...rects.map((rect) => rect.left));
      const top = Math.min(...rects.map((rect) => rect.top));
      const right = Math.max(...rects.map((rect) => rect.right));
      const bottom = Math.max(...rects.map((rect) => rect.bottom));
      return {
        left,
        top,
        width: right - left,
        height: bottom - top
      };
    };

    const animateCarouselStripFlip = (target, beforeRects) => {
      if (reduceMotion.matches) return;

      const scrollTrack = target.querySelector('.carousel-scroll');
      const zoomItems = getCarouselZoomItems(target);
      const before = getRectUnion(beforeRects);
      const after = getRectUnion(zoomItems.map((item) => item.getBoundingClientRect()));
      if (!scrollTrack || !before || !after || after.width === 0 || after.height === 0) return;

      scrollTrack.getAnimations().forEach((animation) => animation.cancel());
      const deltaX = before.left - after.left;
      const deltaY = before.top - after.top;
      const scaleX = before.width / after.width;
      const scaleY = before.height / after.height;

      scrollTrack.style.transformOrigin = 'top left';
      scrollTrack.animate(
        [
          { transform: `translate(${deltaX}px, ${deltaY}px) scale(${scaleX}, ${scaleY})` },
          { transform: 'translate(0, 0) scale(1, 1)' }
        ],
        { duration: carouselZoomOptions.duration * 1000, easing: carouselZoomOptions.easing }
      );
    };

    const setCarouselTransitionMode = (target, enabled) => {
      const scroller = target.querySelector('.carousel-container');
      if (!scroller) return;

      if (enabled) {
        if (!Object.prototype.hasOwnProperty.call(scroller.dataset, 'inlineZoomScrollSnapType')) {
          scroller.dataset.inlineZoomScrollSnapType = scroller.style.scrollSnapType || '';
          scroller.dataset.inlineZoomScrollBehavior = scroller.style.scrollBehavior || '';
        }
        scroller.style.scrollSnapType = 'none';
        scroller.style.scrollBehavior = 'auto';
      } else {
        scroller.style.scrollSnapType = scroller.dataset.inlineZoomScrollSnapType || '';
        scroller.style.scrollBehavior = scroller.dataset.inlineZoomScrollBehavior || '';
        delete scroller.dataset.inlineZoomScrollSnapType;
        delete scroller.dataset.inlineZoomScrollBehavior;
      }
    };

    const expandCarouselMatched = (target, event) => {
      const scroller = target.querySelector('.carousel-container');
      const scrollTrack = target.querySelector('.carousel-scroll');
      const zoomItems = getCarouselZoomItems(target);
      const clickAnchor = getCarouselClickAnchor(target, event);
      const baseHeight = target.getBoundingClientRect().height;
      const baseGap = scrollTrack ? parseFloat(window.getComputedStyle(scrollTrack).gap) || 0 : 0;
      const beforeRects = zoomItems.map((item) => item.getBoundingClientRect());
      const metrics = zoomItems.map(setCarouselItemMetrics);
      const expandedHeight = baseHeight * 2;

      target.dataset.inlineZoomBaseHeight = String(baseHeight);
      target.dataset.inlineZoomBaseGap = String(baseGap);
      target.getAnimations().forEach((animation) => animation.cancel());
      target.style.height = `${baseHeight}px`;
      target.style.overflow = 'visible';
      setCarouselTransitionMode(target, true);

      if (scroller) {
        target.dataset.inlineZoomScrollLeft = String(scroller.scrollLeft);
        scroller.style.overflowY = 'visible';
      }

      if (scrollTrack) {
        scrollTrack.style.gap = `${baseGap * 2}px`;
      }

      metrics.forEach((metric) => {
        metric.item.style.width = `${metric.itemWidth * 2}px`;
        metric.item.style.height = `${metric.itemHeight * 2}px`;
        metric.visual.style.width = `${metric.visualWidth * 2}px`;
        metric.visual.style.height = `${metric.visualHeight * 2}px`;
      });

      if (scroller && clickAnchor) {
        const anchoredContentX = clickAnchor.item.offsetLeft + (clickAnchor.item.offsetWidth * clickAnchor.ratio);
        scroller.scrollLeft = anchoredContentX - clickAnchor.viewportOffset;
      }

      animateCarouselStripFlip(target, beforeRects);
      animateStyles(target, [
        { height: `${baseHeight}px` },
        { height: `${expandedHeight}px` }
      ], carouselZoomOptions);
    };

    const collapseCarouselMatched = (target) => {
      const scroller = target.querySelector('.carousel-container');
      const scrollTrack = target.querySelector('.carousel-scroll');
      const zoomItems = getCarouselZoomItems(target);
      const beforeRects = zoomItems.map((item) => item.getBoundingClientRect());
      const baseHeight = Number(target.dataset.inlineZoomBaseHeight) || target.getBoundingClientRect().height / 2;
      const baseGap = Number(target.dataset.inlineZoomBaseGap) || 0;
      const expandedHeight = target.getBoundingClientRect().height;

      target.getAnimations().forEach((animation) => animation.cancel());
      target.style.height = `${expandedHeight}px`;
      setCarouselTransitionMode(target, true);

      if (scrollTrack) {
        scrollTrack.style.gap = `${baseGap}px`;
      }

      zoomItems.forEach((item) => {
        const visual = getCarouselZoomVisual(item);
        const itemWidth = Number(item.dataset.inlineZoomBaseWidth) || item.getBoundingClientRect().width / 2;
        const itemHeight = Number(item.dataset.inlineZoomBaseHeight) || item.getBoundingClientRect().height / 2;
        const visualWidth = Number(visual.dataset.inlineZoomBaseWidth) || visual.getBoundingClientRect().width / 2;
        const visualHeight = Number(visual.dataset.inlineZoomBaseHeight) || visual.getBoundingClientRect().height / 2;

        item.style.width = `${itemWidth}px`;
        item.style.height = `${itemHeight}px`;
        visual.style.width = `${visualWidth}px`;
        visual.style.height = `${visualHeight}px`;
      });

      if (scroller) {
        scroller.scrollLeft = Number(target.dataset.inlineZoomScrollLeft) || scroller.scrollLeft;
      }

      animateCarouselStripFlip(target, beforeRects);
      animateStyles(target, [
        { height: `${expandedHeight}px` },
        { height: `${baseHeight}px` }
      ], carouselZoomOptions);
    };

    const getBlockZoomVisual = (target) => (
      target.querySelector('.chessmono-device') ||
      target.querySelector('.chessmono-app-icon') ||
      target.querySelector(':scope > .inline-zoom-content')
    );

    const collapseTarget = (target) => {
      if (!target) return;
      target.classList.remove('inline-zoom-active');

      if (target.classList.contains('inline-zoom-carousel')) {
        collapseCarouselMatched(target);
      } else if (target.classList.contains('inline-zoom-block')) {
        const visual = getBlockZoomVisual(target);
        const baseWidth = Number(target.dataset.inlineZoomBaseWidth);
        const baseHeight = Number(target.dataset.inlineZoomBaseHeight);
        const baseMarginLeft = Number(target.dataset.inlineZoomBaseMarginLeft);
        const baseMarginRight = Number(target.dataset.inlineZoomBaseMarginRight);
        const metrics = {
          width: baseWidth,
          height: baseHeight,
          marginLeft: baseMarginLeft,
          marginRight: baseMarginRight,
          expandedWidth: Number(target.dataset.inlineZoomExpandedWidth),
          expandedHeight: Number(target.dataset.inlineZoomExpandedHeight),
          expandedMarginLeft: Number(target.dataset.inlineZoomExpandedMarginLeft),
          expandedMarginRight: Number(target.dataset.inlineZoomExpandedMarginRight)
        };
        if (visual) {
          animateStyles(visual, [
            { transform: visual.style.transform || 'scale(2)' },
            { transform: 'scale(1)' }
          ]);
        }
        animateCenteredBox(target, metrics, false);
        animateStyles(target, [
          { height: target.style.height || `${target.getBoundingClientRect().height}px` },
          { height: `${baseHeight}px` }
        ]);
      } else {
        const baseWidth = Number(target.dataset.inlineZoomBaseWidth);
        const baseMarginLeft = Number(target.dataset.inlineZoomBaseMarginLeft);
        const baseMarginRight = Number(target.dataset.inlineZoomBaseMarginRight);
        const metrics = {
          width: baseWidth,
          height: Number(target.dataset.inlineZoomBaseHeight),
          marginLeft: baseMarginLeft,
          marginRight: baseMarginRight,
          expandedWidth: Number(target.dataset.inlineZoomExpandedWidth),
          expandedHeight: Number(target.dataset.inlineZoomExpandedHeight),
          expandedMarginLeft: Number(target.dataset.inlineZoomExpandedMarginLeft),
          expandedMarginRight: Number(target.dataset.inlineZoomExpandedMarginRight)
        };
        animateCenteredBox(target, metrics, false);
      }

      if (activeTarget === target) activeTarget = null;
      window.setTimeout(() => {
        if (!target.classList.contains('inline-zoom-active')) {
          target.style.zIndex = '';
          target.style.transform = '';
          target.style.position = '';
          if (target.classList.contains('inline-zoom-carousel')) {
            const scroller = target.querySelector('.carousel-container');
            const scrollTrack = target.querySelector('.carousel-scroll');
            const zoomItems = getCarouselZoomItems(target);
            setCarouselTransitionMode(target, false);
            target.style.height = '';
            target.style.overflow = '';
            if (scroller) {
              scroller.scrollLeft = Number(target.dataset.inlineZoomScrollLeft) || scroller.scrollLeft;
              scroller.style.transform = '';
              scroller.style.transformOrigin = '';
              scroller.style.overflowY = '';
            }
            if (scrollTrack) {
              scrollTrack.style.gap = '';
              scrollTrack.style.transform = '';
              scrollTrack.style.transformOrigin = '';
            }
            zoomItems.forEach((item) => {
              const visual = getCarouselZoomVisual(item);
              item.style.width = '';
              item.style.height = '';
              item.style.transform = '';
              item.style.transformOrigin = '';
              visual.style.width = '';
              visual.style.height = '';
              visual.style.transform = '';
              visual.style.transformOrigin = '';
            });
          } else if (target.classList.contains('inline-zoom-block')) {
            const visual = getBlockZoomVisual(target);
            target.style.height = '';
            target.style.overflow = '';
            target.style.removeProperty('width');
            target.style.removeProperty('max-width');
            target.style.marginLeft = '';
            target.style.marginRight = '';
            if (visual) {
              visual.style.transform = '';
              visual.style.transformOrigin = '';
            }
          } else {
            target.style.removeProperty('width');
            target.style.removeProperty('max-width');
            target.style.marginLeft = '';
            target.style.marginRight = '';
          }
        }
      }, reduceMotion.matches ? 0 : 1000);
    };

    const expandTarget = (target, event) => {
      if (activeTarget && activeTarget !== target) collapseTarget(activeTarget);
      activeTarget = target;
      target.classList.add('inline-zoom-active');
      target.style.position = 'relative';
      target.style.zIndex = '20';

      if (target.classList.contains('inline-zoom-carousel')) {
        expandCarouselMatched(target, event);
      } else if (target.classList.contains('inline-zoom-block')) {
        const content = ensureZoomContent(target);
        const visual = getBlockZoomVisual(target);
        const metrics = getZoomMetrics(target);
        target.dataset.inlineZoomBaseWidth = String(metrics.width);
        target.dataset.inlineZoomBaseHeight = String(metrics.height);
        target.dataset.inlineZoomBaseMarginLeft = String(metrics.marginLeft);
        target.dataset.inlineZoomBaseMarginRight = String(metrics.marginRight);
        target.dataset.inlineZoomExpandedWidth = String(metrics.expandedWidth);
        target.dataset.inlineZoomExpandedHeight = String(metrics.expandedHeight);
        target.dataset.inlineZoomExpandedMarginLeft = String(metrics.expandedMarginLeft);
        target.dataset.inlineZoomExpandedMarginRight = String(metrics.expandedMarginRight);
        setImportantSize(target, metrics);
        target.style.height = `${metrics.height}px`;
        target.style.overflow = 'visible';
        if (visual) {
          visual.style.transformOrigin = 'center center';
        }
        animateCenteredBox(target, metrics, true);
        animateStyles(target, [
          { height: `${metrics.height}px` },
          { height: `${metrics.expandedHeight}px` }
        ]);
        if (visual) {
          animateStyles(visual, [
            { transform: visual.style.transform || 'scale(1)' },
            { transform: 'scale(2)' }
          ]);
        }
      } else {
        const metrics = getZoomMetrics(target);
        target.dataset.inlineZoomBaseWidth = String(metrics.width);
        target.dataset.inlineZoomBaseHeight = String(metrics.height);
        target.dataset.inlineZoomBaseMarginLeft = String(metrics.marginLeft);
        target.dataset.inlineZoomBaseMarginRight = String(metrics.marginRight);
        target.dataset.inlineZoomExpandedWidth = String(metrics.expandedWidth);
        target.dataset.inlineZoomExpandedHeight = String(metrics.expandedHeight);
        target.dataset.inlineZoomExpandedMarginLeft = String(metrics.expandedMarginLeft);
        target.dataset.inlineZoomExpandedMarginRight = String(metrics.expandedMarginRight);
        target.style.display = 'block';
        setImportantSize(target, metrics);
        animateCenteredBox(target, metrics, true);
      }
    };

    zoomTargets.forEach((target) => {
      target.classList.add('inline-zoom-target');
      if (target.tagName === 'IMG') {
        target.classList.add('inline-zoom-image');
      } else if (target.classList.contains('carousel')) {
        target.classList.add('inline-zoom-carousel');
      } else {
        target.classList.add('inline-zoom-block');
      }
      target.addEventListener('click', (event) => {
        if (event.defaultPrevented) return;
        if (event.target.closest('button, a')) return;
        const carouselScroller = target.classList.contains('inline-zoom-carousel')
          ? target.querySelector('.carousel-container')
          : null;
        if (carouselScroller && carouselScroller.dataset.wasDragging === 'true') return;
        if (target.classList.contains('inline-zoom-active')) {
          collapseTarget(target);
        } else {
          expandTarget(target, event);
        }
      });
    });

    let scrollFrame = 0;
    const shouldCollapseForViewport = (target) => {
      const rect = target.getBoundingClientRect();
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
      const measurableWidth = Math.min(rect.width, viewportWidth);
      const measurableHeight = Math.min(rect.height, viewportHeight);
      if (measurableWidth <= 0 || measurableHeight <= 0) return true;

      const visibleWidth = Math.max(
        0,
        Math.min(rect.right, viewportWidth) - Math.max(rect.left, 0)
      );
      const visibleHeight = Math.max(
        0,
        Math.min(rect.bottom, viewportHeight) - Math.max(rect.top, 0)
      );
      return (
        visibleWidth / measurableWidth <= dismissVisibleRatio ||
        visibleHeight / measurableHeight <= dismissVisibleRatio
      );
    };

    const handleInlineZoomScroll = () => {
      if (!activeTarget || scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = 0;
        if (!activeTarget) return;
        if (shouldCollapseForViewport(activeTarget)) {
          collapseTarget(activeTarget);
        }
      });
    };

    const scrollTargets = new Set([
      window,
      document.body,
      document.scrollingElement,
      ...document.querySelectorAll('[data-inline-zoom-scroll-container]')
    ].filter(Boolean));
    scrollTargets.forEach((target) => {
      target.addEventListener('scroll', handleInlineZoomScroll, { passive: true });
    });

    document.body.dataset.inlineZoomInitialized = 'true';
  }

  initInlineImageZoom();

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
