

// JavaScript for Affect Coordinates website

// Step 1: Find important elements from the HTML

const enterMapButton = document.getElementById("enterMapButton");
const mapSection = document.getElementById("mapSection");
const statusMessage = document.getElementById("statusMessage");
const map = document.getElementById("vaMap");
const imageModal = document.getElementById("imageModal");
const modalBody = document.getElementById("modalBody");
const closeModalButton = document.getElementById("closeModal");
const goMethodButton = document.getElementById("goMethodButton");
const backToMapButton = document.getElementById("backToMapButton");

const openLimitsPanelButton = document.getElementById("openLimitsPanelButton");
const limitsPanel = document.getElementById("limitsPanel");
const closeLimitsPanelButton = document.getElementById("closeLimitsPanelButton");
const limitsGoAmbiguousButton = document.getElementById("limitsGoAmbiguousButton");
const heroSection = document.getElementById("heroSection");
const backToHomeButtons = document.querySelectorAll(".back-to-home-button");

const openDataUsePanelButton = document.getElementById("openDataUsePanelButton"); 
const dataUsePanel = document.getElementById("dataUsePanel"); 
const closeDataUsePanelButton = document.getElementById("closeDataUsePanelButton");

const methodSection = document.getElementById("methodSection");
const initialMiniPlot = document.getElementById("initialMiniPlot");
const calibratedMiniPlot = document.getElementById("calibratedMiniPlot");
const miniPlotTooltip = document.getElementById("miniPlotTooltip");
const ambiguousSection = document.getElementById("ambiguousSection");
const ambiguousGrid = document.getElementById("ambiguousGrid");
const ambiguousModal = document.getElementById("ambiguousModal");
const ambiguousModalBody = document.getElementById("ambiguousModalBody");
const closeAmbiguousModal = document.getElementById("closeAmbiguousModal");
const backToMethodButton = document.getElementById("backToMethodButton");
const goAudienceButton = document.getElementById("goAudienceButton");
const audienceSection = document.getElementById("audienceSection");
const audienceRatingForm = document.getElementById("audienceRatingForm");
const audienceSubmitMessage = document.getElementById("audienceSubmitMessage");
const audienceAgeGroup = document.getElementById("audienceAgeGroup");
const audienceGender = document.getElementById("audienceGender");
const audienceRatingGrid = document.getElementById("audienceRatingGrid");
const audienceResultSection = document.getElementById("audienceResultSection");
const audienceResultGrid = document.getElementById("audienceResultGrid");
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxJDHoZIOq1ejAQXmvXeDrNBsTsxb7_phNN9b-lC_jSB112HALrMfXm0HPdu5DXM8zhqg/exec";

const audioLangButtons = document.querySelectorAll(".audio-lang-button");
const audioLangPanels = document.querySelectorAll(".audio-language-panel");

let allImagesData = [];
let currentAudienceImages = [];
let ambiguousCasesData = [];
const audienceSessionId = `session_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

// Step 2: Scroll from cover to map

enterMapButton.addEventListener("click", () => {
  mapSection.classList.remove("map-visible");

  setTimeout(() => {
    mapSection.classList.add("map-visible");

    mapSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }, 30);
});

// Step 3: Close image modal

closeModalButton.addEventListener("click", () => {
  imageModal.classList.add("hidden");
});

imageModal.addEventListener("click", (event) => {
  if (event.target === imageModal) {
    imageModal.classList.add("hidden");
  }
});

// Step 4: Load image data from data.json and audience.json

Promise.all([
  fetch("data.json").then(response => {
    if (!response.ok) {
      throw new Error(`Could not load data.json: ${response.status}`);
    }

    return response.json();
  }),

  fetch("audience_ratings.json")
    .then(response => {
      if (!response.ok) {
        throw new Error(
          `Could not load audience_ratings.json: ${response.status}`
        );
      }

      return response.json();
    })
    .catch(error => {
      console.warn("Audience ratings could not be loaded:", error);

      return {
        ratings: {}
      };
    })
])
  .then(([images, audienceData]) => {
    const ratingsByImage = audienceData.ratings || {};

    const imagesWithAudienceRatings = images.map(image => {
      const audienceRating = ratingsByImage[image.image_id];

      if (!audienceRating) {
        return {
          ...image,
          audience_valence: null,
          audience_arousal: null,
          responses: 0
        };
      }

      return {
        ...image,
        audience_valence: audienceRating.audience_valence_norm,
        audience_arousal: audienceRating.audience_arousal_norm,
        responses: audienceRating.response_count
      };
    });

    allImagesData = imagesWithAudienceRatings;

    statusMessage.textContent =
      `Loaded ${imagesWithAudienceRatings.length} images.`;

    console.log(
      "Loaded image data with audience ratings:",
      imagesWithAudienceRatings
    );

    renderMapPoints(imagesWithAudienceRatings);
    renderAudienceRatingCards(imagesWithAudienceRatings);

    if (ambiguousCasesData.length > 0) {
      renderMiniPlots(ambiguousCasesData);
    }
  })
  .catch(error => {
    statusMessage.textContent = "Could not load image data.";
    console.error("Data loading error:", error);
  });

// Step 5: Render image points on the 2D map

function renderMapPoints(images) {
  images.forEach(image => {
    const valence = Number(image.V_cal);
    const arousal = Number(image.A_cal);

    // Skip this image if V_cal or A_cal is missing
    if (Number.isNaN(valence) || Number.isNaN(arousal)) {
      return;
    }

    const point = document.createElement("button");
    point.className = "image-point";
    point.type = "button";

    // Add a colour class according to the final quadrant
    if (image.quadrant_final === "High Valence / High Arousal") {
      point.classList.add("q-hh");
    } else if (image.quadrant_final === "Low Valence / High Arousal") {
      point.classList.add("q-lh");
    } else if (image.quadrant_final === "Low Valence / Low Arousal") {
      point.classList.add("q-ll");
    } else if (image.quadrant_final === "High Valence / Low Arousal") {
      point.classList.add("q-hl");
    }

    // Add a small visual jitter so overlapping points are easier to see.
    // This does not change the original V_cal / A_cal data.
    const jitterAmount = 1.5;

    const seedText = image.image_id || image.local_filename || "";
    let seed = 0;

    for (let i = 0; i < seedText.length; i++) {
        seed += seedText.charCodeAt(i);
    }

    const jitterX = ((seed % 100) / 100 - 0.5) * jitterAmount;
    const jitterY = (((seed * 7) % 100) / 100 - 0.5) * jitterAmount;

    // Base position from calibrated coordinates
    const baseX = 8 + valence * 84;
    const baseY = 8 + arousal * 84;

    // Reduce jitter near the centre lines so points do not visually cross quadrants
    const distanceFromVerticalCentre = Math.abs(valence - 0.5);
    const distanceFromHorizontalCentre = Math.abs(arousal - 0.5);

    const safeJitterX = jitterX * Math.min(1, distanceFromVerticalCentre / 0.08);
    const safeJitterY = jitterY * Math.min(1, distanceFromHorizontalCentre / 0.08);

    const x = baseX + safeJitterX;
    const y = baseY + safeJitterY;

    point.style.left = `${x}%`;
    point.style.bottom = `${y}%`;
    point.style.backgroundImage = `url('${image.image_path}')`;

    point.addEventListener("click", () => {
      openImageModal(image);
    });

    map.appendChild(point);
  });
}

// Step 6: Open modal with image details

function openImageModal(image) {
  const title = image.display_title || image.image_id || "Untitled image";

  let audienceBlock = "";

  if (
    image.responses &&
    Number(image.responses) > 0 &&
    image.audience_valence !== null &&
    image.audience_arousal !== null
  ) {
    audienceBlock = `
      <div class="modal-section">
        <h4>Audience Reading</h4>
        <p>Average Valence: ${Number(image.audience_valence).toFixed(2)} / 1</p>
        <p>Average Arousal: ${Number(image.audience_arousal).toFixed(2)} / 1</p>
        <p>Responses: ${image.responses}</p>
      </div>
    `;
  } else {
    audienceBlock = `
      <div class="modal-section">
        <h4>Audience Reading</h4>
        <p>Waiting for response</p>
      </div>
    `;
  }

  modalBody.innerHTML = `
    <div class="modal-image-wrap">
      <img src="${image.image_path}" alt="${title}" class="modal-image" />
    </div>

    <div class="modal-text">
      <h3>${title}</h3>

      <p><strong>Image ID:</strong> ${image.image_id || "N/A"}</p>
      <p><strong>Photo by:</strong> ${image.photographer || "Unknown"} · <strong>Source:</strong> Pexels</p>

      ${
        image.pexels_url
          ? `
          <p><a href="${image.pexels_url}" target="_blank" rel="noopener noreferrer">View original on Pexels</a></p>
          <p class="pexels-access-note">
            (If the Pexels link does not open, it may be due to regional access, VPN, or browser restrictions.)
          </p>
          `
          : ""
      }

      <div class="modal-section">
        <h4>Mapped Position</h4>
        <p>Valence: ${Number(image.V_cal).toFixed(2)} / 1</p>
        <p>Arousal: ${Number(image.A_cal).toFixed(2)} / 1</p>
        <p>Quadrant: ${image.quadrant_final || "N/A"}</p>
      </div>

      ${audienceBlock}
    </div>
  `;

  imageModal.classList.remove("hidden");
}

const mapObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      mapSection.classList.add("map-visible");
    } else {
      mapSection.classList.remove("map-visible");
    }
  });
}, {
  threshold: 0.20
});

mapObserver.observe(mapSection);

// Move between map and method page

goMethodButton.addEventListener("click", () => {
  methodSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

backToMapButton.addEventListener("click", () => {
  mapSection.classList.add("map-visible");

  mapSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
});

if (heroSection) {
  backToHomeButtons.forEach(button => {
    button.addEventListener("click", () => {
      heroSection.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });
}

/* Theory and Limits panel */
if (openLimitsPanelButton && limitsPanel) {
  openLimitsPanelButton.addEventListener("click", () => {
    limitsPanel.classList.remove("hidden");
  });
}

if (closeLimitsPanelButton && limitsPanel) {
  closeLimitsPanelButton.addEventListener("click", () => {
    limitsPanel.classList.add("hidden");
  });
}

if (limitsPanel) {
  limitsPanel.addEventListener("click", (event) => {
    if (event.target === limitsPanel) {
      limitsPanel.classList.add("hidden");
    }
  });
}

if (limitsGoAmbiguousButton && limitsPanel && ambiguousSection) {
  limitsGoAmbiguousButton.addEventListener("click", () => {
    limitsPanel.classList.add("hidden");

    ambiguousSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

if (openDataUsePanelButton && dataUsePanel) {
  openDataUsePanelButton.addEventListener("click", () => {
    dataUsePanel.classList.remove("hidden");
  });
}

if (closeDataUsePanelButton && dataUsePanel) {
  closeDataUsePanelButton.addEventListener("click", () => {
    dataUsePanel.classList.add("hidden");
  });
}

if (dataUsePanel) {
  dataUsePanel.addEventListener("click", (event) => {
    if (event.target === dataUsePanel) {
      dataUsePanel.classList.add("hidden");
    }
  });
}

// Step 7: Reveal method sections while scrolling

const revealElements = document.querySelectorAll(".reveal-on-scroll");

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
    } else {
      entry.target.classList.remove("is-visible");
    }
  });
}, {
  threshold: 0.18
});

revealElements.forEach(element => {
  revealObserver.observe(element);
});

// Cover navigation buttons

document.querySelectorAll(".hero-nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.dataset.target;
    const targetElement = document.getElementById(targetId);

    if (!targetElement) {
      console.log(`Section not found yet: ${targetId}`);
      return;
    }

    if (targetId === "mapSection") {
      targetElement.classList.add("map-visible");
    }

    targetElement.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
});

// Step 8: Load and render Ambiguous Readings

fetch("selected_ambiguous_cases.csv")
  .then(response => response.text())
  .then(csvText => {
    const ambiguousCases = parseCSV(csvText);
    ambiguousCasesData = ambiguousCases;

    console.log("Loaded ambiguous cases:", ambiguousCases);
    renderAmbiguousCases(ambiguousCases);
    renderMiniPlots(ambiguousCases);
  })
  .catch(error => {
    console.error("Could not load selected_ambiguous_cases.csv:", error);

    if (ambiguousGrid) {
      ambiguousGrid.innerHTML = `
        <p class="ambiguous-error">
          Could not load ambiguous readings.
        </p>
      `;
    }
  });

function parseCSV(csvText) {
  const lines = csvText.trim().split("\n");
  const headers = lines[0].split(",").map(header => header.trim());

  return lines.slice(1).map(line => {
    const values = splitCSVLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ? values[index].trim() : "";
    });

    return row;
  });
}

function splitCSVLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function renderAmbiguousCases(cases) {
  if (!ambiguousGrid) return;

  ambiguousGrid.innerHTML = "";

  cases.forEach((image, index) => {
    const card = document.createElement("article");
    card.className = "ambiguous-case-card reveal-on-scroll";

    const number = String(index + 1).padStart(2, "0");
    const title = image.display_title || `Ambiguous ${number}`;
    const category = image.category || "Image";

    // CSV contains names like ambiguous_1, ambiguous_2.
    // JS turns them into ambiguous_images/ambiguous_1.jpeg.
    const imageName = image.new_id || `ambiguous_${String(index + 1).padStart(2, "0")}`;
    const imageSrc = `ambiguous_images/${imageName}.jpeg`;

    card.innerHTML = `
      <div class="ambiguous-card-image-wrap">
        <span class="ambiguous-card-number">${number}</span>
        <img
          src="${imageSrc}"
          alt="${title}"
          class="ambiguous-card-image"
        />
      </div>

      <div class="ambiguous-card-body">
        <h4>${title}</h4>
        <p class="ambiguous-card-meta">${category}</p>

    <div class="ambiguous-score-stack">
      <div class="ambiguous-score-box">
        <h5>Initial Model Reading</h5>
        <div class="ambiguous-score-row">
          <span>V ${formatScore(image.V_model)}</span>
          <span>A ${formatScore(image.A_model)}</span>
        </div>
      </div>

      <div class="ambiguous-score-box">
        <h5>Author Rating</h5>
        <div class="ambiguous-score-row">
          <span>V ${formatScore(image.V_manual_norm)}</span>
          <span>A ${formatScore(image.A_manual_norm)}</span>
        </div>
      </div>

      <div class="ambiguous-score-box">
        <h5>Calibrated Map Position</h5>
        <div class="ambiguous-score-row">
          <span>V ${formatScore(image.V_cal)}</span>
          <span>A ${formatScore(image.A_cal)}</span>
        </div>
      </div>
    </div>

        <button class="ambiguous-open-button" type="button">
          Open Reading
        </button>
      </div>
    `;

    const openButton = card.querySelector(".ambiguous-open-button");

    openButton.addEventListener("click", () => {
      openAmbiguousModal(image, imageSrc, number, title, category);
    });

    ambiguousGrid.appendChild(card);
  });

  observeNewRevealElements();
}

function formatScore(value) {
  const number = Number(value);

  if (Number.isNaN(number)) {
    return "N/A";
  }

  return number.toFixed(2);
}

function getCloseReading(imageId) {
  const template = document.querySelector(
    `#ambiguousReadingTemplates [data-reading-id="${imageId}"]`
  );

  if (!template) {
    return "<p>Close reading coming soon.</p>";
  }

  return template.innerHTML;
}

function openAmbiguousModal(image, imageSrc, number, title, category) {
  const closeReading = getCloseReading(image.image_id);

  ambiguousModalBody.innerHTML = `
    <div class="ambiguous-modal-layout">
      <div>
        <img
          src="${imageSrc}"
          alt="${title}"
          class="ambiguous-modal-image"
        />
      </div>

      <div class="ambiguous-modal-text">
        <p class="ambiguous-eyebrow">Ambiguous Reading ${number}</p>
        <h3 id="ambiguousModalTitle">${title}</h3>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>Image ID:</strong> ${image.image_id || "N/A"}</p>

        <div class="ambiguous-score-stack">
          <div class="ambiguous-score-box">
            <h5>Initial Model Reading</h5>
            <div class="ambiguous-score-row">
              <span>V ${formatScore(image.V_model)}</span>
              <span>A ${formatScore(image.A_model)}</span>
            </div>
          </div>

          <div class="ambiguous-score-box">
            <h5>Author Rating</h5>
            <div class="ambiguous-score-row">
              <span>V ${formatScore(image.V_manual_norm)}</span>
              <span>A ${formatScore(image.A_manual_norm)}</span>
            </div>
          </div>

          <div class="ambiguous-score-box">
            <h5>Calibrated Map Position</h5>
            <div class="ambiguous-score-row">
              <span>V ${formatScore(image.V_cal)}</span>
              <span>A ${formatScore(image.A_cal)}</span>
            </div>
          </div>
        </div>

        <div class="ambiguous-close-reading">
          <h4>Close Reading</h4>
          ${closeReading}
        </div>
      </div>
    </div>
  `;

  ambiguousModal.classList.remove("hidden");
}

if (closeAmbiguousModal) {
  closeAmbiguousModal.addEventListener("click", () => {
    ambiguousModal.classList.add("hidden");
  });
}

if (ambiguousModal) {
  ambiguousModal.addEventListener("click", event => {
    if (event.target === ambiguousModal) {
      ambiguousModal.classList.add("hidden");
    }
  });
}

if (backToMethodButton && methodSection) {
  backToMethodButton.addEventListener("click", () => {
    methodSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

if (goAudienceButton && audienceSection) {
  goAudienceButton.addEventListener("click", () => {
    audienceSection.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  });
}

function observeNewRevealElements() {
  const newRevealElements = document.querySelectorAll(
    ".ambiguous-case-card.reveal-on-scroll"
  );

  newRevealElements.forEach(element => {
    revealObserver.observe(element);
  });
}

function renderMiniPlots(cases) {
  if (!initialMiniPlot || !calibratedMiniPlot) return;

  initialMiniPlot.innerHTML = "";
  calibratedMiniPlot.innerHTML = "";

// Add selected ambiguous cases as larger interactive points
  cases.forEach((image, index) => {
    const imageName = image.new_id || `ambiguous_${String(index + 1).padStart(2, "0")}`;
    const imageSrc = `ambiguous_images/${imageName}.jpeg`;

    const initialDot = createMiniPlotDot({
      x: Number(image.V_model),
      y: Number(image.A_model),
      image,
      imageSrc
    });

    const calibratedDot = createMiniPlotDot({
      x: Number(image.V_cal),
      y: Number(image.A_cal),
      image,
      imageSrc
    });

    initialMiniPlot.appendChild(initialDot);
    calibratedMiniPlot.appendChild(calibratedDot);
  });
}

function createMiniPlotDot({ x, y, image, imageSrc }) {
  const dot = document.createElement("button");
  dot.type = "button";
  dot.className = "mini-map-dot";

  if (Number.isNaN(x) || Number.isNaN(y)) {
    dot.style.display = "none";
    return dot;
  }

  const xPos = Math.max(0, Math.min(100, x * 100));
  const yPos = Math.max(0, Math.min(100, y * 100));

  dot.style.left = `${xPos}%`;
  dot.style.bottom = `${yPos}%`;

  dot.addEventListener("mouseenter", event => {
    showMiniTooltip(event, image, imageSrc);
  });

  dot.addEventListener("mousemove", event => {
    moveMiniTooltip(event);
  });

  dot.addEventListener("mouseleave", () => {
    hideMiniTooltip();
  });

  return dot;
}

function showMiniTooltip(event, image, imageSrc) {
  if (!miniPlotTooltip) return;

  const title = image.display_title || image.image_id || "Untitled";

  miniPlotTooltip.innerHTML = `
    <img src="${imageSrc}" alt="${title}">
    <h5>${title}</h5>
  `;

  miniPlotTooltip.classList.remove("hidden");
  moveMiniTooltip(event);
}

function moveMiniTooltip(event) {
  if (!miniPlotTooltip) return;

  miniPlotTooltip.style.left = `${event.clientX + 16}px`;
  miniPlotTooltip.style.top = `${event.clientY + 16}px`;
}

function hideMiniTooltip() {
  if (!miniPlotTooltip) return;

  miniPlotTooltip.classList.add("hidden");
}

function renderAudienceRatingCards(images) {
  if (!audienceRatingGrid) return;

  const validImages = images.filter(image => {
    return image.image_path && image.image_id;
  });

  currentAudienceImages = getRandomItems(validImages, 5);

  audienceRatingGrid.innerHTML = "";

  currentAudienceImages.forEach((image, index) => {
    const number = String(index + 1).padStart(2, "0");
    const title = image.display_title || `Image ${number}`;

    const card = document.createElement("article");
    card.className = "audience-rating-card";
    card.dataset.imageId = image.image_id;

    card.innerHTML = `
    <div class="audience-rating-image-wrap">
      <img
        src="${image.image_path}"
        alt="${title}"
        class="audience-rating-image"
      />
     </div>

     <div class="audience-rating-content">
       <h4>Image ${number}</h4>

        <div class="rating-control">
          <div class="rating-control-header">
            <span>Valence</span>
            <strong id="valenceValue-${index}">5</strong>
        </div>

          <input
            type="range"
            min="1"
            max="9"
            value="5"
            step="1"
            name="valence-${index}"
            data-rating-type="valence"
            data-index="${index}"
          />

          <div class="rating-scale-labels">
            <span>Unpleasant</span>
            <span>Pleasant</span>
          </div>
        </div>

        <div class="rating-control">
          <div class="rating-control-header">
            <span>Arousal</span>
            <strong id="arousalValue-${index}">5</strong>
          </div>

          <input
            type="range"
            min="1"
            max="9"
            value="5"
            step="1"
            name="arousal-${index}"
            data-rating-type="arousal"
            data-index="${index}"
          />

          <div class="rating-scale-labels">
            <span>Calm</span>
            <span>Intense</span>
          </div>
        </div>
      </div>
    `;

    audienceRatingGrid.appendChild(card);
  });

  setupAudienceSliders();
}

function getRandomItems(array, count) {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const randomIndex = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[i]];
  }

  return shuffled.slice(0, count);
}

function setupAudienceSliders() {
  const sliders = audienceRatingGrid.querySelectorAll('input[type="range"]');

  sliders.forEach(slider => {
    slider.addEventListener("input", event => {
      const index = event.target.dataset.index;
      const ratingType = event.target.dataset.ratingType;
      const value = event.target.value;

      const valueElement = document.getElementById(`${ratingType}Value-${index}`);

      if (valueElement) {
        valueElement.textContent = value;
      }
    });
  });
}

function collectAudienceRatings() {
  const ageGroup = audienceAgeGroup ? audienceAgeGroup.value : "";
  const gender = audienceGender ? audienceGender.value : "";

  return currentAudienceImages.map((image, index) => {
    const valenceInput = audienceRatingGrid.querySelector(
      `input[name="valence-${index}"]`
    );

    const arousalInput = audienceRatingGrid.querySelector(
      `input[name="arousal-${index}"]`
    );

    const userValence = Number(valenceInput.value);
    const userArousal = Number(arousalInput.value);

    return {
      image_id: image.image_id,
      display_title: image.display_title || `Image ${index + 1}`,
      category: image.category || "",
      image_path: image.image_path,

      user_valence_1_9: userValence,
      user_arousal_1_9: userArousal,

      user_valence_norm: (userValence - 1) / 8,
      user_arousal_norm: (userArousal - 1) / 8,

      V_cal: Number(image.V_cal),
      A_cal: Number(image.A_cal),

      age_group: ageGroup,
      gender: gender
    };
  });
}

function renderAudienceResults(ratings) {
  if (!audienceResultSection || !audienceResultGrid) return;

  audienceResultGrid.innerHTML = "";

  ratings.forEach((rating, index) => {
    const number = String(index + 1).padStart(2, "0");

    const calValence9 = Number.isNaN(rating.V_cal)
      ? null
      : rating.V_cal * 8 + 1;

    const calArousal9 = Number.isNaN(rating.A_cal)
      ? null
      : rating.A_cal * 8 + 1;

    const card = document.createElement("article");
    card.className = "audience-result-card";

    card.innerHTML = `
      <img src="${rating.image_path}" alt="Rated image ${number}" />

      <div>
        <h4>Image ${number}</h4>

        <div class="audience-result-values">
          <div>
            <h5>Your Reading</h5>
            <p>Valence: ${rating.user_valence_1_9} / 9</p>
            <p>Arousal: ${rating.user_arousal_1_9} / 9</p>
          </div>

          <div>
            <h5>Calibrated Map Position</h5>
            <p>Valence: ${calValence9 === null ? "N/A" : calValence9.toFixed(1)} / 9</p>
            <p>Arousal: ${calArousal9 === null ? "N/A" : calArousal9.toFixed(1)} / 9</p>
          </div>
        </div>
      </div>
    `;

    audienceResultGrid.appendChild(card);
  });

  audienceResultSection.classList.remove("hidden");

  audienceResultSection.scrollIntoView({
    behavior: "smooth",
    block: "start"
  });
}

if (audienceRatingForm) {
  audienceRatingForm.addEventListener("submit", async event => {
    event.preventDefault();

    const audienceRatings = collectAudienceRatings();

    if (audienceSubmitMessage) {
      audienceSubmitMessage.textContent = "Submitting your reading...";
    }

    try {
      await sendAudienceRatings(audienceRatings);

      if (audienceSubmitMessage) {
        audienceSubmitMessage.textContent = "Thank you. Your ratings have been recorded.";
      }

      renderAudienceResults(audienceRatings);

    } catch (error) {
      console.error("Audience submission error:", error);

      if (audienceSubmitMessage) {
        audienceSubmitMessage.textContent =
          "Sorry, your ratings could not be submitted. Please try again.";
      }
    }
  });
}

async function sendAudienceRatings(ratings) {
  const payload = {
    session_id: audienceSessionId,
    ratings: ratings
  };

  await fetch(GOOGLE_SCRIPT_URL, {
    method: "POST",
    mode: "no-cors",
    headers: {
      "Content-Type": "text/plain;charset=utf-8"
    },
    body: JSON.stringify(payload)
  });
}

audioLangButtons.forEach(button => {
  button.addEventListener("click", () => {
    const selectedLang = button.dataset.lang;

    document.querySelectorAll("audio").forEach(audio => {
      audio.pause();
    });

    audioLangButtons.forEach(item => {
      item.classList.remove("active");
    });

    audioLangPanels.forEach(panel => {
      panel.classList.remove("active");
    });

    button.classList.add("active");

    const selectedPanel = document.querySelector(`[data-lang-panel="${selectedLang}"]`);

    if (selectedPanel) {
      selectedPanel.classList.add("active");
    }
  });
});

