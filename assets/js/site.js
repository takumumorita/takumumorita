(function () {
  const DATA = window.SITE_DATA || {};
  const CONTACT_FORM_URL = DATA.contactFormUrl || "";
  const state = {
    lang: "ja",
    filter: "all",
    carouselIndex: 0,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const body = document.body;
  const assetPrefix = body.dataset.assetPrefix || "";

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function t(value, fallback = "") {
    if (!value || typeof value !== "object") return fallback;
    return value[state.lang] || value.en || value.ja || fallback;
  }

  function pageUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//.test(path)) return path;
    return assetPrefix + path;
  }

  function assetUrl(path) {
    if (!path) return "";
    if (/^https?:\/\//.test(path) || path.startsWith("/")) return path;
    return assetPrefix + path;
  }

  function works() {
    return (DATA.works || []).slice();
  }

  function selectedWorks() {
    return works()
      .filter((work) => work.selectedListening && work.image?.src && (work.audio?.url || work.video?.url))
      .sort((a, b) => (a.selectedOrder || 999) - (b.selectedOrder || 999))
      .slice(0, 5);
  }

  function homeFeaturedWorks() {
    const priority = ["hikari-to-kumo", "manekko", "defocusing-ii", "suisho", "zapping-shower", "cutting"];
    const byId = new Map(works().map((work) => [work.id, work]));
    return priority
      .map((id) => byId.get(id))
      .filter((work) => work && work.hasDetail && work.image?.src)
      .slice(0, 6);
  }

  function ui(ja, en) {
    return state.lang === "ja" ? ja : en;
  }

  function categoryLabel(work) {
    return t(work.archiveCategoryName, work.archiveCategoryLabel || "");
  }

  function selectedCategoryLabel(work) {
    return state.lang === "ja" ? categoryLabel(work) : (work.selectedCategory || categoryLabel(work));
  }

  function statusBadge(label, extraClass = "") {
    return `<span class="status-badge ${extraClass}">${escapeHtml(label)}</span>`;
  }

  function workBadges(work) {
    const badges = [];
    if (work.audio?.url) badges.push(statusBadge("Audio", "badge-audio"));
    if (work.video?.url) badges.push(statusBadge("Video", "badge-video"));
    if (work.score?.pages?.length) badges.push(statusBadge("Score", "badge-score"));
    const award = t(work.award);
    if (award) badges.push(statusBadge(award, "badge-award"));
    return badges.join("");
  }

  function availabilityBadges(work) {
    const badges = [];
    if (work.audio?.url) badges.push(statusBadge("Audio", "badge-audio"));
    if (work.video?.url) badges.push(statusBadge("Video", "badge-video"));
    if (work.score?.pages?.length) badges.push(statusBadge("Score", "badge-score"));
    return badges.length ? badges.join("") : statusBadge(ui("資料準備中", "In preparation"), "badge-muted");
  }

  function plainText(value) {
    return String(value || "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function excerpt(value, maxLength = 150) {
    const text = plainText(value);
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1).trim()}…`;
  }

  function workSummary(work, maxLength = 150) {
    return excerpt(t(work.shortNote) || t(work.note), maxLength);
  }

  function absoluteImageUrl(work) {
    if (!work.image?.src) return "";
    return new URL(assetUrl(work.image.src), window.location.href).href;
  }

  function workTone(work) {
    const source = work.slug || work.id || "";
    const sum = source.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return `tone-${(sum % 6) + 1}`;
  }

  function graphic(work) {
    return `<div class="work-graphic ${workTone(work)}" aria-hidden="true"><span></span></div>`;
  }

  function imageSizeAttrs(image) {
    const width = image?.width ? ` width="${escapeHtml(image.width)}"` : "";
    const height = image?.height ? ` height="${escapeHtml(image.height)}"` : "";
    return `${width}${height}`;
  }

  function workImage(work, className = "", loading = "lazy") {
    const image = work.image || {};
    if (!image.src) {
      return `<figure class="work-image-frame ${className} work-image-fallback">${graphic(work)}</figure>`;
    }
    return `<figure class="work-image-frame ${className}" data-protected-image>
      <img class="work-image" src="${escapeHtml(assetUrl(image.src))}" alt="${escapeHtml(image.alt || `${t(work.title)} の抽象グラフィック`)}"${imageSizeAttrs(image)} loading="${loading}" decoding="async" draggable="false">
    </figure>`;
  }

  function dateOrYear(work) {
    if (work.unpremiered) return state.lang === "ja" ? "未初演" : "Not yet premiered";
    return work.premiere?.date && work.premiere.date !== "—" ? work.premiere.date : work.year;
  }

  function mediaEmbed(work) {
    const audio = work.audio || {};
    const video = work.video || {};
    if (audio.type === "soundcloud" && audio.embedUrl) {
      return `<div class="media-frame media-frame-audio"><iframe title="${escapeHtml(t(work.title))} audio" scrolling="no" allow="autoplay" src="${escapeHtml(audio.embedUrl)}"></iframe></div>`;
    }
    if ((audio.type === "youtube" || video.embedUrl) && video.embedUrl) {
      return `<div class="media-frame media-frame-video"><iframe title="${escapeHtml(t(work.title))} video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen src="${escapeHtml(video.embedUrl)}"></iframe></div>`;
    }
    if (audio.type === "file" && audio.url) {
      return `<div class="media-frame"><audio controls preload="none" src="${escapeHtml(assetUrl(audio.url))}"></audio></div>`;
    }
    return `<p class="activity-body">${state.lang === "ja" ? "公開音源は準備中です。" : "Public audio is not currently available."}</p>`;
  }

  function scoreViewerMarkup(work) {
    const pages = work.score?.pages || [];
    if (!pages.length) return "";
    const thumbs = pages.map((page, index) => {
      const alt = scoreAlt(work, index);
      return `<button class="score-thumb" type="button" data-score-thumb="${index}" data-src="${escapeHtml(assetUrl(page))}" data-alt="${escapeHtml(alt)}" aria-label="${escapeHtml(ui(`スコア ${index + 1}ページ目を表示`, `Show score page ${index + 1}`))}">
        <img src="${escapeHtml(assetUrl(page))}" alt="" loading="lazy" decoding="async" draggable="false">
      </button>`;
    }).join("");
    return `<section class="detail-section score-section" id="score-preview">
        <h2>${ui("スコア試し読み", "Score Preview")}</h2>
        <div class="score-viewer" data-score-viewer data-score-protected tabindex="0" aria-label="${escapeHtml(ui("スコア試し読みビューア", "Score preview viewer"))}">
          <div class="score-toolbar">
            <p class="score-count"><span data-score-current>1</span> / ${pages.length}</p>
            <div class="score-toolbar-actions">
              <button class="score-action-button" type="button" data-score-fullscreen aria-expanded="false">${ui("全画面", "Fullscreen")}</button>
              <button class="score-action-button score-close-button" type="button" data-score-close>${ui("閉じる", "Close")}</button>
            </div>
          </div>
          <div class="score-stage">
            <button class="score-nav-button score-prev" type="button" data-score-prev aria-label="${ui("前のページ", "Previous page")}">‹</button>
            <figure class="score-preview">
              <img class="score-stage-image" data-score-main src="${escapeHtml(assetUrl(pages[0]))}" alt="${escapeHtml(scoreAlt(work, 0))}" loading="lazy" decoding="async" draggable="false">
            </figure>
            <button class="score-nav-button score-next" type="button" data-score-next aria-label="${ui("次のページ", "Next page")}">›</button>
          </div>
          <div class="score-footer">
            <div class="score-thumbs" aria-label="${ui("スコアページ", "Score pages")}">${thumbs}</div>
          </div>
        </div>
      </section>`;
  }

  function initLanguage() {
    let stored = "ja";
    try {
      stored = localStorage.getItem("takumu-morita-lang") || "ja";
    } catch (error) {
      stored = "ja";
    }
    setLang(stored === "en" ? "en" : "ja", false);
    $$("[data-lang-button]").forEach((button) => {
      button.addEventListener("click", () => setLang(button.dataset.langButton));
    });
  }

  function setLang(lang, persist = true) {
    state.lang = lang === "en" ? "en" : "ja";
    body.classList.toggle("lang-ja", state.lang === "ja");
    body.classList.toggle("lang-en", state.lang === "en");
    document.documentElement.lang = state.lang;
    $$("[data-lang-button]").forEach((button) => {
      const pressed = button.dataset.langButton === state.lang;
      button.setAttribute("aria-pressed", String(pressed));
    });
    if (persist) {
      try {
        localStorage.setItem("takumu-morita-lang", state.lang);
      } catch (error) {
        /* localStorage can be unavailable in strict private modes. */
      }
    }
    renderPage();
  }

  function initMenu() {
    const toggle = $("[data-menu-toggle]");
    const nav = $("#site-navigation");
    if (!toggle || !nav) return;
    toggle.addEventListener("click", () => {
      const open = !body.classList.contains("menu-open");
      body.classList.toggle("menu-open", open);
      toggle.setAttribute("aria-expanded", String(open));
    });
    $$("a", nav).forEach((link) => {
      link.addEventListener("click", () => {
        body.classList.remove("menu-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  function renderCurrent() {
    const root = $('[data-render="current"]');
    const section = $('[data-section="current"]');
    if (!root) return;
    const activeNow = (DATA.now || []).filter((item) => item.active);
    const concertItems = (DATA.concerts || []).slice(0, 3);
    const items = concertItems.concat(activeNow).slice(0, 3);
    if (!items.length) {
      if (section) section.hidden = true;
      return;
    }
    if (section) section.hidden = false;
    root.innerHTML = `<div class="current-list">${items.map((item) => {
      const date = item.date ? t(item.date) : (state.lang === "ja" ? "制作中" : "In progress");
      const title = item.title ? t(item.title) : "";
      const venue = item.venue ? t(item.venue) : "";
      const bodyText = item.body ? t(item.body) : "";
      return `<article class="current-item">
        <div class="current-date">${escapeHtml(date)}</div>
        <div class="current-copy">
          ${title ? `<h3 class="current-title">${escapeHtml(title)}</h3>` : ""}
          ${venue ? `<p class="current-venue">${escapeHtml(venue)}</p>` : ""}
          ${bodyText ? `<div class="current-body">${bodyText}</div>` : ""}
        </div>
      </article>`;
    }).join("")}</div>`;
  }

  const HERO_SLIDE_INTERVAL = 7000;
  const HERO_FADE_DURATION = 3000;
  const heroSlideshowState = { shuffled: null, current: 0, slides: null, timer: null };

  function renderHeroArt() {
    const root = $('[data-render="hero-art"]');
    if (!root) return;
    if (root.dataset.rendered !== "true") {
      const imageWorks = works().filter((work) => work.image?.src);
      if (!imageWorks.length) {
        root.innerHTML = `<div class="brand-graphic" aria-hidden="true">
          <span class="veil-plane veil-a"></span>
          <span class="veil-plane veil-b"></span>
          <span class="veil-plane veil-c"></span>
          <span class="veil-line"></span>
        </div>`;
        root.dataset.rendered = "true";
        return;
      }
      heroSlideshowState.shuffled = imageWorks
        .map((work) => ({ work, rank: Math.random() }))
        .sort((a, b) => a.rank - b.rank)
        .map((item) => item.work);
      const shuffled = heroSlideshowState.shuffled;
      root.innerHTML = `<div class="hero-slideshow hero-atmosphere" data-hero-slideshow>
        ${shuffled.map((work, index) => `<figure class="hero-slide${index === 0 ? " is-active" : ""}" data-hero-slide="${index}" data-protected-image aria-hidden="${index === 0 ? "false" : "true"}">
          <img src="${escapeHtml(assetUrl(work.image.src))}" alt="${escapeHtml(work.image.alt)}"${imageSizeAttrs(work.image)} loading="${index === 0 ? "eager" : "lazy"}" decoding="async" draggable="false">
        </figure>`).join("")}
        <div class="hero-slide-caption" data-hero-caption aria-hidden="true"></div>
      </div>`;
      heroSlideshowState.slides = $$(".hero-slide", root);
      heroSlideshowState.current = 0;
      $$("img", root).forEach((img) => {
        const preload = new Image();
        preload.src = img.currentSrc || img.src;
      });
      if (heroSlideshowState.slides.length > 1 && !heroSlideshowState.timer) {
        heroSlideshowState.timer = window.setInterval(() => {
          const slides = heroSlideshowState.slides || [];
          if (slides.length < 2) return;
          const prev = heroSlideshowState.current;
          let next = Math.floor(Math.random() * slides.length);
          if (next === prev) next = (next + 1) % slides.length;
          const previousSlide = slides[prev];
          const nextSlide = slides[next];
          previousSlide?.classList.add("is-exiting");
          previousSlide?.classList.remove("is-active");
          previousSlide?.setAttribute("aria-hidden", "true");
          nextSlide?.classList.remove("is-exiting");
          nextSlide?.classList.remove("is-active");
          if (nextSlide) {
            void nextSlide.offsetWidth;
            nextSlide.classList.add("is-active");
            nextSlide.setAttribute("aria-hidden", "false");
          }
          window.setTimeout(() => {
            previousSlide?.classList.remove("is-exiting");
          }, HERO_FADE_DURATION);
          heroSlideshowState.current = next;
          updateHeroCaption();
        }, HERO_SLIDE_INTERVAL);
      }
      root.dataset.rendered = "true";
    }
    updateHeroCaption();
  }

  function updateHeroCaption() {
    const caption = $('[data-hero-caption]');
    if (!caption || !heroSlideshowState.shuffled) return;
    const work = heroSlideshowState.shuffled[heroSlideshowState.current];
    caption.textContent = t(work.title);
  }

  function normalizeListenLinks() {
    const listenUrl = pageUrl("index.html#listen");
    $$('a[href="listen.html"], a[href="../listen.html"]').forEach((link) => {
      link.setAttribute("href", listenUrl);
    });
    if (body.dataset.page === "listen") {
      window.location.replace(listenUrl);
    }
  }

  function renderNewsHome() {
    const root = $('[data-render="news-home"]');
    if (!root) return;
    const items = (DATA.news || []).slice(0, 4);
    root.innerHTML = `<div class="news-grid">${items.map((item) => {
      const content = `<span class="news-title">${t(item.title)}</span>`;
      const bodyText = t(item.body);
      const linkAttrs = item.external ? ' target="_blank" rel="noopener noreferrer"' : "";
      const badgeClass = item.tag ? ` badge-${escapeHtml(item.tag)}` : "";
      const badge = item.badge ? `<span class="activity-badge${badgeClass}">${escapeHtml(t(item.badge))}</span>` : "";
      return `<article class="news-card">
        <div class="news-card-meta">${badge}<span class="news-date">${escapeHtml(item.date)}</span></div>
        <h3>${item.linkUrl ? `<a href="${escapeHtml(pageUrl(item.linkUrl))}"${linkAttrs}>${content}</a>` : content}</h3>
        ${bodyText ? `<p class="activity-body">${bodyText}</p>` : ""}
      </article>`;
    }).join("")}</div>`;
  }

  function renderHomeWorks() {
    const root = $('[data-render="home-works"]');
    if (!root) return;
    const items = homeFeaturedWorks();
    root.innerHTML = `<div class="home-work-strip" aria-label="${escapeHtml(ui("主な作品", "Selected works"))}">
      ${items.map((work) => {
        const imageUrl = new URL(assetUrl(work.image.src), window.location.href).href;
        return `<a class="home-work-tile" href="${escapeHtml(pageUrl(work.detailUrl))}" style="--work-image: url('${escapeHtml(imageUrl)}')" data-protected-image>
          <span class="sr-only">${escapeHtml(t(work.title))}</span>
        </a>`;
      }).join("")}
    </div>`;
  }

  function renderActivity() {
    const root = $('[data-render="activity-list"]');
    if (!root) return;
    root.innerHTML = `<div class="activity-list">${(DATA.news || []).map((item) => {
      const linkAttrs = item.external ? ' target="_blank" rel="noopener noreferrer"' : "";
      const title = `<span class="activity-title">${t(item.title)}</span>`;
      const linked = item.linkUrl ? `<a href="${escapeHtml(pageUrl(item.linkUrl))}"${linkAttrs}>${title}</a>` : title;
      const badgeClass = item.tag ? ` badge-${escapeHtml(item.tag)}` : " badge-other";
      const badgeText = item.badge ? t(item.badge) : ui("その他", "Other");
      const badge = `<div class="activity-badge-cell"><span class="activity-badge${badgeClass}">${escapeHtml(badgeText)}</span></div>`;
      return `<article class="activity-item">
        ${badge}
        <div class="activity-date">${escapeHtml(item.date)}</div>
        <div class="activity-copy">${linked}<p class="activity-body">${t(item.body)}</p></div>
      </article>`;
    }).join("")}</div>`;
  }

  function renderHomeSelected() {
    const root = $('[data-render="home-selected"]');
    if (!root) return;
    const items = selectedWorks();
    state.carouselIndex = Math.min(state.carouselIndex, Math.max(items.length - 1, 0));
    root.innerHTML = `<div class="home-carousel" role="region" aria-label="Selected Listening carousel" tabindex="0">
      <div class="carousel-viewport">
        <div class="carousel-track">
          ${items.map((work, index) => {
            const visualUrl = absoluteImageUrl(work);
            const visualStyle = visualUrl ? ` style="--listen-visual: url('${escapeHtml(visualUrl)}')"` : "";
            return `<section class="carousel-slide" aria-label="${index + 1} / ${items.length}">
            <div class="selected-card listen-feature-card" data-carousel-card${visualStyle}>
              <div class="selected-copy">
                <p class="work-category">${escapeHtml(selectedCategoryLabel(work))}</p>
                <h3 class="selected-title">${escapeHtml(t(work.title))}</h3>
                <p class="selected-meta">${escapeHtml(t(work.instrumentation))} / ${escapeHtml(dateOrYear(work))}</p>
                <p class="selected-note">${escapeHtml(t(work.shortNote) || t(work.note)).replace(/。\s*.+$/, "。")}</p>
                <div class="selected-media">${mediaEmbed(work)}</div>
                <div class="carousel-actions">
                  <a class="text-link" href="${escapeHtml(pageUrl(work.detailUrl))}">${ui("詳細を見る", "View details")}</a>
                </div>
              </div>
            </div>
          </section>`;
          }).join("")}
        </div>
      </div>
      <div class="carousel-controls">
        <div class="arrow-group">
          <button class="icon-button" type="button" data-carousel-prev aria-label="Previous work">‹</button>
          <button class="icon-button" type="button" data-carousel-next aria-label="Next work">›</button>
        </div>
        <div class="dots" aria-label="Carousel pages">
          ${items.map((work, index) => `<button type="button" data-carousel-dot="${index}" aria-label="Show ${escapeHtml(t(work.title))}"></button>`).join("")}
        </div>
      </div>
    </div>`;
    initCarousel(root, items.length);
  }

  function initCarousel(root, count) {
    const carousel = $(".home-carousel", root);
    const viewport = $(".carousel-viewport", root);
    const track = $(".carousel-track", root);
    const slides = $$(".carousel-slide", root);
    const dots = $$("[data-carousel-dot]", root);
    if (!carousel || !track || !count) return;

    function setActiveHeight() {
      if (!viewport || !slides.length) return;
      const activeSlide = slides[state.carouselIndex];
      if (!activeSlide) return;
      viewport.style.height = `${activeSlide.offsetHeight}px`;
      carousel.classList.toggle("has-video", Boolean($(".media-frame-video", activeSlide)));
    }

    function update() {
      track.style.transform = `translateX(${-state.carouselIndex * 100}%)`;
      dots.forEach((dot, index) => dot.setAttribute("aria-current", String(index === state.carouselIndex)));
      window.requestAnimationFrame(setActiveHeight);
      window.setTimeout(setActiveHeight, 320);
    }

    function go(delta) {
      state.carouselIndex = (state.carouselIndex + delta + count) % count;
      update();
    }

    $$("[data-carousel-prev]", root).forEach((button) => button.addEventListener("click", () => go(-1)));
    $$("[data-carousel-next]", root).forEach((button) => button.addEventListener("click", () => go(1)));
    $$("[data-carousel-card]", root).forEach((card) => {
      card.addEventListener("click", (event) => {
        if (event.target.closest("a, button, iframe, audio")) return;
        go(1);
      });
    });
    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        state.carouselIndex = Number(dot.dataset.carouselDot || 0);
        update();
      });
    });
    carousel.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    });

    let startX = null;
    carousel.addEventListener("touchstart", (event) => {
      startX = event.changedTouches[0].clientX;
    }, { passive: true });
    carousel.addEventListener("touchend", (event) => {
      if (startX === null) return;
      const delta = event.changedTouches[0].clientX - startX;
      if (Math.abs(delta) > 38) go(delta > 0 ? -1 : 1);
      startX = null;
    }, { passive: true });
    window.addEventListener("resize", setActiveHeight);
    $$("iframe", carousel).forEach((frame) => frame.addEventListener("load", setActiveHeight));

    update();
  }

  function renderListenList() {
    const root = $('[data-render="listen-list"]');
    if (!root) return;
    root.innerHTML = `<div class="listen-list">${selectedWorks().map((work) => `<article class="listen-item">
      ${workImage(work, "listen-image")}
      <div class="listen-copy">
        <p class="work-category">${escapeHtml(selectedCategoryLabel(work))}</p>
        <h2>${escapeHtml(t(work.title))}</h2>
        <p class="selected-meta">${escapeHtml(t(work.instrumentation))} / ${escapeHtml(dateOrYear(work))}</p>
        <p>${escapeHtml(t(work.shortNote) || t(work.note))}</p>
        ${mediaEmbed(work)}
        <div class="carousel-actions" style="margin-top:18px;">
          <a class="text-link" href="${escapeHtml(pageUrl(work.detailUrl))}">${ui("詳細を見る", "View details")}</a>
        </div>
      </div>
    </article>`).join("")}</div>`;
  }

  function initWorksFilters() {
    const root = $(".filter-bar");
    if (!root) return;
    $$("[data-filter]", root).forEach((button) => {
      button.addEventListener("click", () => {
        state.filter = button.dataset.filter || "all";
        $$("[data-filter]", root).forEach((item) => {
          item.setAttribute("aria-pressed", String(item.dataset.filter === state.filter));
        });
        renderWorksList();
      });
    });
  }

  function renderWorksList() {
    const root = $('[data-render="works-list"]');
    if (!root) return;
    const filtered = works().filter((work) => work.inList && (state.filter === "all" || work.archiveCategory === state.filter));
    const selected = filtered.filter((work) => work.hasDetail && work.image?.src);
    const catalogue = filtered.filter((work) => !(work.hasDetail && work.image?.src));
    const selectedMarkup = selected.length
      ? `<div class="works-card-grid works-readable-grid">${selected.map((work) => {
        const title = escapeHtml(t(work.title));
        return `<article class="works-card works-readable-card" data-category="${escapeHtml(work.archiveCategory)}">
          <a class="works-card-image works-readable-thumb" href="${escapeHtml(pageUrl(work.detailUrl))}" aria-label="${escapeHtml(`${title} ${ui("の詳細へ", "details")}`)}" data-protected-image>
            <img src="${escapeHtml(assetUrl(work.image.src))}" alt="${escapeHtml(work.image.alt)}"${imageSizeAttrs(work.image)} loading="lazy" decoding="async" draggable="false">
          </a>
          <div class="works-card-copy">
            <p class="work-category">${escapeHtml(categoryLabel(work))}</p>
            <h3><a href="${escapeHtml(pageUrl(work.detailUrl))}">${title}</a><small>${escapeHtml(work.title.en)}</small></h3>
            <p class="works-card-instrumentation">${escapeHtml(t(work.instrumentation))}</p>
            <div class="works-card-brief-meta">
              <span>${escapeHtml(work.year)}</span>
              <span>${escapeHtml(t(work.duration))}</span>
            </div>
            <dl class="works-card-meta">
              <div><dt>${ui("音源 / 映像 / スコア", "Audio / Video / Score")}</dt><dd><span class="work-badges">${availabilityBadges(work)}</span></dd></div>
            </dl>
          </div>
        </article>`;
      }).join("")}</div>`
      : `<p class="empty-note">${ui("この編成の主な作品はまだ掲載していません。", "No selected works are currently listed for this category.")}</p>`;
    const catalogueMarkup = catalogue.length
      ? `<div class="works-catalogue-list">
        <div class="catalogue-header" aria-hidden="true">
          <span>${ui("作品", "Work")}</span>
          <span>${ui("編成", "Instrumentation")}</span>
          <span>${ui("年", "Year")}</span>
          <span>${ui("初演", "Premiere")}</span>
        </div>
        ${catalogue.map((work) => {
          const titleText = `${escapeHtml(t(work.title))}<small>${escapeHtml(work.title.en)}</small>`;
          const title = work.hasDetail ? `<a href="${escapeHtml(pageUrl(work.detailUrl))}">${titleText}</a>` : `<span>${titleText}</span>`;
          return `<article class="catalogue-row" data-category="${escapeHtml(work.archiveCategory)}">
            <div class="catalogue-title">${title}</div>
            <div class="catalogue-cell" data-label="${ui("編成", "Instrumentation")}">${escapeHtml(t(work.instrumentation))}</div>
            <div class="catalogue-cell" data-label="${ui("年", "Year")}">${escapeHtml(work.year)}</div>
            <div class="catalogue-cell" data-label="${ui("初演", "Premiere")}">${escapeHtml(work.premiere.date)}</div>
          </article>`;
        }).join("")}</div>`
      : `<p class="empty-note">${ui("この編成のその他の作品はありません。", "No other works are currently listed for this category.")}</p>`;
    root.innerHTML = `<div class="works-layout">
      <section class="works-selected">
        <div class="section-head compact-head">
          <p class="kicker">Selected Works</p>
          <h2 data-lang="ja">主な作品</h2>
          <h2 data-lang="en">Selected Works</h2>
        </div>
        ${selectedMarkup}
      </section>
      <section class="works-catalogue">
        <div class="section-head compact-head">
          <p class="kicker">Other Works</p>
          <h2 data-lang="ja">その他の作品</h2>
          <h2 data-lang="en">Other Works</h2>
        </div>
        ${catalogueMarkup}
      </section>
    </div>`;
  }

  function renderWorkDetail() {
    const root = $('[data-render="work-detail"]');
    if (!root) return;
    const workId = body.dataset.workId;
    const work = works().find((item) => item.id === workId);
    if (!work) {
      root.innerHTML = `<p>${state.lang === "ja" ? "作品情報が見つかりません。" : "Work data was not found."}</p>`;
      return;
    }
    const award = t(work.award);
    const note = t(work.note) || t(work.shortNote);
    const scoreSection = scoreViewerMarkup(work);
    const visualUrl = absoluteImageUrl(work);
    root.classList.toggle("has-detail-background", Boolean(visualUrl));
    if (visualUrl) {
      root.style.setProperty("--detail-visual", `url("${visualUrl.replace(/["\\]/g, "\\$&")}")`);
    } else {
      root.style.removeProperty("--detail-visual");
    }
    root.innerHTML = `<p class="breadcrumb"><a href="${escapeHtml(pageUrl("works.html"))}">${ui("作品", "Works")}</a> / ${escapeHtml(t(work.title))}</p>
      <div class="detail-hero">
        <div>
          <p class="work-category">${escapeHtml(categoryLabel(work))}</p>
          <h1 class="detail-main-title">${escapeHtml(t(work.title))}</h1>
          <p class="detail-subtitle">${escapeHtml(work.title.en)}</p>
          <div class="work-badges detail-badges">${workBadges(work)}</div>
          <dl class="detail-meta">
            ${fact("編成", "Instrumentation", t(work.instrumentation))}
            ${fact("演奏時間", "Duration", t(work.duration))}
            ${fact("作曲年", "Year", work.year)}
            ${fact("初演", "Premiere", work.premiere.date)}
            ${fact("初演者", "Performers", t(work.premiere.ensemble))}
            ${fact("初演地", "Venue", t(work.premiere.venue))}
            ${fact("委嘱", "Commissioner", t(work.commissioner))}
            ${award ? fact("受賞・採択", "Award / Selection", award) : ""}
          </dl>
          <div class="detail-actions">
            <a class="button primary" href="#audio-video">${ui("試聴", "Listen")}</a>
            ${work.score?.pages?.length ? `<a class="button secondary" href="#score-preview">${ui("スコアを見る", "View score")}</a>` : ""}
            <a class="button secondary" href="${CONTACT_FORM_URL}" target="_blank" rel="noopener noreferrer">${ui("この作品について問い合わせる", "Ask about this work")}</a>
          </div>
        </div>
      </div>

      <section class="detail-section" id="audio-video">
        <h2>${ui("音源・映像", "Audio / Video")}</h2>
        ${mediaEmbed(work)}
      </section>

      ${scoreSection}

      <section class="detail-section" id="program-note">
        <h2>${ui("プログラムノート", "Program Note")}</h2>
        <div>${note || (state.lang === "ja" ? "プログラムノートは準備中です。" : "Program note is in preparation.")}</div>
      </section>

      <section class="detail-section" id="performance-materials">
        <h2>${ui("演奏資料", "Performance Materials")}</h2>
        <div class="materials-panel">
          <p>${state.lang === "ja" ? "演奏用スコア、パート譜、電子音響資料、再演・許諾については、作品名と用途を添えてお問い合わせください。" : "For performance scores, parts, electronic materials, permissions, or repeat performances, please include the work title and intended use."}</p>
          <a class="button secondary" href="${CONTACT_FORM_URL}" target="_blank" rel="noopener noreferrer">${ui("この作品について問い合わせる", "Ask about this work")}</a>
        </div>
      </section>

      <section class="detail-section">
        <a class="text-link" href="${escapeHtml(pageUrl("works.html"))}">${ui("作品一覧へ戻る", "Back to Works")}</a>
      </section>`;
    initScoreViewers(root);
  }

  function initScoreViewers(root = document) {
    $$("[data-score-viewer]", root).forEach((viewer) => {
      if (viewer.dataset.initialized === "true") return;
      viewer.dataset.initialized = "true";
      const main = $("[data-score-main]", viewer);
      const current = $("[data-score-current]", viewer);
      const thumbs = $$("[data-score-thumb]", viewer);
      const stage = $(".score-stage", viewer);
      const fullscreenButton = $("[data-score-fullscreen]", viewer);
      const closeButton = $("[data-score-close]", viewer);
      if (!main || !thumbs.length) return;
      let index = 0;
      let touchStartX = null;

      function show(nextIndex) {
        index = (nextIndex + thumbs.length) % thumbs.length;
        const thumb = thumbs[index];
        const src = thumb.dataset.src || "";
        const alt = thumb.dataset.alt || "";
        if (src && main.getAttribute("src") !== src) main.setAttribute("src", src);
        if (alt) main.setAttribute("alt", alt);
        if (current) current.textContent = String(index + 1);
        thumbs.forEach((button, thumbIndex) => button.setAttribute("aria-current", String(thumbIndex === index)));
      }

      function setFullscreen(open) {
        viewer.classList.toggle("is-fullscreen", open);
        body.classList.toggle("score-fullscreen-open", open);
        fullscreenButton?.setAttribute("aria-expanded", String(open));
        if (open) {
          viewer.focus({ preventScroll: true });
          if (viewer.requestFullscreen && document.fullscreenElement !== viewer) {
            viewer.requestFullscreen().catch(() => {});
          }
        } else if (document.fullscreenElement === viewer && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }

      $("[data-score-prev]", viewer)?.addEventListener("click", () => show(index - 1));
      $("[data-score-next]", viewer)?.addEventListener("click", () => show(index + 1));
      fullscreenButton?.addEventListener("click", () => setFullscreen(true));
      closeButton?.addEventListener("click", () => setFullscreen(false));
      thumbs.forEach((thumb) => {
        thumb.addEventListener("click", () => show(Number(thumb.dataset.scoreThumb || 0)));
      });
      viewer.addEventListener("keydown", (event) => {
        if (event.key === "ArrowLeft") show(index - 1);
        if (event.key === "ArrowRight") show(index + 1);
        if (event.key === "Escape") setFullscreen(false);
      });
      stage?.addEventListener("touchstart", (event) => {
        touchStartX = event.changedTouches[0].clientX;
      }, { passive: true });
      stage?.addEventListener("touchend", (event) => {
        if (touchStartX === null) return;
        const delta = event.changedTouches[0].clientX - touchStartX;
        if (Math.abs(delta) > 42) show(delta > 0 ? index - 1 : index + 1);
        touchStartX = null;
      }, { passive: true });
      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && viewer.classList.contains("is-fullscreen")) setFullscreen(false);
      });
      document.addEventListener("fullscreenchange", () => {
        if (!document.fullscreenElement && viewer.classList.contains("is-fullscreen")) {
          viewer.classList.remove("is-fullscreen");
          body.classList.remove("score-fullscreen-open");
          fullscreenButton?.setAttribute("aria-expanded", "false");
        }
      });
      show(0);
    });
  }

  function renderScoresFeatured() {
    const root = $('[data-render="scores-featured"]');
    if (!root) return;
    const priority = new Set(["parallax", "hikari-to-kumo", "zapping-shower", "manekko", "defocusing-ii"]);
    const items = works()
      .filter((work) => work.hasDetail && work.image?.src && (priority.has(work.id) || work.score?.pages?.length))
      .sort((a, b) => {
        const pa = priority.has(a.id) ? 0 : 1;
        const pb = priority.has(b.id) ? 0 : 1;
        return pa - pb || (a.selectedOrder || 999) - (b.selectedOrder || 999);
      })
      .slice(0, 6);
    root.innerHTML = `<div class="score-work-grid">${items.map((work) => `<a class="score-work-card" href="${escapeHtml(pageUrl(work.detailUrl))}#score-preview">
      ${workImage(work, "score-work-image")}
      <span>${escapeHtml(t(work.title))}</span>
    </a>`).join("")}</div>`;
  }

  function renderShopTable() {
    const root = $('[data-render="shop-table"]');
    if (!root) return;
    const items = works().filter((work) => work.inShop);
    root.innerHTML = `<div class="table-scroll">
      <table class="price-table">
        <thead>
          <tr>
            <th>${ui("作品", "Work")}</th>
            <th>${ui("編成", "Instrumentation")}</th>
            <th>${ui("スコア", "Score")}</th>
            <th>${ui("スコア＆パート譜", "Score & Parts")}</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((work) => {
            const score = work.score?.priceScore || (work.score?.pages?.length ? ui("試し読み可", "Preview available") : ui("お問い合わせ", "Please enquire"));
            let set = work.score?.priceSet || (["wind", "orchestra"].includes(work.archiveCategory) ? ui("レンタル・個別相談", "Rental / consultation required") : ui("お問い合わせ", "Please enquire"));
            if (state.lang === "en" && set === "レンタル・個別相談") set = "Rental / consultation required";
            const title = work.hasDetail
              ? `<a href="${escapeHtml(pageUrl(work.detailUrl))}">${escapeHtml(t(work.title))}</a>`
              : escapeHtml(t(work.title));
            return `<tr>
              <td><strong>${title}</strong><span>${escapeHtml(work.title.en)}</span></td>
              <td>${escapeHtml(t(work.instrumentation))}</td>
              <td>${escapeHtml(score)}</td>
              <td>${escapeHtml(set)}</td>
            </tr>`;
          }).join("")}
        </tbody>
      </table>
    </div>`;
  }

  function scoreAlt(work, index) {
    const page = index + 1;
    return state.lang === "ja"
      ? `${t(work.title)} のスコア試し読み ${page}ページ目`
      : `Score preview page ${page} of ${work.title.en || t(work.title)}`;
  }

  function fact(labelJa, labelEn, value) {
    return `<div class="fact"><dt>${escapeHtml(ui(labelJa, labelEn))}</dt><dd>${escapeHtml(value || "—")}</dd></div>`;
  }

  function renderPage() {
    renderHeroArt();
    renderCurrent();
    renderNewsHome();
    renderHomeWorks();
    renderHomeSelected();
    renderListenList();
    renderActivity();
    renderWorksList();
    renderWorkDetail();
    renderScoresFeatured();
    renderShopTable();
  }

  document.addEventListener("DOMContentLoaded", () => {
    initMenu();
    initWorksFilters();
    normalizeListenLinks();
    document.addEventListener("contextmenu", (event) => {
      if (event.target.closest("[data-protected-image], [data-score-protected]")) event.preventDefault();
    });
    document.addEventListener("dragstart", (event) => {
      if (event.target.closest("[data-protected-image], [data-score-protected]")) event.preventDefault();
    });
    initLanguage();
  });
}());
