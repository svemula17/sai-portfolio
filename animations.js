/* =========================================================
   Sai Kumar Vemula — Portfolio animations
   Typed rotating hero role. Zero dependencies, respects
   prefers-reduced-motion, no-ops when its markup is absent.
   ========================================================= */

(() => {
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reduceMotion = () => motionQuery.matches;

  const el = document.getElementById("roleTyper");
  if (!el) return;

  const roles = ["DevSecOps Engineer", "Cloud Security Engineer", "Cybersecurity Engineer"];
  const TYPE_MS = 45, ERASE_MS = 25, HOLD_MS = 2200, GAP_MS = 350;
  let i = 0, timer = 0, stopped = false;

  function setStatic() {
    stopped = true;
    clearTimeout(timer);
    el.textContent = roles[0];
  }
  if (reduceMotion()) { setStatic(); return; }

  function typeRole(role, pos) {
    if (stopped) return;
    el.textContent = role.slice(0, pos);
    if (pos < role.length) {
      timer = setTimeout(() => typeRole(role, pos + 1), TYPE_MS);
    } else {
      timer = setTimeout(() => eraseRole(role, role.length), HOLD_MS);
    }
  }
  function eraseRole(role, pos) {
    if (stopped) return;
    el.textContent = role.slice(0, pos);
    if (pos > 0) {
      timer = setTimeout(() => eraseRole(role, pos - 1), ERASE_MS);
    } else {
      i = (i + 1) % roles.length;
      timer = setTimeout(() => typeRole(roles[i], 0), GAP_MS);
    }
  }
  typeRole(roles[0], el.textContent.length);

  motionQuery.addEventListener?.("change", () => {
    if (reduceMotion()) setStatic();
  });
})();
