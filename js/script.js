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

    // Keep the unzoomed geometry for the whole interaction, including reversals.
    const carouselStates = new WeakMap();

    const animateCarousel = (target, expand, event) => {
      const scroller = target.querySelector('.carousel-container');
      const track = target.querySelector('.carousel-scroll');
      if (!scroller || !track) return;
      let state = carouselStates.get(target);
      if (!state) {
        const items = getCarouselZoomItems(target);
        const elements = [...new Set([target, scroller, track,
          ...items.flatMap(item => [item, getCarouselZoomVisual(item)])])];
        state = {
          originals: elements.map(element => [element, element.getAttribute('style')]),
          metrics: items.map(item => {
            const visual = getCarouselZoomVisual(item);
            return { item, visual, width: item.offsetWidth, height: item.offsetHeight,
              visualWidth: visual.offsetWidth, visualHeight: visual.offsetHeight };
          }),
          gap: parseFloat(getComputedStyle(track).gap) || 0,
          scrollLeft: scroller.scrollLeft,
          scale: 1,
          frame: 0
        };
        carouselStates.set(target, state);
      }
      cancelAnimationFrame(state.frame);
      scroller.style.scrollSnapType = 'none';
      scroller.style.scrollBehavior = 'auto';
      const fromScale = state.scale;
      const fromScroll = scroller.scrollLeft;
      const toScale = expand ? 2 : 1;
      const clicked = event && event.target.closest('.carousel-slide');
      const anchor = clicked || state.metrics[0].item;
      const rect = anchor.getBoundingClientRect();
      const anchorX = event ? event.clientX : rect.left + rect.width / 2;
      const ratio = rect.width ? Math.max(0, Math.min(1, (anchorX - rect.left) / rect.width)) : 0.5;
      const start = performance.now();
      const duration = reduceMotion.matches ? 0 : 420;
      const tick = now => {
        const progress = duration ? Math.min(1, (now - start) / duration) : 1;
        const eased = 1 - Math.pow(1 - progress, 3);
        state.scale = fromScale + (toScale - fromScale) * eased;
        track.style.gap = `${state.gap * state.scale}px`;
        state.metrics.forEach(metric => {
          metric.item.style.width = `${metric.width * state.scale}px`;
          metric.item.style.height = `${metric.height * state.scale}px`;
          metric.visual.style.maxWidth = 'none';
          metric.visual.style.width = `${metric.visualWidth * state.scale}px`;
          metric.visual.style.height = `${metric.visualHeight * state.scale}px`;
        });
        if (expand) {
          const current = anchor.getBoundingClientRect();
          scroller.scrollLeft += current.left + current.width * ratio - anchorX;
        } else {
          scroller.scrollLeft = fromScroll + (state.scrollLeft - fromScroll) * eased;
        }
        if (progress < 1) {
          state.frame = requestAnimationFrame(tick);
        } else if (!expand) {
          state.originals.forEach(([element, style]) => {
            if (style === null) element.removeAttribute('style');
            else element.setAttribute('style', style);
          });
          // Restore zero too, before restoring the stylesheet's smooth scrolling.
          scroller.style.scrollBehavior = 'auto';
          scroller.scrollLeft = state.scrollLeft;
          scroller.style.scrollBehavior = '';
          target.style.zIndex = '';
          target.style.position = '';
          carouselStates.delete(target);
        }
      };
      tick(start);
    };

    const expandCarouselMatched = (target, event) => animateCarousel(target, true, event);
    const collapseCarouselMatched = target => animateCarousel(target, false);

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
        if (activeTarget === target) activeTarget = null;
        return;
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
          if (target.classList.contains('inline-zoom-block')) {
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
          breakpoints: { '(prefers-reduced-motion: reduce)': { active: false } },
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
