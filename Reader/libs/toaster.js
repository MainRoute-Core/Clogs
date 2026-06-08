window.UniversalToasterConfig = {
  backgroundColor: "#000", // e.g. "#333" or null
  textColor: "#fff", // e.g. "#fff" or null

  fontFamily: "inherit", // Uses page font
  fontSize: "14px",
  fontWeight: "500",
  fontTransform: "capitalize", // e.g. "uppercase", "lowercase", "capitalize"  or null

  borderRadius: "10px",
  padding: "6px 10px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
};

/**
 * Universal Toaster (v3.0 - Rich Text & Styles)
 * ------------------------------------------------------------------
 */

(function () {
  const userConfig = window.UniversalToasterConfig || {};
  const settings = {
    bg: userConfig.backgroundColor || null,
    text: userConfig.textColor || null,
    font: userConfig.fontFamily || "inherit",
    size: userConfig.fontSize || "13px",
    radius: userConfig.borderRadius || "6px",
    padding: userConfig.padding || "8px 12px",
    shadow: userConfig.boxShadow || "0 4px 12px rgba(0,0,0,0.2)",
  };
  const css = `
        .universal-toaster-popup {
            position: fixed;
            z-index: 2147483647;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.1s ease-out;
            visibility: hidden;
            border-radius: ${settings.radius};
            font-size: ${settings.size};
            font-family: ${settings.font};
            padding: ${settings.padding};
            box-shadow: ${settings.shadow};
            white-space: pre-wrap; /* Changed to allow flexibility with formatting */
            max-width: 90vw;
            line-height: 1.4;
        }
        .universal-toaster-popup.visible {
            opacity: 1;
            visibility: visible;
        }
        .universal-toaster-popup span {
            display: inline-block;
        }
    `;
  const styleSheet = document.createElement("style");
  styleSheet.textContent = css;
  document.head.appendChild(styleSheet);
  const tooltip = document.createElement("div");
  tooltip.className = "universal-toaster-popup";
  document.body.appendChild(tooltip);
  let activeElement = null;
  const loadedFonts = new Set();

  function escapeHtml(text) {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function loadGoogleFont(fontName) {
    if (!fontName || loadedFonts.has(fontName)) return;
    const link = document.createElement("link");
    link.href = `https://fonts.googleapis.com/css?family=${fontName.replace(/\s+/g, "+")}&display=swap`;
    link.rel = "stylesheet";
    document.head.appendChild(link);
    loadedFonts.add(fontName);
  }

  function parseCustomSyntax(rawText) {
    let text = escapeHtml(rawText);

    text = text.replace(/&amp;(fz|cl|bgcl|fw|fn|chr)=/g, "&$1=");
    text = text.replace(/&amp;(fz|cl|bgcl|fw|fn|chr);/g, "&$1;");
    text = text.replace(/&chr=(\d+);(.*?)&chr;/g, (match, limit, content) => {
      if (content.length > parseInt(limit)) {
        return content.substring(0, parseInt(limit)) + "...";
      }
      return content;
    });
    text = text.replace(/&fn=(.*?);/g, (match, fontName) => {
      loadGoogleFont(fontName);
      return `<span style="font-family:'${fontName}', sans-serif">`;
    });
    text = text.replace(/&fn;/g, "</span>");
    const replacers = [
      { tag: "fz", css: "font-size" },
      { tag: "cl", css: "color" },
      { tag: "bgcl", css: "background-color" },
      { tag: "fw", css: "font-weight" },
    ];
    replacers.forEach((item) => {
      const openerRegex = new RegExp(`&${item.tag}=(.*?);`, "g");
      text = text.replace(openerRegex, `<span style="${item.css}:$1">`);
      const closerRegex = new RegExp(`&${item.tag};`, "g");
      text = text.replace(closerRegex, "</span>");
    });
    return text;
  }

  function applyTheme() {
    if (settings.bg && settings.text) {
      tooltip.style.backgroundColor = settings.bg;
      tooltip.style.color = settings.text;
      return;
    }
    let computedStyle = window.getComputedStyle(document.body);
    let bgColor = computedStyle.backgroundColor;
    if (bgColor === "rgba(0, 0, 0, 0)" || bgColor === "transparent")
      bgColor = "rgb(255, 255, 255)";
    const rgb = bgColor.match(/\d+/g);
    let isLightPage = true;
    if (rgb) {
      const brightness = Math.round(
        (parseInt(rgb[0]) * 299 +
          parseInt(rgb[1]) * 587 +
          parseInt(rgb[2]) * 114) /
          1000,
      );
      if (brightness < 125) isLightPage = false;
    }
    if (isLightPage) {
      tooltip.style.backgroundColor = "#222222";
      tooltip.style.color = "#ffffff";
    } else {
      tooltip.style.backgroundColor = "#ffffff";
      tooltip.style.color = "#000000";
    }
  }

  const hideTooltip = () => {
    if (activeElement) {
      tooltip.classList.remove("visible");
      activeElement = null;
    }
  };

  document.addEventListener("mouseover", (e) => {
    const target = e.target.closest("[title], [data-toaster-title]");
    if (target) {
      if (target.hasAttribute("title")) {
        const raw = target.getAttribute("title");
        if (raw && raw.trim()) {
          target.setAttribute("data-toaster-title", raw);
          target.removeAttribute("title");
        }
      }
      const rawText = target.getAttribute("data-toaster-title");
      if (rawText) {
        activeElement = target;

        renderToTooltip(rawText);
        applyTheme();
        tooltip.classList.add("visible");
      }
    }
  });

  function renderToTooltip(rawText) {
    tooltip.innerHTML = "";
    const fragment = document.createDocumentFragment();
    const parts = rawText.split(
      /(&(?:fz|cl|bgcl|fw|fn|chr)=.*?;|&(?:fz|cl|bgcl|fw|fn|chr);)/g,
    );
    let currentSpan = document.createElement("span");
    parts.forEach((part) => {
      if (!part) return;
      let match = part.match(/^&(fz|cl|bgcl|fw|fn)=(.*?);$/);
      if (match) {
        const [, tag, value] = match;
        const span = document.createElement("span");
        switch (tag) {
          case "cl":
            span.style.color = value;
            break;
          case "bgcl":
            span.style.backgroundColor = value;
            break;
          case "fz":
            span.style.fontSize = value;
            break;
          case "fw":
            span.style.fontWeight = value;
            break;
          case "fn":
            loadGoogleFont(value);
            span.style.fontFamily = `'${value}', sans-serif`;
            break;
        }
        fragment.appendChild(currentSpan);
        currentSpan = span;
        return;
      }
      if (/^&(fz|cl|bgcl|fw|fn);$/.test(part)) {
        fragment.appendChild(currentSpan);
        currentSpan = document.createElement("span");
        return;
      }
      const textNode = document.createTextNode(part);
      currentSpan.appendChild(textNode);
    });
    fragment.appendChild(currentSpan);
    tooltip.appendChild(fragment);
  }

  document.addEventListener("mousemove", (e) => {
    if (!activeElement || !activeElement.isConnected) {
      hideTooltip();
      return;
    }
    if (!tooltip.classList.contains("visible")) return;
    const rect = tooltip.getBoundingClientRect();
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    const offset = 15;
    let x = e.clientX + offset;
    let y = e.clientY + offset;
    if (x + rect.width > winW) x = e.clientX - rect.width - offset;
    if (y + rect.height > winH) y = e.clientY - rect.height - offset;
    tooltip.style.left = `${x}px`;
    tooltip.style.top = `${y}px`;
  });

  document.addEventListener("mouseout", (e) => {
    const target = e.target.closest("[data-toaster-title]");
    if (target && target === activeElement) {
      hideTooltip();
    }
  });
  window.addEventListener("mousedown", hideTooltip);
  window.addEventListener("scroll", hideTooltip, true);
  window.addEventListener("blur", hideTooltip);
})();
