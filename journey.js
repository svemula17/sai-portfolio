/* =========================================================
   Sai Kumar Vemula — Laptop OS experience switcher
   The laptop opens straight into a mini macOS desktop: the
   latest role is an app window, the other roles wait in the
   dock (with year labels + a timeline progress strip), and
   scroll swaps windows like switching apps. Progressive
   enhancement: with no GSAP (CDN blocked), on small screens,
   or with reduced motion, the CSS fallback shows the open
   laptop with all three windows stacked.
   ========================================================= */

(() => {
  const section = document.getElementById("journey");
  if (!section) return;

  /* ----- Menu-bar clock (runs in every mode) ----- */
  const clockEl = document.getElementById("osClock");
  if (clockEl) {
    const tick = () => {
      const now = new Date();
      const day  = now.toLocaleDateString("en-US", { weekday: "short" });
      const date = now.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const time = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      clockEl.textContent = `${day} ${date}  ${time}`;
    };
    tick();
    setInterval(tick, 30000);
  }

  // No GSAP (CDN blocked/offline) → leave the stacked fallback as-is.
  if (!window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);

  const mm = gsap.matchMedia();

  mm.add("(min-width: 769px) and (prefers-reduced-motion: no-preference)", () => {
    section.classList.add("is-cinematic");

    const q        = gsap.utils.selector(section);
    const stage    = q(".journey-stage")[0];
    const laptop   = q(".laptop")[0];
    const lid      = q(".laptop-lid")[0];
    const windows  = q(".os-window");
    const dots     = q(".dock-dot");
    const apps     = q(".dock-app");
    const appnames = q(".os-appname");
    const progFill = q(".dock-progress-fill")[0];
    const hint     = q(".journey-hint")[0];

    // Initial states — desktop (wallpaper/menubar/dock) is alive from the start
    gsap.set(lid, { rotationX: -88, transformOrigin: "50% 100%" });
    gsap.set(windows, { autoAlpha: 0, scale: 0.94, y: 26 });
    gsap.set(dots, { autoAlpha: 0 });
    gsap.set(appnames, { autoAlpha: 0 });
    gsap.set(progFill, { scaleX: 0, transformOrigin: "0 50%" });

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: () => "+=" + Math.round(window.innerHeight * 3.8),
        scrub: 1,
        pin: stage,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        // hide the site nav while pinned — full-screen app immersion
        onToggle: (self) =>
          document.querySelector(".nav")?.classList.toggle("nav--journey-hide", self.isActive)
      }
    });

    // ── Boot: lid opens onto the desktop, laptop leans in
    tl.to(lid, { rotationX: 0, duration: 1.2 }, 0)
      .to(laptop, { scale: 1.22, duration: 0.6 }, 0.9)
      .to(hint, { autoAlpha: 0, duration: 0.3 }, 1.0);

    // ── App windows: open latest, then swap like switching apps
    const OPEN  = { autoAlpha: 1, scale: 1, y: 0, duration: 0.5 };
    const CLOSE = { autoAlpha: 0, scale: 0.94, y: 26, duration: 0.45 };
    const times = [1.6, 2.9, 4.4]; // when each app takes focus

    times.forEach((t, i) => {
      if (i > 0) {
        tl.to(windows[i - 1], { ...CLOSE }, t)               // minimize toward dock
          .to([dots[i - 1], appnames[i - 1]], { autoAlpha: 0, duration: 0.3 }, t);
      }
      tl.addLabel("app" + i, t + 0.25)
        .to(windows[i], { ...OPEN }, t + 0.25)               // next app scales up
        .to([dots[i], appnames[i]], { autoAlpha: 1, duration: 0.3 }, t + 0.25);

      // ── Contents assemble after the window lands, so a swap reads as an app
      //    drawing itself rather than one flat crossfade.
      const head   = windows[i].querySelector(".os-winhead");
      const chips  = windows[i].querySelectorAll(".os-chip");
      const points = windows[i].querySelectorAll(".os-points li");

      tl.fromTo(head, { autoAlpha: 0, y: 10 },
                      { autoAlpha: 1, y: 0, duration: 0.28 }, t + 0.4)
        .fromTo(chips, { autoAlpha: 0, y: 14, scale: 0.9 },
                       { autoAlpha: 1, y: 0, scale: 1, duration: 0.3, stagger: 0.07 }, t + 0.5)
        .fromTo(points, { autoAlpha: 0, x: -14 },
                        { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.055 }, t + 0.62);

      // ── The title types itself, like the shell drew the path.
      //    Driven off a proxy object so it needs no TextPlugin, and reverses
      //    cleanly when the scrub runs backwards.
      const titleEl = windows[i].querySelector(".os-title");
      if (titleEl) {
        const full = titleEl.textContent;
        const cursor = { n: 0 };
        tl.set(titleEl, { className: "os-title is-typing" }, t + 0.3)
          .to(cursor, {
            n: full.length,
            duration: 0.5,
            ease: "none",
            onUpdate() { titleEl.textContent = full.slice(0, Math.round(cursor.n)); }
          }, t + 0.32)
          .set(titleEl, { className: "os-title" }, t + 0.86);
      }

      // ── Metric chips tick up to their value instead of just appearing.
      //    Chips whose <b> holds no digits (MTTR, SCPs) are left alone.
      chips.forEach((chip, ci) => {
        const b = chip.querySelector("b");
        if (!b) return;
        const parts = b.textContent.match(/^(\D*)(\d+)(.*)$/);
        if (!parts) return;
        const [, prefix, digits, suffix] = parts;
        const counter = { v: 0 };
        tl.to(counter, {
          v: Number(digits),
          duration: 0.6,
          ease: "power2.out",
          onUpdate() { b.textContent = prefix + Math.round(counter.v) + suffix; }
        }, t + 0.52 + ci * 0.07);
      });

      // dock icon bounces as its app takes focus, the way macOS announces a launch
      tl.to(apps[i], { y: -10, duration: 0.16, ease: "power2.out" }, t + 0.25)
        .to(apps[i], { y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" }, t + 0.41);
    });

    // ── Dock timeline strip fills across the whole work history
    tl.to(progFill, { scaleX: 1, duration: 5.3 - 1.6 }, 1.6);

    tl.to({}, { duration: 0.7 });                             // dwell on the last window

    // ── Dock: click an app to jump to its window. The jump is instant;
    // the scrubbed timeline (scrub: 1) supplies the smooth app-switch
    // animation itself, and instant jumps are the only scroll form that
    // behaves reliably inside a pinned range across browsers.
    const st = tl.scrollTrigger;
    const onDockClick = (e) => {
      const i = apps.indexOf(e.currentTarget);
      let time = tl.labels["app" + i];
      if (time == null) return;
      time = Math.min(time + 0.6, tl.duration()); // land after the window has fully opened
      const top = st.start + (time / tl.duration()) * (st.end - st.start);
      window.scrollTo({ top, behavior: "instant" });
      ScrollTrigger.update();
    };
    apps.forEach((a) => a.addEventListener("click", onDockClick));

    /* ── Dock magnification ────────────────────────────────────────────
       The macOS fisheye: icons swell by proximity to the cursor, not on
       plain hover, so the whole dock reacts as you travel across it. */
    const dock = q(".os-dock")[0];
    /* overwrite:false is load-bearing — two quickTo tweens on one element
       otherwise cancel each other and only the last property animates. */
    const QT = { duration: 0.25, ease: "power3.out", overwrite: false };
    /* scaleX/scaleY, not "scale" — quickTo drives one real property, and the
       "scale" shorthand silently does nothing through it. */
    const appSX   = apps.map((a) => gsap.quickTo(a, "scaleX",   QT));
    const appSY   = apps.map((a) => gsap.quickTo(a, "scaleY",   QT));
    const appLift = apps.map((a) => gsap.quickTo(a, "yPercent", QT));
    const appScale = apps.map((_, i) => (v) => { appSX[i](v); appSY[i](v); });
    const REACH = 90;   // px of cursor influence either side
    const PEAK  = 0.55; // extra scale on the icon directly under the cursor

    const onDockMove = (e) => {
      apps.forEach((a, i) => {
        const r = a.getBoundingClientRect();
        const d = Math.abs(e.clientX - (r.left + r.width / 2));
        const f = Math.max(0, 1 - d / REACH);
        const eased = f * f * (3 - 2 * f);           // smoothstep, no hard edge
        appScale[i](1 + PEAK * eased);
        appLift[i](-22 * eased);
      });
    };
    const onDockLeave = () => apps.forEach((_, i) => { appScale[i](1); appLift[i](0); });
    if (dock) {
      dock.addEventListener("pointermove", onDockMove);
      dock.addEventListener("pointerleave", onDockLeave);
    }

    /* ── Cursor parallax ───────────────────────────────────────────────
       The laptop leans toward the pointer while the section is pinned.
       Tilt lives on .laptop (rotationX/Y); the timeline owns .laptop
       scale and .laptop-lid rotationX, so the two never fight. */
    const tiltY  = gsap.quickTo(laptop, "rotationY", { duration: 0.7, ease: "power3.out", overwrite: false });
    const tiltX  = gsap.quickTo(laptop, "rotationZ", { duration: 0.7, ease: "power3.out", overwrite: false });
    const glow   = q(".laptop-screen-glow")[0];
    const glowTo = glow ? gsap.quickTo(glow, "opacity", { duration: 0.5, overwrite: false }) : null;

    const onStageMove = (e) => {
      const r = stage.getBoundingClientRect();
      const nx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);   // -1 … 1
      const ny = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
      tiltY(gsap.utils.clamp(-1, 1, nx) * 7);
      tiltX(gsap.utils.clamp(-1, 1, ny) * -1.6);
      if (glowTo) glowTo(0.5 + 0.4 * (1 - Math.abs(nx)));                // screen catches the light
    };
    const onStageLeave = () => { tiltY(0); tiltX(0); if (glowTo) glowTo(0.5); };
    stage.addEventListener("pointermove", onStageMove);
    stage.addEventListener("pointerleave", onStageLeave);

    window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });

    // Cleanup when the media query stops matching (e.g. resize to mobile).
    return () => {
      apps.forEach((a) => a.removeEventListener("click", onDockClick));
      if (dock) {
        dock.removeEventListener("pointermove", onDockMove);
        dock.removeEventListener("pointerleave", onDockLeave);
      }
      stage.removeEventListener("pointermove", onStageMove);
      stage.removeEventListener("pointerleave", onStageLeave);
      section.classList.remove("is-cinematic");
      st && st.kill();
      tl.kill();
      gsap.set([lid, laptop, hint, progFill, glow, ...apps, ...windows, ...dots, ...appnames,
                ...section.querySelectorAll(".os-winhead, .os-chip, .os-points li")],
               { clearProps: "all" });
    };
  });
})();
