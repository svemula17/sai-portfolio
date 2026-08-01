/* =========================================================
   Sai Kumar Vemula — Portfolio
   Lean interactions: theme toggle, mobile menu, scroll-spy,
   reveal-on-scroll, copy email, certifications expand,
   project case-study modal.
   ========================================================= */

(() => {
  const root = document.documentElement;

  /* ----- Theme toggle (light default, persisted) ----- */
  const STORAGE_KEY = "skv-ui";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "dark" || saved === "light") {
    root.setAttribute("data-ui", saved);
  }
  const modeBtn = document.getElementById("modeToggle");
  modeBtn?.addEventListener("click", () => {
    const next = root.getAttribute("data-ui") === "dark" ? "light" : "dark";
    root.setAttribute("data-ui", next);
    localStorage.setItem(STORAGE_KEY, next);
  });

  /* ----- Mobile nav menu ----- */
  const nav = document.querySelector(".nav");
  const navToggle = document.getElementById("navToggle");
  navToggle?.addEventListener("click", () => {
    const open = nav.classList.toggle("menu-open");
    navToggle.classList.toggle("is-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
    updateNavReveal();
  });
  document.querySelectorAll(".nav-links a").forEach(a => {
    a.addEventListener("click", () => {
      nav?.classList.remove("menu-open");
      navToggle?.classList.remove("is-open");
      navToggle?.setAttribute("aria-expanded", "false");
    });
  });

  /* ----- Nav reveal: hidden over the home hero, shown once scrolling ----- */
  function updateNavReveal() {
    if (!nav) return;
    const show = window.scrollY > 64 || nav.classList.contains("menu-open");
    nav.classList.toggle("nav--show", show);
  }
  window.addEventListener("scroll", updateNavReveal, { passive: true });
  window.addEventListener("resize", updateNavReveal);
  updateNavReveal();

  /* ----- Scroll-spy on nav ----- */
  const navLinks = [...document.querySelectorAll(".nav-links a")];
  const sections = navLinks
    .map(a => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);
  const headerH = 80;

  function onScrollSpy() {
    const y = window.scrollY + headerH + 60;
    let currentId = sections[0]?.id || "";
    for (const sec of sections) {
      if (y >= sec.offsetTop) currentId = sec.id;
    }
    navLinks.forEach(a => {
      a.classList.toggle("active", a.getAttribute("href") === `#${currentId}`);
    });
  }
  if (sections.length) {
    window.addEventListener("scroll", onScrollSpy, { passive: true });
    window.addEventListener("resize", onScrollSpy);
    onScrollSpy();
  }

  /* ----- Auto-add reveal class to grouped items ----- */
  document.querySelectorAll(".stat, .skill-group, .tech-item, .cert-card, .edu-card, .about-body")
    .forEach(el => {
      if (!el.classList.contains("reveal")) el.classList.add("reveal");
    });

  /* ----- Staggered reveals for grid children ----- */
  const STAGGER_MS = 80;
  [".stats-grid", ".tech-grid", ".skills-matrix", ".cert-grid"]
    .forEach(sel => {
      document.querySelectorAll(sel).forEach(grid => {
        [...grid.children].forEach((child, i) => {
          if (child.classList.contains("reveal")) {
            child.style.transitionDelay = `${i * STAGGER_MS}ms`;
          }
        });
      });
    });

  /* ----- Reveal on scroll (single observer) ----- */
  const reveal = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && reveal.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveal.forEach(el => io.observe(el));
  } else {
    reveal.forEach(el => el.classList.add("in-view"));
  }

  /* ----- Stat number count-up ----- */
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const countTargets = document.querySelectorAll("[data-count-to]");

  function animateCount(el) {
    const target = parseInt(el.dataset.countTo, 10) || 0;
    const suffix = el.dataset.suffix || "";
    if (prefersReducedMotion) { el.textContent = target + suffix; return; }
    const duration = 1200;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      el.textContent = Math.round(target * eased) + (t === 1 ? suffix : "");
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  if ("IntersectionObserver" in window && countTargets.length) {
    const countIO = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          countIO.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    countTargets.forEach(el => countIO.observe(el));
  } else {
    countTargets.forEach(animateCount);
  }

  /* ----- Copy email button ----- */
  document.querySelectorAll(".copy-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const value = btn.getAttribute("data-copy") || "";
      try {
        await navigator.clipboard.writeText(value);
        const original = btn.textContent;
        btn.textContent = "Copied";
        setTimeout(() => { btn.textContent = original; }, 1100);
      } catch {
        /* clipboard might be blocked — no-op */
      }
    });
  });

  /* ----- Certifications expand ----- */
  const certToggle = document.getElementById("certToggle");
  const certMore = document.getElementById("certMore");
  certToggle?.addEventListener("click", () => {
    if (!certMore) return;
    const open = certMore.hasAttribute("hidden");
    certMore.toggleAttribute("hidden", !open);
    certToggle.setAttribute("aria-expanded", String(open));
    certToggle.textContent = open ? "Show fewer ↑" : "View all certifications →";
  });

  /* ----- Case-study modal ----- */
  const caseStudies = {
    siem: {
      title: "Smart SIEM Risk Engine",
      problem: "SOC teams are overwhelmed by high-volume IDS/IPS alerts that aren't normalized, scored, or prioritized — leading to alert fatigue and missed threats.",
      built: "An automated SIEM solution for security monitoring, log analysis, and threat detection. Features a machine learning-based risk scoring engine (Random Forest) for threat classification and alert prioritization, with incident response automation, detection engineering, real-time dashboards, GeoIP visualization, and alert notifications.",
      tools: "Python, FastAPI, WebSockets, SQLite, SQLAlchemy, Pydantic, scikit-learn, MITRE ATT&CK.",
      outcome: "Reduced SOC alert fatigue with intelligent risk scoring, automated triage, and a real-time analyst dashboard with downloadable incident reports.",
      link: "https://github.com/svemula17/smart-siem-risk-engine"
    },
    pentest: {
      title: "AI Pen-Test Agent",
      problem: "Manual penetration testing is slow, inconsistent, and requires an expert who knows dozens of specialized tools and when to use each one.",
      built: "An autonomous penetration testing agent that orchestrates 17 tools (nmap, gobuster, sqlmap, Metasploit parsers, and more). It reads tool output, decides the next move, and writes a professional Markdown report with severity ratings and fix advice. Supports Claude, Gemini, or a built-in deterministic planner. Hard safety rails enforce lab-only targeting (DVWA).",
      tools: "Python, Claude API, Gemini API, nmap, gobuster, sqlmap, nuclei, XSStrike, Hydra, Metasploit parsers, Streamlit UI.",
      outcome: "A repeatable, safe pentest workflow that produces consistent findings, faster triage, and professional reports — demonstrating LLM-driven multi-step tool orchestration with enforceable safety constraints.",
      link: "https://github.com/svemula17/pentest-agent"
    },
    cloud: {
      title: "Cloud Security & Deception Platform",
      problem: "Cloud misconfigurations go undetected and attacker behavior in cloud environments is poorly understood without active observation.",
      built: "An AI-driven cloud security platform for CSPM, detecting misconfigurations across AWS services (IAM, S3, EC2). Performs cloud risk assessment and threat modeling mapped to MITRE ATT&CK and CIS Benchmarks. Implements deception technology (honeypots) and real-time alerting to study attacker discovery and movement patterns.",
      tools: "Python, AWS, Azure, TensorFlow, Scikit-learn, Terraform, MITRE ATT&CK, CIS Benchmarks.",
      outcome: "Improved threat detection, incident response, and MTTD/MTTR through AI-driven posture management and deception-based attacker intelligence.",
      link: "https://github.com/saivarmadpr/Cloud_Security_Posture_-_Deception_Platform"
    },
    attackid: {
      title: "Attack Identification Tool",
      problem: "Raw IDS/IPS logs from Suricata and Zeek are noisy, inconsistently formatted, and lack intelligent triage — overwhelming Tier 1 SOC analysts.",
      built: "A SIEM pipeline that ingests raw threat datasets (ISCX, Zeek IoT), validates them through strict Pydantic schemas, normalizes across different log formats, and applies multi-dimensional heuristic risk scoring (severity, exploitability, CVE matching, target analysis) to produce a 0–100 risk score. Automated playbook responses block critical IPs, flag medium threats, and archive low-risk events. Results stream to a glassmorphism dashboard via WebSockets.",
      tools: "Python, FastAPI, SQLite, Pydantic, WebSockets, HTML/CSS/JS (glassmorphism UI).",
      outcome: "An automated, intelligent filter that replaces Tier 1 triage — only escalating verified, high-confidence threats to human analysts via a real-time command-center dashboard.",
      link: "https://github.com/svemula17/attack_identification_tool"
    }
  };

  const caseModal = document.getElementById("caseModal");
  const caseTitle = document.getElementById("caseModalTitle");
  const caseProblem = document.getElementById("caseProblem");
  const caseBuilt = document.getElementById("caseBuilt");
  const caseTools = document.getElementById("caseTools");
  const caseOutcome = document.getElementById("caseOutcome");
  const caseLink = document.getElementById("caseLink");
  let lastTrigger = null;

  function openCase(key, trigger) {
    const data = caseStudies[key];
    if (!caseModal || !data) return;
    lastTrigger = trigger || null;
    if (caseTitle) caseTitle.textContent = data.title;
    if (caseProblem) caseProblem.textContent = data.problem;
    if (caseBuilt) caseBuilt.textContent = data.built;
    if (caseTools) caseTools.textContent = data.tools;
    if (caseOutcome) caseOutcome.textContent = data.outcome;
    if (caseLink) {
      if (data.link) {
        caseLink.href = data.link;
        caseLink.style.display = "";
      } else {
        caseLink.style.display = "none";
      }
    }
    caseModal.classList.add("open");
    caseModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("case-modal-open");
  }

  function closeCase() {
    if (!caseModal) return;
    caseModal.classList.remove("open");
    caseModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("case-modal-open");
    lastTrigger?.focus?.();
  }

  document.querySelectorAll("[data-case]").forEach(el => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      openCase(el.dataset.case, el);
    });
  });
  document.querySelectorAll("[data-close-case]").forEach(el => {
    el.addEventListener("click", closeCase);
  });
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && caseModal?.classList.contains("open")) closeCase();
  });

  /* ----- Sticky-scroll projects ----- */
  const projScroller = document.querySelector(".proj-scroller");
  const projSlides = [...document.querySelectorAll(".proj-slide")];
  const projNum = document.querySelector(".proj-num");
  const projBarFill = document.querySelector(".proj-bar span");

  function syncProjects() {
    if (!projScroller || !projSlides.length) return;
    // Disable sticky behavior at narrow widths — CSS already stacks them
    if (window.matchMedia("(max-width: 900px)").matches) {
      projSlides.forEach(s => s.classList.add("is-active"));
      return;
    }
    const rect = projScroller.getBoundingClientRect();
    const total = projScroller.offsetHeight - window.innerHeight;
    const progress = Math.max(0, Math.min(1, -rect.top / Math.max(total, 1)));
    const count = projSlides.length;
    // Slight offset so the LAST slide doesn't only show at exactly progress=1
    const idx = Math.min(count - 1, Math.floor(progress * count * 0.999));
    projSlides.forEach((slide, i) => slide.classList.toggle("is-active", i === idx));
    if (projBarFill) projBarFill.style.width = `${progress * 100}%`;
    if (projNum) {
      const cur = String(idx + 1).padStart(2, "0");
      const tot = String(count).padStart(2, "0");
      projNum.textContent = `${cur} / ${tot}`;
    }
  }

  if (projScroller && projSlides.length) {
    window.addEventListener("scroll", syncProjects, { passive: true });
    window.addEventListener("resize", syncProjects);
    syncProjects();
  }

  /* ----- Footer year ----- */
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();
