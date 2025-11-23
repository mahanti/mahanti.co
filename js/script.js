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
  
  // Also initialize on window load as backup
  window.addEventListener('load', () => {
    setTimeout(() => {
      initImageCarousels();
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
});
