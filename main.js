document.documentElement.classList.add("js-ready");

const yearNode = document.querySelector("#year");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.documentElement;

if (yearNode) {
  yearNode.textContent = new Date().getFullYear();
}

// reveal 只负责进场透明度和位移，避免和其他交互效果耦合
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

document.querySelectorAll(".reveal").forEach((element) => {
  observer.observe(element);
});

if (!prefersReducedMotion) {
  const parallaxNodes = [...document.querySelectorAll("[data-parallax]")];
  const tiltNodes = [...document.querySelectorAll("[data-tilt]")];
  const heroStage = document.querySelector(".hero-stage");

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight * 0.3;
  let currentX = targetX;
  let currentY = targetY;
  let latestScrollY = window.scrollY;

  // 用 requestAnimationFrame 平滑处理鼠标光斑和视差，避免直接在 mousemove 里频繁写样式
  const renderFrame = () => {
    currentX += (targetX - currentX) * 0.12;
    currentY += (targetY - currentY) * 0.12;

    root.style.setProperty("--spot-x", `${currentX}px`);
    root.style.setProperty("--spot-y", `${currentY}px`);

    parallaxNodes.forEach((node) => {
      const depth = Number(node.dataset.parallax || 0);
      const offset = latestScrollY * depth * -0.12;
      node.style.transform = `translate3d(0, ${offset.toFixed(2)}px, 0)`;
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
      const offsetX = ((event.clientX - rect.left) / rect.width - 0.5) * 24;
      const offsetY = ((event.clientY - rect.top) / rect.height - 0.5) * 18;

      heroStage.querySelectorAll(".stage-card, .stage-panel, .stage-orbit").forEach((node, index) => {
        const factor = 1 + index * 0.08;
        node.style.transform = `translate3d(${(offsetX * factor).toFixed(2)}px, ${(offsetY * factor).toFixed(
          2
        )}px, 0)`;
      });
    });

    heroStage.addEventListener("pointerleave", () => {
      heroStage.querySelectorAll(".stage-card, .stage-panel, .stage-orbit").forEach((node) => {
        node.style.transform = "";
      });
    });
  }
}
