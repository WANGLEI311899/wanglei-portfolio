document.documentElement.classList.add("js-ready");

const root = document.documentElement;
const yearNode = document.querySelector("#year");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

// reveal 只负责进场透明度和位移，避免和其他 hover / 视差效果互相覆盖
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.16,
  }
);

document.querySelectorAll(".reveal").forEach((node) => {
  observer.observe(node);
});

if (!prefersReducedMotion) {
  const tiltNodes = [...document.querySelectorAll("[data-tilt]")];
  const parallaxNodes = [...document.querySelectorAll("[data-parallax]")];
  const heroStage = document.querySelector(".hero-stage");
  const stageInteractiveNodes = heroStage
    ? [...heroStage.querySelectorAll(".stage-panel, .stage-card, .stage-orbit, .stage-beam")]
    : [];

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight * 0.3;
  let currentX = targetX;
  let currentY = targetY;
  let latestScrollY = window.scrollY;

  // 统一在一帧里处理光斑、轻视差和首屏舞台位移，保持效果顺滑且便于后期维护
  const renderFrame = () => {
    currentX += (targetX - currentX) * 0.12;
    currentY += (targetY - currentY) * 0.12;

    root.style.setProperty("--spot-x", `${currentX}px`);
    root.style.setProperty("--spot-y", `${currentY}px`);
    root.style.setProperty("--hero-shift", `${Math.min(latestScrollY * -0.05, 28)}px`);

    parallaxNodes.forEach((node) => {
      const depth = Number(node.dataset.parallax || 0);
      const offset = latestScrollY * depth * -0.12;
      node.style.translate = `0 ${offset.toFixed(2)}px`;
    });

    requestAnimationFrame(renderFrame);
  };

  requestAnimationFrame(renderFrame);

  window.addEventListener(
    "pointermove",
    (event) => {
      targetX = event.clientX;
      targetY = event.clientY;
    },
    { passive: true }
  );

  window.addEventListener(
    "scroll",
    () => {
      latestScrollY = window.scrollY;
    },
    { passive: true }
  );

  tiltNodes.forEach((node) => {
    node.addEventListener("pointermove", (event) => {
      const rect = node.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      const rotateY = (x - 0.5) * 10;
      const rotateX = (0.5 - y) * 8;

      node.style.setProperty("--tilt-x", `${rotateX.toFixed(2)}deg`);
      node.style.setProperty("--tilt-y", `${rotateY.toFixed(2)}deg`);
    });

    node.addEventListener("pointerleave", () => {
      node.style.setProperty("--tilt-x", "0deg");
      node.style.setProperty("--tilt-y", "0deg");
    });
  });

  if (heroStage) {
    heroStage.addEventListener("pointermove", (event) => {
      const rect = heroStage.getBoundingClientRect();
      const normalizedX = (event.clientX - rect.left) / rect.width - 0.5;
      const normalizedY = (event.clientY - rect.top) / rect.height - 0.5;

      stageInteractiveNodes.forEach((node, index) => {
        const factor = 10 + index * 1.8;
        const moveX = normalizedX * factor;
        const moveY = normalizedY * factor * 0.8;
        node.style.translate = `${moveX.toFixed(2)}px ${moveY.toFixed(2)}px`;
      });
    });

    heroStage.addEventListener("pointerleave", () => {
      stageInteractiveNodes.forEach((node) => {
        node.style.translate = "";
      });
    });
  }
}
