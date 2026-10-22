(() => {
  const sidebar = document.getElementById("sidebar");
  const menuToggle = document.getElementById("menu-toggle");
  const backdrop = document.getElementById("drawer-backdrop");

  const setMenuOpen = (open) => {
    if (!sidebar || !menuToggle || !backdrop) return;
    sidebar.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    backdrop.hidden = !open;
    document.body.style.overflow = open ? "hidden" : "";
  };

  menuToggle?.addEventListener("click", () => {
    setMenuOpen(!sidebar.classList.contains("is-open"));
  });
  backdrop?.addEventListener("click", () => setMenuOpen(false));

  sidebar?.querySelectorAll("a[href^='#']").forEach((link) => {
    link.addEventListener("click", () => setMenuOpen(false));
  });

  document.querySelectorAll(".read-more").forEach((readMore) => {
    const toggle = readMore.querySelector(".read-more__toggle");
    const body = readMore.querySelector(".read-more__body");
    if (!toggle || !body) return;

    const collapsedHeight = Number(readMore.dataset.collapsedHeight || 260);
    body.style.maxHeight = `${collapsedHeight}px`;

    toggle.addEventListener("click", () => {
      const expanded = !readMore.classList.contains("is-expanded");
      readMore.classList.toggle("is-expanded", expanded);
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.textContent = expanded ? "Свернуть" : "Читать далее";

      if (expanded) {
        body.style.maxHeight = "none";
        return;
      }

      body.style.maxHeight = `${collapsedHeight}px`;
      const top = readMore.getBoundingClientRect().top + window.scrollY - 80;
      if (window.scrollY > top) {
        window.scrollTo({ top, behavior: "smooth" });
      }
    });
  });

  document.querySelectorAll(".findings-more").forEach((block) => {
    const toggle = block.querySelector(".findings-more__toggle");
    if (!toggle) return;

    toggle.addEventListener("click", () => {
      const expanded = !block.classList.contains("is-expanded");
      block.classList.toggle("is-expanded", expanded);
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.textContent = expanded ? "Свернуть" : "Читать далее";

      if (!expanded) {
        const top = block.getBoundingClientRect().top + window.scrollY - 80;
        if (window.scrollY > top) {
          window.scrollTo({ top, behavior: "smooth" });
        }
      }
    });
  });

  const navLinks = [...document.querySelectorAll('.sidebar__nav a[href^="#"]')];
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  const syncActive = () => {
    let current = sections[0];
    for (const section of sections) {
      if (section.getBoundingClientRect().top <= 120) current = section;
    }
    navLinks.forEach((link) => {
      link.classList.toggle(
        "is-active",
        link.getAttribute("href") === `#${current.id}`
      );
    });
  };

  window.addEventListener("scroll", syncActive, { passive: true });
  syncActive();

  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const lightboxClose = lightbox?.querySelector(".lightbox__close");

  const openLightbox = (src, caption) => {
    if (!lightbox || !lightboxImage || !lightboxCaption) return;
    lightboxImage.src = src;
    lightboxImage.alt = caption || "Увеличенный скриншот проблемы";
    lightboxCaption.textContent = caption || "";
    if (typeof lightbox.showModal === "function") {
      lightbox.showModal();
    } else {
      lightbox.setAttribute("open", "");
    }
  };

  const closeLightbox = () => {
    if (!lightbox) return;
    if (typeof lightbox.close === "function") {
      lightbox.close();
    } else {
      lightbox.removeAttribute("open");
    }
    if (lightboxImage) lightboxImage.src = "";
  };

  document.querySelectorAll("[data-lightbox-src]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openLightbox(btn.dataset.lightboxSrc, btn.dataset.lightboxCaption || "");
    });
  });

  lightboxClose?.addEventListener("click", closeLightbox);
  lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && lightbox?.open) closeLightbox();
  });
})();
