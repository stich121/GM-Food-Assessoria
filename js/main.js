(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var pointerFine = window.matchMedia("(pointer: fine)").matches;
  var hasGSAP = typeof window.gsap !== "undefined";
  var hasScrollTrigger = hasGSAP && typeof window.ScrollTrigger !== "undefined";

  if (hasScrollTrigger) gsap.registerPlugin(ScrollTrigger);
  if (hasGSAP && !reducedMotion) document.documentElement.classList.add("gsap-driven");

  /* -----------------------------------------------------------
     Legal gate
  ----------------------------------------------------------- */
  function legalGate() {
    var gate = document.getElementById("legal-gate");
    var acceptButton = document.getElementById("accept-legal");
    var key = "gmfood_legal_acceptance_v1";
    if (!gate || !acceptButton) return;

    function unlockPage() {
      gate.hidden = true;
      document.body.classList.remove("legal-locked");
    }

    try {
      if (window.localStorage.getItem(key)) {
        unlockPage();
        return;
      }
    } catch (err) {
      // If storage is blocked, keep the explicit accept flow for this session.
    }

    gate.hidden = false;
    document.body.classList.add("legal-locked");
    acceptButton.focus({ preventScroll: true });

    acceptButton.addEventListener("click", function () {
      try {
        window.localStorage.setItem(key, JSON.stringify({ acceptedAt: new Date().toISOString(), version: "2026-06-25" }));
      } catch (err) {}
      unlockPage();
    });
  }
  /* -----------------------------------------------------------
     Anchor navigation — native smooth scroll (html { scroll-behavior:
     smooth } in CSS handles the easing); just account for the fixed
     header height so the target isn't tucked underneath it.
  ----------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    var hash = link.getAttribute("href");
    if (!hash || hash.length < 2) return;
    link.addEventListener("click", function (e) {
      var target = document.querySelector(hash);
      if (!target) return;
      e.preventDefault();
      var headerOffset = 84;
      var top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
      window.scrollTo({ top: top, behavior: reducedMotion ? "auto" : "smooth" });
    });
  });

  /* -----------------------------------------------------------
     Sticky header
  ----------------------------------------------------------- */
  var header = document.getElementById("header");
  function onScrollHeader() {
    if (window.scrollY > 24) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
  }
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  /* -----------------------------------------------------------
     Mobile nav
  ----------------------------------------------------------- */
  var navToggle = document.getElementById("nav-toggle");
  var mobileNav = document.getElementById("mobile-nav");
  navToggle.addEventListener("click", function () {
    var isOpen = mobileNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
  });
  mobileNav.addEventListener("click", function (e) {
    if (e.target.tagName === "A") {
      mobileNav.classList.remove("is-open");
      navToggle.setAttribute("aria-expanded", "false");
    }
  });

  /* -----------------------------------------------------------
     Hero entrance — choreographed load-in (skipped under reduced motion;
     CSS already shows everything in its resting state by default)
  ----------------------------------------------------------- */
  function heroEntrance() {
    if (!hasGSAP || reducedMotion) return;
    gsap.timeline({ defaults: { ease: "power3.out" } })
      .from(".logo", { y: -14, opacity: 0, duration: 0.6 })
      .from(".main-nav li", { y: -10, opacity: 0, duration: 0.5, stagger: 0.05 }, "<0.05")
      .from(".header-actions .btn", { opacity: 0, duration: 0.5 }, "<")
      .from(".hero-title .line", { y: 36, opacity: 0, duration: 0.8, stagger: 0.12, ease: "expo.out" }, 0.1)
      .from(".hero-sub", { y: 20, opacity: 0, duration: 0.7 }, "-=0.45")
      .from(".hero-actions .btn", { y: 16, opacity: 0, duration: 0.6, stagger: 0.1 }, "-=0.4")
      .from(".hero-note", { opacity: 0, duration: 0.6 }, "-=0.3")
      .from(".phone-mock", { y: 50, opacity: 0, duration: 1, ease: "power4.out" }, 0.45)
      .from(".floating-pill", { scale: 0, opacity: 0, duration: 0.5, stagger: 0.15, ease: "back.out(2)" }, "-=0.35");
  }

  /* -----------------------------------------------------------
     Hero phone mockup — idle float + pointer tilt, both owned by
     GSAP on the same element so they compose into one transform
     instead of fighting a CSS keyframe.
  ----------------------------------------------------------- */
  var heroVisual = document.getElementById("hero-visual");
  var phoneMock = document.getElementById("phone-mock");

  function phoneMotion() {
    if (!hasGSAP || !heroVisual || !phoneMock) return;

    if (!reducedMotion) {
      gsap.to(phoneMock, { y: -12, duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1 });
    }

    if (!reducedMotion && pointerFine) {
      var rotX = gsap.quickTo(phoneMock, "rotationX", { duration: 0.6, ease: "power3.out" });
      var rotY = gsap.quickTo(phoneMock, "rotationY", { duration: 0.6, ease: "power3.out" });
      heroVisual.addEventListener("mousemove", function (e) {
        var rect = heroVisual.getBoundingClientRect();
        var x = (e.clientX - rect.left) / rect.width - 0.5;
        var y = (e.clientY - rect.top) / rect.height - 0.5;
        rotY(x * 14);
        rotX(-y * 14);
      });
      heroVisual.addEventListener("mouseleave", function () {
        rotX(0);
        rotY(0);
      });
    }
  }

  function phoneMotionFallback() {
    if (hasGSAP || !heroVisual || !phoneMock || reducedMotion || !pointerFine) return;
    heroVisual.addEventListener("mousemove", function (e) {
      var rect = heroVisual.getBoundingClientRect();
      var x = (e.clientX - rect.left) / rect.width - 0.5;
      var y = (e.clientY - rect.top) / rect.height - 0.5;
      phoneMock.style.transform = "rotateY(" + (x * 10).toFixed(2) + "deg) rotateX(" + (-y * 10).toFixed(2) + "deg)";
    });
    heroVisual.addEventListener("mouseleave", function () {
      phoneMock.style.transform = "rotateY(0deg) rotateX(0deg)";
    });
  }

  /* -----------------------------------------------------------
     Hero embers — subtle scroll parallax on the whole layer
     (the drift animation on individual embers stays in CSS;
     this owns the wrapper's transform, so no conflict).
  ----------------------------------------------------------- */
  function emberParallax() {
    if (!hasScrollTrigger || reducedMotion) return;
    document.querySelectorAll(".hero, .cta-final").forEach(function (section) {
      var bg = section.querySelector(".hero-bg");
      if (!bg) return;
      gsap.to(bg, {
        y: 80,
        ease: "none",
        scrollTrigger: { trigger: section, start: "top top", end: "bottom top", scrub: true },
      });
    });
  }

  /* -----------------------------------------------------------
     Magnetic primary buttons (desktop pointer only)
  ----------------------------------------------------------- */
  function magneticButtons() {
    if (!hasGSAP || reducedMotion || !pointerFine) return;
    document.querySelectorAll(".btn-primary, .header-cta").forEach(function (btn) {
      if (btn.closest(".legal-gate")) return;
      var xTo = gsap.quickTo(btn, "x", { duration: 0.35, ease: "power3.out" });
      var yTo = gsap.quickTo(btn, "y", { duration: 0.35, ease: "power3.out" });
      btn.addEventListener("mousemove", function (e) {
        var rect = btn.getBoundingClientRect();
        xTo((e.clientX - rect.left - rect.width / 2) * 0.28);
        yTo((e.clientY - rect.top - rect.height / 2) * 0.28);
      });
      btn.addEventListener("mouseleave", function () {
        xTo(0);
        yTo(0);
      });
    });
  }

  /* -----------------------------------------------------------
     Scroll reveals
     GSAP path: batch-animate every .reveal element, grouped by
     section, with a per-section motion style. Falls back to the
     plain IntersectionObserver + CSS-class approach when GSAP
     isn't available (offline, blocked CDN, etc).
  ----------------------------------------------------------- */
  function scrollRevealsGSAP() {
    if (!hasScrollTrigger) return;

    var motionBySection = {
      "recursos": { y: 30, scale: 0.97, stagger: 0.08 },
      "como-funciona": { y: 40, stagger: 0.14 },
      "demo": { y: 24, stagger: 0.06 },
      "planos": { y: 36, stagger: 0.1 },
      "validacao": { y: 24, stagger: 0.08 },
      "faq": { y: 18, stagger: 0.06 },
      "cta-final": { y: 20, stagger: 0.08 },
    };

    var groups = {};
    document.querySelectorAll(".reveal").forEach(function (el) {
      var section = el.closest("section");
      var key = section ? section.id || "default" : "default";
      groups[key] = groups[key] || [];
      groups[key].push(el);
    });

    Object.keys(groups).forEach(function (key) {
      var els = groups[key];
      var motion = motionBySection[key] || { y: 28, stagger: 0.08 };
      gsap.set(els, { y: motion.y, opacity: 0, scale: motion.scale || 1 });
      ScrollTrigger.batch(els, {
        start: "top 88%",
        once: true,
        onEnter: function (batch) {
          gsap.to(batch, {
            y: 0,
            opacity: 1,
            scale: 1,
            duration: 0.8,
            ease: "power3.out",
            stagger: motion.stagger,
            overwrite: true,
          });
        },
      });
    });
  }

  function scrollRevealsFallback() {
    if (hasScrollTrigger) return;

    var revealGroups = {};
    document.querySelectorAll(".reveal").forEach(function (el) {
      var parent = el.closest("section") || document.body;
      var key = parent.id || "default";
      revealGroups[key] = revealGroups[key] || [];
      revealGroups[key].push(el);
    });

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var el = entry.target;
            var group = revealGroups[(el.closest("section") || document.body).id || "default"] || [el];
            var index = group.indexOf(el);
            var delay = reducedMotion ? 0 : Math.min(index, 6) * 90;
            setTimeout(function () {
              el.classList.add("is-visible");
            }, delay);
            io.unobserve(el);
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
      document.querySelectorAll(".reveal").forEach(function (el) {
        io.observe(el);
      });
    } else {
      document.querySelectorAll(".reveal").forEach(function (el) {
        el.classList.add("is-visible");
      });
    }
  }

  /* -----------------------------------------------------------
     Showcase tabs (replays the sales-bar chart animation each time
     the "Painel" tab is opened, so it doesn't read as a one-shot)
  ----------------------------------------------------------- */
  var tabs = document.querySelectorAll(".showcase-tab");
  var bars = document.querySelectorAll(".painel-preview .bar");

  function playBars() {
    if (hasGSAP && !reducedMotion) {
      gsap.fromTo(
        bars,
        { scaleY: 0 },
        { scaleY: 1, duration: 0.7, ease: "power3.out", stagger: 0.06, transformOrigin: "bottom" }
      );
    } else {
      bars.forEach(function (bar) {
        bar.style.animation = "none";
        // eslint-disable-next-line no-unused-expressions
        bar.offsetHeight;
        bar.style.animation = "";
      });
    }
  }

  function activateShowcaseTab(tab) {
    tabs.forEach(function (t) {
      t.classList.remove("is-active");
      t.setAttribute("aria-selected", "false");
      t.setAttribute("tabindex", "-1");
    });
    tab.classList.add("is-active");
    tab.setAttribute("aria-selected", "true");
    tab.removeAttribute("tabindex");

    document.querySelectorAll(".showcase-panel").forEach(function (panel) {
      panel.hidden = panel.id !== tab.dataset.target;
    });

    if (tab.dataset.target === "tab-painel") playBars();
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () {
      activateShowcaseTab(tab);
    });
    tab.addEventListener("keydown", function (e) {
      var nextIndex = index;
      if (e.key === "ArrowRight") nextIndex = (index + 1) % tabs.length;
      else if (e.key === "ArrowLeft") nextIndex = (index - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") nextIndex = 0;
      else if (e.key === "End") nextIndex = tabs.length - 1;
      else return;
      e.preventDefault();
      tabs[nextIndex].focus();
      activateShowcaseTab(tabs[nextIndex]);
    });
  });

  /* -----------------------------------------------------------
     Pricing billing toggle — animated counting instead of an
     instant text swap.
  ----------------------------------------------------------- */
  var billingSwitch = document.getElementById("billing-switch");
  var billingLabels = document.querySelectorAll(".billing-label");
  var amountEls = document.querySelectorAll(".amount");

  function setBillingPeriod(isYearly) {
    billingSwitch.setAttribute("aria-checked", String(isYearly));
    billingLabels.forEach(function (label) {
      label.classList.toggle("is-active", (label.dataset.period === "anual") === isYearly);
    });

    amountEls.forEach(function (amountEl) {
      var target = Number(isYearly ? amountEl.dataset.yearly : amountEl.dataset.monthly);
      var current = Number(amountEl.textContent.replace(/\D/g, "")) || 0;

      if (hasGSAP && !reducedMotion) {
        gsap.to(
          { val: current },
          {
            val: target,
            duration: 0.5,
            ease: "power2.out",
            onUpdate: function () {
              amountEl.textContent = "R$ " + Math.round(this.targets()[0].val);
            },
          }
        );
      } else {
        amountEl.textContent = "R$ " + target;
      }
    });
  }

  if (billingSwitch) {
    billingSwitch.addEventListener("click", function () {
      setBillingPeriod(billingSwitch.getAttribute("aria-checked") !== "true");
    });
  }

  /* -----------------------------------------------------------
     Testimonial carousel
  ----------------------------------------------------------- */
  var carousel = document.getElementById("testimonial-carousel");
  if (carousel) {
    var slides = carousel.querySelectorAll(".testimonial");
    var dots = carousel.querySelectorAll(".dot");
    var current = 0;
    var autoplayId;

    function goTo(index) {
      var next = (index + slides.length) % slides.length;
      if (next === current) return;

      var outgoing = slides[current];
      var incoming = slides[next];
      dots[current].classList.remove("is-active");
      dots[current].setAttribute("aria-selected", "false");
      dots[next].classList.add("is-active");
      dots[next].setAttribute("aria-selected", "true");

      if (hasGSAP && !reducedMotion) {
        incoming.classList.add("is-active");
        gsap.fromTo(incoming, { opacity: 0, x: 24 }, { opacity: 1, x: 0, duration: 0.5, ease: "power3.out" });
        gsap.to(outgoing, {
          opacity: 0,
          x: -24,
          duration: 0.4,
          ease: "power3.out",
          onComplete: function () {
            outgoing.classList.remove("is-active");
            gsap.set(outgoing, { clearProps: "opacity,x" });
          },
        });
      } else {
        outgoing.classList.remove("is-active");
        incoming.classList.add("is-active");
      }
      current = next;
    }

    function startAutoplay() {
      stopAutoplay();
      if (reducedMotion) return;
      autoplayId = setInterval(function () {
        goTo(current + 1);
      }, 6000);
    }
    function stopAutoplay() {
      if (autoplayId) clearInterval(autoplayId);
    }

    dots.forEach(function (dot, i) {
      dot.addEventListener("click", function () {
        goTo(i);
        startAutoplay();
      });
    });
    carousel.addEventListener("mouseenter", stopAutoplay);
    carousel.addEventListener("mouseleave", startAutoplay);
    startAutoplay();
  }

  /* -----------------------------------------------------------
     FAQ accordion
  ----------------------------------------------------------- */
  document.querySelectorAll(".accordion-item").forEach(function (item) {
    var trigger = item.querySelector(".accordion-trigger");
    if (trigger.getAttribute("aria-expanded") === "true") {
      item.classList.add("is-open");
    }
    trigger.addEventListener("click", function () {
      var isOpen = item.classList.contains("is-open");
      item.classList.toggle("is-open", !isOpen);
      trigger.setAttribute("aria-expanded", String(!isOpen));
      if (hasScrollTrigger) ScrollTrigger.refresh();
    });
  });

  /* -----------------------------------------------------------
     Signup form (client-side only feedback)
  ----------------------------------------------------------- */
  var form = document.getElementById("signup-form");
  if (form) {
    var nameInput = document.getElementById("name");
    var businessInput = document.getElementById("business");
    var emailInput = document.getElementById("email");
    var feedback = document.getElementById("form-feedback");
    var whatsappNumber = "";

    function markInvalid(input, message) {
      input.classList.add("is-invalid");
      feedback.textContent = message;
      input.focus();
      setTimeout(function () {
        input.classList.remove("is-invalid");
      }, 450);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = nameInput.value.trim();
      var business = businessInput.value.trim();
      var email = emailInput.value.trim();
      var isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      if (name.length < 2) return markInvalid(nameInput, "Digite seu nome para continuar.");
      if (business.length < 2) return markInvalid(businessInput, "Digite o nome do negócio.");
      if (!isValidEmail) return markInvalid(emailInput, "Digite um e-mail válido para continuar.");

      var message = "Olá, quero um diagnóstico para cardápio digital.%0A" +
        "Nome: " + encodeURIComponent(name) + "%0A" +
        "Negócio: " + encodeURIComponent(business) + "%0A" +
        "E-mail: " + encodeURIComponent(email);
      var whatsappUrl = whatsappNumber ? "https://wa.me/" + whatsappNumber + "?text=" + message : "https://api.whatsapp.com/send?text=" + message;
      feedback.textContent = whatsappNumber ? "Abrindo WhatsApp para enviar seus dados de diagnóstico." : "Abrindo WhatsApp com a mensagem pronta. Configure o número oficial em js/main.js para enviar direto à GM Food.";
      window.open(whatsappUrl, "_blank", "noopener");
      form.reset();
    });
  }

  /* -----------------------------------------------------------
     Footer year
  ----------------------------------------------------------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* -----------------------------------------------------------
     Init
  ----------------------------------------------------------- */
  legalGate();
  heroEntrance();
  phoneMotion();
  phoneMotionFallback();
  emberParallax();
  magneticButtons();
  scrollRevealsGSAP();
  scrollRevealsFallback();
})();
