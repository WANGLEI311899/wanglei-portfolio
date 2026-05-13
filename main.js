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
  const heroCanvas = document.querySelector(".hero-canvas");
  const stageInteractiveNodes = heroStage
    ? [...heroStage.querySelectorAll(".stage-panel, .stage-card, .stage-orbit, .stage-beam")]
    : [];

  let targetX = window.innerWidth / 2;
  let targetY = window.innerHeight * 0.3;
  let currentX = targetX;
  let currentY = targetY;
  let latestScrollY = window.scrollY;
  let heroPointerX = 0;
  let heroPointerY = 0;

  if (heroCanvas && heroStage) {
    initHeroCanvas(heroCanvas, heroStage, () => ({ x: heroPointerX, y: heroPointerY }));
  }

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
      heroPointerX = normalizedX;
      heroPointerY = normalizedY;

      stageInteractiveNodes.forEach((node, index) => {
        const factor = 10 + index * 1.8;
        const moveX = normalizedX * factor;
        const moveY = normalizedY * factor * 0.8;
        node.style.translate = `${moveX.toFixed(2)}px ${moveY.toFixed(2)}px`;
      });
    });

    heroStage.addEventListener("pointerleave", () => {
      heroPointerX = 0;
      heroPointerY = 0;
      stageInteractiveNodes.forEach((node) => {
        node.style.translate = "";
      });
    });
  }
}

function initHeroCanvas(canvas, container, getPointerOffset) {
  const context = canvas.getContext("2d");

  if (!context) {
    return;
  }

  let width = 0;
  let height = 0;
  let depth = 640;
  let particleCount = 56;
  let particles = [];

  const makeParticle = () => ({
    x: (Math.random() - 0.5) * 540,
    y: (Math.random() - 0.5) * 420,
    z: (Math.random() - 0.5) * depth,
    size: 1.1 + Math.random() * 2.2,
    drift: 0.2 + Math.random() * 0.7,
  });

  const rebuild = () => {
    const bounds = container.getBoundingClientRect();
    const devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    depth = Math.max(520, width * 0.95);
    particleCount = width < 700 ? 34 : 56;

    canvas.width = Math.round(width * devicePixelRatio);
    canvas.height = Math.round(height * devicePixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
    particles = Array.from({ length: particleCount }, makeParticle);
  };

  rebuild();
  const resizeObserver = new ResizeObserver(rebuild);
  resizeObserver.observe(container);

  // 粒子只做“伪 3D 投影”，不引第三方库，后期调参数时主要看 spread / focal / linkDistance。
  const render = (now) => {
    const time = now * 0.00042;
    const pointer = getPointerOffset();
    const rotationY = time * 0.55 + pointer.x * 0.95;
    const rotationX = Math.sin(time * 0.8) * 0.22 + pointer.y * 0.65;
    const centerX = width * 0.54;
    const centerY = height * 0.48;
    const focal = width * 0.72;
    const projected = [];

    context.clearRect(0, 0, width, height);
    context.globalCompositeOperation = "source-over";

    particles.forEach((particle) => {
      const driftZ = particle.z + Math.sin(time * particle.drift + particle.x * 0.01) * 26;
      const cosY = Math.cos(rotationY);
      const sinY = Math.sin(rotationY);
      const cosX = Math.cos(rotationX);
      const sinX = Math.sin(rotationX);

      const rotatedX = particle.x * cosY - driftZ * sinY;
      const rotatedZ = particle.x * sinY + driftZ * cosY;
      const rotatedY = particle.y * cosX - rotatedZ * sinX;
      const finalZ = rotatedY * sinX + rotatedZ * cosX + depth;
      const scale = focal / finalZ;
      const screenX = centerX + rotatedX * scale;
      const screenY = centerY + rotatedY * scale;
      const radius = particle.size * scale * 2.2;

      projected.push({
        x: screenX,
        y: screenY,
        z: finalZ,
        radius,
        alpha: Math.max(0.12, Math.min(0.9, scale * 2.4)),
      });
    });

    context.save();
    context.globalCompositeOperation = "lighter";

    for (let i = 0; i < projected.length; i += 1) {
      const from = projected[i];

      for (let j = i + 1; j < projected.length; j += 1) {
        const to = projected[j];
        const dx = from.x - to.x;
        const dy = from.y - to.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 128) {
          const strength = 1 - distance / 128;
          context.strokeStyle = `rgba(132, 210, 255, ${strength * 0.16})`;
          context.lineWidth = strength * 1.2;
          context.beginPath();
          context.moveTo(from.x, from.y);
          context.lineTo(to.x, to.y);
          context.stroke();
        }
      }
    }

    projected.forEach((point, index) => {
      const hue = index % 5 === 0 ? "255, 140, 98" : "146, 217, 255";

      context.fillStyle = `rgba(${hue}, ${point.alpha})`;
      context.beginPath();
      context.arc(point.x, point.y, Math.max(0.8, point.radius), 0, Math.PI * 2);
      context.fill();
    });

    context.restore();
    requestAnimationFrame(render);
  };

  requestAnimationFrame(render);
}
