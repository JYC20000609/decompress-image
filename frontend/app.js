const API_BASE_URL = "http://127.0.0.1:8000";

const FORMAT_OPTIONS = [
  { label: "JPEG", value: "jpeg" },
  { label: "WebP", value: "webp" },
  { label: "PNG", value: "png" },
];
const INSIGHT_TOOLS = new Set(["resize", "crop", "color"]);

const TOOL_CONFIG = {
  compress: {
    title: "图片压缩工作台",
    kicker: "压缩棚",
    description: "减小图片体积，也可以顺手限制最大宽高。",
    endpoint: "/api/compress",
    buttonText: "开始压缩",
    loadingText: "压缩中...",
    resultTitle: "压缩后",
    resultEmpty: "等待压缩",
    suffix: "compressed",
    controls: [
      choices("format", "输出格式", FORMAT_OPTIONS, "jpeg"),
      range("quality", "清晰度", 1, 95, 75, 1, "%"),
      number("max_width", "最大宽度", "不限"),
      number("max_height", "最大高度", "不限"),
    ],
  },
  resize: {
    title: "尺寸调整工作台",
    kicker: "尺寸棚",
    description: "按指定宽高缩放图片，可选择保持比例或拉伸到精确尺寸。",
    endpoint: "/api/resize",
    buttonText: "调整尺寸",
    loadingText: "调整中...",
    resultTitle: "调整后",
    resultEmpty: "等待调整",
    suffix: "resized",
    controls: [
      number("width", "目标宽度", "例如 1200"),
      number("height", "目标高度", "例如 800"),
      toggle("keep_aspect", "保持原图比例", true),
      choices("format", "输出格式", FORMAT_OPTIONS, "jpeg"),
      range("quality", "输出质量", 1, 95, 90, 1, "%"),
    ],
  },
  convert: {
    title: "格式转换工作台",
    kicker: "转换棚",
    description: "在 JPEG、WebP 和 PNG 之间转换图片格式。",
    endpoint: "/api/convert",
    buttonText: "转换格式",
    loadingText: "转换中...",
    resultTitle: "转换后",
    resultEmpty: "等待转换",
    suffix: "converted",
    controls: [
      choices("format", "目标格式", FORMAT_OPTIONS, "webp"),
      range("quality", "输出质量", 1, 95, 90, 1, "%"),
    ],
  },
  crop: {
    title: "图片裁剪工作台",
    kicker: "裁剪棚",
    description: "用像素坐标裁掉图片边缘，适合做固定区域截图。",
    endpoint: "/api/crop",
    buttonText: "裁剪图片",
    loadingText: "裁剪中...",
    resultTitle: "裁剪后",
    resultEmpty: "等待裁剪",
    suffix: "cropped",
    controls: [
      number("x", "起点 X", "0", "0"),
      number("y", "起点 Y", "0", "0"),
      number("width", "裁剪宽度", "例如 600", "600"),
      number("height", "裁剪高度", "例如 400", "400"),
      choices("format", "输出格式", FORMAT_OPTIONS, "jpeg"),
      range("quality", "输出质量", 1, 95, 90, 1, "%"),
    ],
  },
  watermark: {
    title: "水印处理工作台",
    kicker: "水印棚",
    description: "给图片添加文字水印，可调整位置、透明度和字号。",
    endpoint: "/api/watermark",
    buttonText: "添加水印",
    loadingText: "添加中...",
    resultTitle: "加水印后",
    resultEmpty: "等待水印",
    suffix: "watermarked",
    controls: [
      text("text", "水印文字", "Image Workshop"),
      select("position", "水印位置", [
        { label: "右下角", value: "bottom-right" },
        { label: "左下角", value: "bottom-left" },
        { label: "右上角", value: "top-right" },
        { label: "左上角", value: "top-left" },
        { label: "居中", value: "center" },
      ]),
      range("opacity", "透明度", 1, 100, 55, 1, "%"),
      number("size", "字号", "32", "32"),
      choices("format", "输出格式", FORMAT_OPTIONS, "jpeg"),
      range("quality", "输出质量", 1, 95, 90, 1, "%"),
    ],
  },
  color: {
    title: "色彩微调工作台",
    kicker: "调色棚",
    description: "调整亮度、对比度、饱和度和锐度。",
    endpoint: "/api/color",
    buttonText: "应用调色",
    loadingText: "调色中...",
    resultTitle: "调色后",
    resultEmpty: "等待调色",
    suffix: "color",
    controls: [
      range("brightness", "亮度", 0, 3, 1, 0.1, "x"),
      range("contrast", "对比度", 0, 3, 1, 0.1, "x"),
      range("saturation", "饱和度", 0, 3, 1, 0.1, "x"),
      range("sharpness", "锐度", 0, 4, 1, 0.1, "x"),
      choices("format", "输出格式", FORMAT_OPTIONS, "jpeg"),
      range("quality", "输出质量", 1, 95, 90, 1, "%"),
    ],
  },
  batch: {
    title: "批量处理工作台",
    kicker: "批量棚",
    description: "一次选择多张图片，统一压缩、缩放、转换或清理信息，结果会打包成 zip。",
    endpoint: "/api/batch",
    buttonText: "批量处理",
    loadingText: "打包中...",
    resultTitle: "批量包",
    resultEmpty: "等待打包",
    suffix: "batch",
    multiple: true,
    controls: [
      select("operation", "批量动作", [
        { label: "压缩", value: "compress" },
        { label: "尺寸调整", value: "resize" },
        { label: "格式转换", value: "convert" },
        { label: "信息清理", value: "metadata" },
      ]),
      choices("format", "输出格式", FORMAT_OPTIONS, "jpeg"),
      range("quality", "输出质量", 1, 95, 75, 1, "%"),
      number("max_width", "压缩最大宽度", "不限"),
      number("max_height", "压缩最大高度", "不限"),
      number("width", "调整目标宽度", "用于尺寸调整"),
      number("height", "调整目标高度", "用于尺寸调整"),
      toggle("keep_aspect", "尺寸调整保持比例", true),
    ],
  },
  metadata: {
    title: "信息清理工作台",
    kicker: "清理棚",
    description: "重新导出图片，去掉 EXIF 等元数据。",
    endpoint: "/api/metadata",
    buttonText: "清理信息",
    loadingText: "清理中...",
    resultTitle: "清理后",
    resultEmpty: "等待清理",
    suffix: "clean",
    controls: [
      choices("format", "输出格式", FORMAT_OPTIONS, "jpeg"),
      range("quality", "输出质量", 1, 95, 95, 1, "%"),
    ],
  },
};

const homeView = document.querySelector("#homeView");
const toolView = document.querySelector("#toolView");
const backHomeButton = document.querySelector("#backHomeButton");
const toolCards = document.querySelectorAll(".tool-card");
const workshopMessage = document.querySelector("#workshopMessage");
const toolKicker = document.querySelector("#toolKicker");
const toolTitle = document.querySelector("#toolTitle");
const toolDescription = document.querySelector("#toolDescription");
const sourceSummaryLabel = document.querySelector("#sourceSummaryLabel");
const resultSummaryLabel = document.querySelector("#resultSummaryLabel");
const thirdSummaryLabel = document.querySelector("#thirdSummaryLabel");
const form = document.querySelector("#toolForm");
const dynamicControls = document.querySelector("#dynamicControls");
const imageInput = document.querySelector("#imageInput");
const dropZone = document.querySelector("#dropZone");
const dropTitle = document.querySelector("#dropTitle");
const fileMeta = document.querySelector("#fileMeta");
const sourceInsights = document.querySelector("#sourceInsights");
const insightTitle = document.querySelector("#insightTitle");
const insightGrid = document.querySelector("#insightGrid");
const suggestionArea = document.querySelector("#suggestionArea");
const submitButton = document.querySelector("#submitButton");
const sourcePreview = document.querySelector("#sourcePreview");
const resultPreview = document.querySelector("#resultPreview");
const sourceSize = document.querySelector("#sourceSize");
const resultSize = document.querySelector("#resultSize");
const savingValue = document.querySelector("#savingValue");
const sourceMeta = document.querySelector("#sourceMeta");
const resultMeta = document.querySelector("#resultMeta");
const resultPreviewTitle = document.querySelector("#resultPreviewTitle");
const sourceFrame = document.querySelector("#sourceFrame");
const resultFrame = document.querySelector("#resultFrame");
const sourceEmpty = document.querySelector("#sourceEmpty");
const resultEmpty = document.querySelector("#resultEmpty");
const downloadLink = document.querySelector("#downloadLink");
const message = document.querySelector("#message");
const apiState = document.querySelector("#apiState");

let activeTool = null;
let selectedFiles = [];
let currentSourceUrl = null;
let currentResultUrl = null;
let workshopMessageTimer = null;
let originalImageInfo = null;
let analysisToken = 0;

toolCards.forEach((card) => {
  card.addEventListener("click", () => {
    navigateTo(card.dataset.tool);
  });
});

backHomeButton.addEventListener("click", () => {
  navigateTo("home");
});

window.addEventListener("hashchange", () => {
  showView(viewFromHash());
});

imageInput.addEventListener("change", () => {
  setSelectedFiles(Array.from(imageInput.files || []));
});

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  });
});

dropZone.addEventListener("drop", (event) => {
  const files = Array.from(event.dataTransfer.files || []).filter((file) => file.type.startsWith("image/"));
  if (files.length > 0) {
    setSelectedFiles(files);
  }
});

suggestionArea.addEventListener("click", (event) => {
  const button = event.target.closest("[data-suggestion]");
  if (button) {
    applySuggestion(button);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const config = TOOL_CONFIG[activeTool];
  if (!config || selectedFiles.length === 0) {
    return;
  }

  setMessage("");
  setLoading(true);
  clearResult();

  const formData = new FormData();
  if (config.multiple) {
    selectedFiles.forEach((file) => formData.append("images", file));
  } else {
    formData.append("image", selectedFiles[0]);
  }
  appendControlValues(formData);

  try {
    const response = await fetch(`${API_BASE_URL}${config.endpoint}`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await readError(response);
      throw new Error(error);
    }

    const blob = await response.blob();
    const resultUrl = URL.createObjectURL(blob);
    if (currentResultUrl) {
      URL.revokeObjectURL(currentResultUrl);
    }
    currentResultUrl = resultUrl;

    resultSize.textContent = formatBytes(blob.size);
    downloadLink.href = resultUrl;
    downloadLink.download = buildDownloadName(config, getSelectedFormat());
    downloadLink.hidden = false;

    if (config.multiple) {
      resultEmpty.textContent = `${selectedFiles.length} 张图片已打包`;
      resultMeta.textContent = "ZIP";
      savingValue.textContent = "批量包";
      return;
    }

    resultPreview.src = resultUrl;
    resultFrame.classList.add("has-image");
    resultMeta.textContent = getResultMeta(config);
    savingValue.textContent =
      activeTool === "compress" ? savedPercent(totalSelectedBytes(), blob.size) : "已生成";
  } catch (error) {
    setMessage(error.message || "处理失败。");
  } finally {
    setLoading(false);
  }
});

showView(viewFromHash());
checkApiHealth();

function choices(name, label, options, value) {
  return { type: "choices", name, label, options, value };
}

function select(name, label, options, value = options[0]?.value || "") {
  return { type: "select", name, label, options, value };
}

function range(name, label, min, max, value, step, unit) {
  return { type: "range", name, label, min, max, value, step, unit };
}

function number(name, label, placeholder, value = "") {
  return { type: "number", name, label, placeholder, value };
}

function text(name, label, value = "") {
  return { type: "text", name, label, value };
}

function toggle(name, label, checked) {
  return { type: "toggle", name, label, checked };
}

function navigateTo(viewName) {
  const hash = viewName === "home" ? "#home" : `#${viewName}`;
  if (window.location.hash === hash) {
    showView(viewName);
    return;
  }

  window.location.hash = hash;
}

function viewFromHash() {
  const hashValue = window.location.hash.replace("#", "");
  return TOOL_CONFIG[hashValue] ? hashValue : "home";
}

function showView(viewName) {
  const isHome = viewName === "home";
  homeView.hidden = !isHome;
  toolView.hidden = isHome;
  homeView.classList.toggle("is-active", isHome);
  toolView.classList.toggle("is-active", !isHome);
  document.body.dataset.view = viewName;

  if (!isHome) {
    renderTool(viewName);
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderTool(toolName) {
  const config = TOOL_CONFIG[toolName];
  if (!config) {
    setWorkshopMessage("这个工具还没放上工作台。");
    navigateTo("home");
    return;
  }

  activeTool = toolName;
  toolKicker.textContent = config.kicker;
  toolTitle.textContent = config.title;
  toolDescription.textContent = config.description;
  resultPreviewTitle.textContent = config.resultTitle;
  resultEmpty.textContent = config.resultEmpty;
  submitButton.textContent = config.buttonText;
  imageInput.multiple = Boolean(config.multiple);
  dropTitle.textContent = config.multiple ? "选择或拖入多张图片" : "选择或拖入图片";
  sourceSummaryLabel.textContent = config.multiple ? "原始总量" : "原始大小";
  resultSummaryLabel.textContent = config.multiple ? "打包结果" : "处理结果";
  thirdSummaryLabel.textContent = summaryLabelForTool(activeTool);
  dynamicControls.innerHTML = config.controls.map(renderControl).join("");
  bindRangeLabels();
  resetSelection();
}

function renderControl(control) {
  if (control.type === "choices") {
    const options = control.options
      .map((option) => {
        const checked = option.value === control.value ? "checked" : "";
        return `
          <label>
            <input type="radio" name="${control.name}" data-param="${control.name}" value="${option.value}" ${checked} />
            <span>${option.label}</span>
          </label>
        `;
      })
      .join("");

    return `
      <fieldset class="choice-group">
        <legend>${control.label}</legend>
        ${options}
      </fieldset>
    `;
  }

  if (control.type === "select") {
    const options = control.options
      .map((option) => {
        const selected = option.value === control.value ? "selected" : "";
        return `<option value="${option.value}" ${selected}>${option.label}</option>`;
      })
      .join("");

    return `
      <label class="field" for="${control.name}Input">
        <span>${control.label}</span>
        <select id="${control.name}Input" data-param="${control.name}" name="${control.name}">
          ${options}
        </select>
      </label>
    `;
  }

  if (control.type === "range") {
    return `
      <div class="field range-field">
        <label for="${control.name}Input">
          ${control.label}
          <strong data-range-label="${control.name}">${formatRangeValue(control.value, control.unit)}</strong>
        </label>
        <input id="${control.name}Input" data-param="${control.name}" name="${control.name}" type="range"
          min="${control.min}" max="${control.max}" step="${control.step}" value="${control.value}" data-unit="${control.unit}" />
      </div>
    `;
  }

  if (control.type === "number") {
    return `
      <label class="field" for="${control.name}Input">
        <span>${control.label}</span>
        <input id="${control.name}Input" data-param="${control.name}" name="${control.name}" type="number"
          min="0" placeholder="${control.placeholder}" value="${control.value}" />
      </label>
    `;
  }

  if (control.type === "text") {
    return `
      <label class="field" for="${control.name}Input">
        <span>${control.label}</span>
        <input id="${control.name}Input" data-param="${control.name}" name="${control.name}" type="text"
          maxlength="80" value="${control.value}" />
      </label>
    `;
  }

  if (control.type === "toggle") {
    return `
      <label class="toggle-field">
        <input data-param="${control.name}" name="${control.name}" type="checkbox" ${control.checked ? "checked" : ""} />
        <span>${control.label}</span>
      </label>
    `;
  }

  return "";
}

function bindRangeLabels() {
  dynamicControls.querySelectorAll('input[type="range"][data-param]').forEach((input) => {
    input.addEventListener("input", () => {
      updateRangeLabel(input);
    });
  });
}

function appendControlValues(formData) {
  const params = dynamicControls.querySelectorAll("[data-param]");
  params.forEach((input) => {
    const name = input.dataset.param;

    if (input.type === "radio" && !input.checked) {
      return;
    }

    if (input.type === "checkbox") {
      formData.append(name, input.checked ? "true" : "false");
      return;
    }

    if (input.value.trim() !== "") {
      formData.append(name, input.value);
    }
  });
}

function setSelectedFiles(files) {
  const config = TOOL_CONFIG[activeTool];
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));
  if (imageFiles.length === 0) {
    setMessage("请选择图片文件。");
    return;
  }

  selectedFiles = config?.multiple ? imageFiles : [imageFiles[0]];
  submitButton.disabled = false;
  setMessage("");
  clearResult();

  if (currentSourceUrl) {
    URL.revokeObjectURL(currentSourceUrl);
  }
  currentSourceUrl = URL.createObjectURL(selectedFiles[0]);
  sourcePreview.src = currentSourceUrl;
  sourceFrame.classList.add("has-image");
  sourceEmpty.textContent = "等待图片";

  const total = totalSelectedBytes();
  sourceSize.textContent = formatBytes(total);
  fileMeta.textContent =
    selectedFiles.length === 1
      ? `${selectedFiles[0].name} · ${formatBytes(selectedFiles[0].size)}`
      : `${selectedFiles.length} 张图片 · ${formatBytes(total)}`;
  sourceMeta.textContent =
    selectedFiles.length === 1
      ? selectedFiles[0].type.replace("image/", "").toUpperCase() || "IMAGE"
      : `${selectedFiles.length} 张`;

  analyzeSourceImage(selectedFiles[0]);
}

function resetSelection() {
  analysisToken += 1;
  originalImageInfo = null;
  selectedFiles = [];
  imageInput.value = "";
  submitButton.disabled = true;
  fileMeta.textContent = imageInput.multiple ? "最多 20 张图片" : "JPG, PNG, WebP";
  sourceSize.textContent = "-";
  resultSize.textContent = "-";
  savingValue.textContent = "-";
  sourceMeta.textContent = "未选择";
  resultMeta.textContent = "未生成";
  sourceFrame.classList.remove("has-image");
  sourcePreview.removeAttribute("src");
  sourceInsights.hidden = true;
  insightGrid.innerHTML = "";
  suggestionArea.innerHTML = "";
  clearResult();

  if (currentSourceUrl) {
    URL.revokeObjectURL(currentSourceUrl);
    currentSourceUrl = null;
  }
}

function clearResult() {
  resultPreview.removeAttribute("src");
  resultFrame.classList.remove("has-image");
  resultSize.textContent = "-";
  savingValue.textContent = "-";
  resultMeta.textContent = "未生成";
  resultEmpty.textContent = TOOL_CONFIG[activeTool]?.resultEmpty || "等待处理";
  downloadLink.hidden = true;
  downloadLink.removeAttribute("href");

  if (currentResultUrl) {
    URL.revokeObjectURL(currentResultUrl);
    currentResultUrl = null;
  }
}

function setLoading(isLoading) {
  const config = TOOL_CONFIG[activeTool];
  submitButton.disabled = isLoading || selectedFiles.length === 0;
  submitButton.textContent = isLoading ? config.loadingText : config.buttonText;
}

function summaryLabelForTool(toolName) {
  if (toolName === "compress") {
    return "节省空间";
  }

  if (toolName === "resize" || toolName === "crop") {
    return "原图比例";
  }

  if (toolName === "color") {
    return "色彩概况";
  }

  return "输出说明";
}

async function analyzeSourceImage(file) {
  const shouldShowInsight = INSIGHT_TOOLS.has(activeTool) && selectedFiles.length === 1;
  const token = analysisToken + 1;
  analysisToken = token;

  if (!shouldShowInsight) {
    sourceInsights.hidden = true;
    return;
  }

  sourceInsights.hidden = false;
  insightTitle.textContent = "正在读取原图信息";
  insightGrid.innerHTML = `<div class="insight-item"><span>状态</span><strong>分析中...</strong></div>`;
  suggestionArea.innerHTML = "";

  try {
    const info = await readImageInfo(file, currentSourceUrl);
    if (token !== analysisToken) {
      return;
    }

    originalImageInfo = info;
    sourceMeta.textContent = `${info.width}×${info.height} · ${info.fileType}`;
    savingValue.textContent =
      activeTool === "color" ? `${Math.round(info.color.brightness)}% 亮度` : info.aspectLabel;
    prefillToolFromImage(info);
    renderSourceInsights(info);
  } catch {
    if (token !== analysisToken) {
      return;
    }

    insightTitle.textContent = "原图信息读取失败";
    insightGrid.innerHTML = `<div class="insight-item"><span>建议</span><strong>换一张图片再试</strong></div>`;
  }
}

function readImageInfo(file, url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      try {
        const width = image.naturalWidth;
        const height = image.naturalHeight;
        resolve({
          width,
          height,
          megapixels: (width * height) / 1000000,
          aspect: width / height,
          aspectLabel: aspectLabel(width, height),
          orientation: orientationLabel(width, height),
          color: sampleImageColor(image),
          fileType: file.type.replace("image/", "").toUpperCase() || "IMAGE",
        });
      } catch (error) {
        reject(error);
      }
    };
    image.onerror = reject;
    image.src = url;
  });
}

function sampleImageColor(image) {
  const maxSide = 120;
  const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });
  canvas.width = width;
  canvas.height = height;
  context.drawImage(image, 0, 0, width, height);

  const data = context.getImageData(0, 0, width, height).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let luminance = 0;
  let luminanceSquares = 0;
  let saturation = 0;
  let count = 0;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3] / 255;
    if (alpha < 0.08) {
      continue;
    }

    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    const lum = 0.2126 * red + 0.7152 * green + 0.0722 * blue;
    const sat = rgbToHsl(red, green, blue).s;
    r += red;
    g += green;
    b += blue;
    luminance += lum;
    luminanceSquares += lum * lum;
    saturation += sat;
    count += 1;
  }

  if (!count) {
    return {
      averageHex: "#ffffff",
      brightness: 100,
      contrast: 0,
      saturation: 0,
      tone: "透明或空白",
    };
  }

  const avgR = Math.round(r / count);
  const avgG = Math.round(g / count);
  const avgB = Math.round(b / count);
  const avgLum = luminance / count;
  const variance = Math.max(0, luminanceSquares / count - avgLum * avgLum);
  const contrast = Math.min(100, Math.round((Math.sqrt(variance) / 90) * 100));
  const brightness = Math.round((avgLum / 255) * 100);
  const avgSaturation = Math.round((saturation / count) * 100);

  return {
    averageHex: rgbToHex(avgR, avgG, avgB),
    brightness,
    contrast,
    saturation: avgSaturation,
    tone: toneLabel(brightness, avgSaturation, contrast),
  };
}

function prefillToolFromImage(info) {
  if (activeTool === "resize") {
    setParamPlaceholder("width", `原图宽 ${info.width}`);
    setParamPlaceholder("height", `原图高 ${info.height}`);
  }

  if (activeTool === "crop") {
    setParamValue("x", 0);
    setParamValue("y", 0);
    setParamValue("width", info.width);
    setParamValue("height", info.height);
  }
}

function renderSourceInsights(info) {
  sourceInsights.hidden = false;
  insightTitle.textContent = insightTitleForTool(activeTool);

  if (activeTool === "color") {
    insightGrid.innerHTML = `
      <div class="insight-item color-chip-item">
        <span>平均色</span>
        <strong><i class="color-chip" style="background:${info.color.averageHex}"></i>${info.color.averageHex}</strong>
      </div>
      <div class="insight-item"><span>亮度</span><strong>${info.color.brightness}%</strong></div>
      <div class="insight-item"><span>饱和度</span><strong>${info.color.saturation}%</strong></div>
      <div class="insight-item"><span>对比度</span><strong>${info.color.contrast}%</strong></div>
    `;
  } else {
    insightGrid.innerHTML = `
      <div class="insight-item"><span>尺寸</span><strong>${info.width}×${info.height}</strong></div>
      <div class="insight-item"><span>比例</span><strong>${info.aspectLabel}</strong></div>
      <div class="insight-item"><span>方向</span><strong>${info.orientation}</strong></div>
      <div class="insight-item"><span>像素</span><strong>${info.megapixels.toFixed(info.megapixels >= 10 ? 1 : 2)} MP</strong></div>
    `;
  }

  suggestionArea.innerHTML = suggestionsForTool(info);
}

function insightTitleForTool(toolName) {
  if (toolName === "resize") {
    return "按原图比例给你几个常用尺寸";
  }

  if (toolName === "crop") {
    return "裁剪范围已按原图尺寸校准";
  }

  if (toolName === "color") {
    return "基于原图色彩给你几个调色起点";
  }

  return "已读取图片信息";
}

function suggestionsForTool(info) {
  if (activeTool === "resize") {
    const half = scaledSize(info, 0.5);
    const quarter = scaledSize(info, 0.25);
    const long1920 = fitLongSide(info, 1920);
    const long1080 = fitLongSide(info, 1080);
    return `
      <div class="suggestion-title">建议尺寸</div>
      <div class="suggestion-list">
        ${suggestionButton("resize", "50% 尺寸", { width: half.width, height: half.height, keepAspect: true })}
        ${suggestionButton("resize", "25% 尺寸", { width: quarter.width, height: quarter.height, keepAspect: true })}
        ${suggestionButton("resize", "长边 1920", { width: long1920.width, height: long1920.height, keepAspect: true })}
        ${suggestionButton("resize", "长边 1080", { width: long1080.width, height: long1080.height, keepAspect: true })}
      </div>
    `;
  }

  if (activeTool === "crop") {
    return `
      <div class="suggestion-title">常用裁剪</div>
      <div class="suggestion-list">
        ${cropSuggestion("原图全幅", centerCrop(info, info.width / info.height))}
        ${cropSuggestion("居中 1:1", centerCrop(info, 1))}
        ${cropSuggestion("居中 4:3", centerCrop(info, 4 / 3))}
        ${cropSuggestion("居中 16:9", centerCrop(info, 16 / 9))}
      </div>
    `;
  }

  if (activeTool === "color") {
    return `
      <div class="suggestion-title">调色建议：${info.color.tone}</div>
      <div class="suggestion-list">
        ${colorSuggestion(primaryColorSuggestion(info.color))}
        ${colorSuggestion(saturationSuggestion(info.color))}
        ${colorSuggestion(contrastSuggestion(info.color))}
        ${colorSuggestion({
          label: "重置自然",
          brightness: 1,
          contrast: 1,
          saturation: 1,
          sharpness: 1,
        })}
      </div>
    `;
  }

  return "";
}

function suggestionButton(toolName, label, values) {
  const data = Object.entries(values)
    .map(([name, value]) => `data-${toKebabCase(name)}="${value}"`)
    .join(" ");
  return `<button class="suggestion-button" type="button" data-suggestion="${toolName}" ${data}>${label}</button>`;
}

function cropSuggestion(label, crop) {
  return suggestionButton("crop", `${label} · ${crop.width}×${crop.height}`, crop);
}

function colorSuggestion(values) {
  return suggestionButton("color", values.label, values);
}

function applySuggestion(button) {
  const type = button.dataset.suggestion;
  if (type !== activeTool) {
    return;
  }

  const fields = ["x", "y", "width", "height", "brightness", "contrast", "saturation", "sharpness"];
  fields.forEach((field) => {
    if (button.dataset[field] !== undefined) {
      setParamValue(field, button.dataset[field]);
    }
  });

  if (button.dataset.keepAspect !== undefined) {
    setParamValue("keep_aspect", button.dataset.keepAspect === "true");
  }
}

function setParamValue(name, value) {
  const inputs = dynamicControls.querySelectorAll(`[data-param="${name}"]`);
  inputs.forEach((input) => {
    if (input.type === "checkbox") {
      input.checked = Boolean(value);
      return;
    }

    if (input.type === "radio") {
      input.checked = input.value === String(value);
      return;
    }

    input.value = value;
    if (input.type === "range") {
      updateRangeLabel(input);
    }
  });
}

function setParamPlaceholder(name, value) {
  const input = dynamicControls.querySelector(`[data-param="${name}"]`);
  if (input && "placeholder" in input) {
    input.placeholder = value;
  }
}

function updateRangeLabel(input) {
  const label = dynamicControls.querySelector(`[data-range-label="${input.dataset.param}"]`);
  if (label) {
    label.textContent = formatRangeValue(input.value, input.dataset.unit);
  }
}

function getSelectedFormat() {
  const checked = dynamicControls.querySelector('[data-param="format"]:checked');
  if (checked) {
    return checked.value;
  }

  const selectInput = dynamicControls.querySelector('select[data-param="format"]');
  return selectInput?.value || "jpeg";
}

function getResultMeta(config) {
  const format = getSelectedFormat().toUpperCase();
  if (activeTool === "compress" || activeTool === "convert" || activeTool === "resize") {
    return `${format} · 已输出`;
  }

  return `${format} · ${config.resultTitle}`;
}

function buildDownloadName(config, format) {
  if (config.multiple) {
    return "image-workshop-batch.zip";
  }

  const extension = format === "jpeg" ? "jpg" : format;
  const stem = selectedFiles[0]?.name.replace(/\.[^.]+$/, "") || "image";
  return `${stem}-${config.suffix}.${extension}`;
}

function setWorkshopMessage(text) {
  workshopMessage.textContent = text;
  window.clearTimeout(workshopMessageTimer);
  workshopMessageTimer = window.setTimeout(() => {
    workshopMessage.textContent = "";
  }, 2600);
}

function setMessage(text) {
  message.textContent = text;
}

function totalSelectedBytes() {
  return selectedFiles.reduce((total, file) => total + file.size, 0);
}

function aspectLabel(width, height) {
  const ratio = width / height;
  const presets = [
    { label: "1:1", value: 1 },
    { label: "4:3", value: 4 / 3 },
    { label: "3:2", value: 3 / 2 },
    { label: "16:9", value: 16 / 9 },
    { label: "9:16", value: 9 / 16 },
    { label: "2:3", value: 2 / 3 },
    { label: "3:4", value: 3 / 4 },
  ];
  const matched = presets.find((preset) => Math.abs(ratio - preset.value) < 0.025);
  if (matched) {
    return matched.label;
  }

  const divisor = gcd(width, height);
  const ratioWidth = Math.round(width / divisor);
  const ratioHeight = Math.round(height / divisor);
  if (ratioWidth <= 99 && ratioHeight <= 99) {
    return `${ratioWidth}:${ratioHeight}`;
  }

  return `${ratio.toFixed(2)}:1`;
}

function orientationLabel(width, height) {
  if (width === height) {
    return "方图";
  }

  return width > height ? "横图" : "竖图";
}

function gcd(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function scaledSize(info, scale) {
  return {
    width: Math.max(1, Math.round(info.width * scale)),
    height: Math.max(1, Math.round(info.height * scale)),
  };
}

function fitLongSide(info, longSide) {
  const scale = Math.min(1, longSide / Math.max(info.width, info.height));
  return scaledSize(info, scale);
}

function centerCrop(info, targetRatio) {
  let width = info.width;
  let height = Math.round(width / targetRatio);

  if (height > info.height) {
    height = info.height;
    width = Math.round(height * targetRatio);
  }

  return {
    x: Math.max(0, Math.floor((info.width - width) / 2)),
    y: Math.max(0, Math.floor((info.height - height) / 2)),
    width,
    height,
  };
}

function primaryColorSuggestion(color) {
  if (color.brightness < 42) {
    return {
      label: "提亮暗图",
      brightness: 1.22,
      contrast: 1.08,
      saturation: 1.04,
      sharpness: 1.05,
    };
  }

  if (color.brightness > 72) {
    return {
      label: "压低高光",
      brightness: 0.9,
      contrast: 1.06,
      saturation: 1,
      sharpness: 1.05,
    };
  }

  return {
    label: "轻微提亮",
    brightness: 1.06,
    contrast: 1.06,
    saturation: 1.03,
    sharpness: 1.04,
  };
}

function saturationSuggestion(color) {
  if (color.saturation < 34) {
    return {
      label: "增强色彩",
      brightness: 1.03,
      contrast: 1.06,
      saturation: 1.22,
      sharpness: 1.04,
    };
  }

  if (color.saturation > 68) {
    return {
      label: "降低饱和",
      brightness: 1,
      contrast: 1.03,
      saturation: 0.88,
      sharpness: 1.02,
    };
  }

  return {
    label: "色彩更鲜明",
    brightness: 1.02,
    contrast: 1.08,
    saturation: 1.12,
    sharpness: 1.05,
  };
}

function contrastSuggestion(color) {
  if (color.contrast < 28) {
    return {
      label: "增强层次",
      brightness: 1.02,
      contrast: 1.2,
      saturation: 1.05,
      sharpness: 1.1,
    };
  }

  return {
    label: "柔和自然",
    brightness: 1.02,
    contrast: 0.96,
    saturation: 1,
    sharpness: 1,
  };
}

function toneLabel(brightness, saturation, contrast) {
  if (brightness < 42) {
    return "画面偏暗，建议先提亮";
  }

  if (brightness > 72) {
    return "画面偏亮，注意保留高光";
  }

  if (saturation < 34) {
    return "色彩偏淡，可以适当加饱和";
  }

  if (saturation > 68) {
    return "色彩较浓，适合轻微降饱和";
  }

  if (contrast < 28) {
    return "层次偏平，可以提高对比";
  }

  return "整体均衡，适合小幅微调";
}

function rgbToHsl(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  let hue = 0;
  let saturation = 0;

  if (max !== min) {
    const delta = max - min;
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === r) {
      hue = (g - b) / delta + (g < b ? 6 : 0);
    } else if (max === g) {
      hue = (b - r) / delta + 2;
    } else {
      hue = (r - g) / delta + 4;
    }
    hue /= 6;
  }

  return { h: hue, s: saturation, l: lightness };
}

function rgbToHex(red, green, blue) {
  return `#${[red, green, blue]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

function toKebabCase(value) {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function formatRangeValue(value, unit) {
  const numberValue = Number(value);
  const display = Number.isInteger(numberValue) ? `${numberValue}` : numberValue.toFixed(1);
  return `${display}${unit || ""}`;
}

function formatBytes(bytes) {
  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function savedPercent(originalSize, resultSizeValue) {
  if (!originalSize) {
    return "-";
  }

  if (resultSizeValue >= originalSize) {
    return "0%";
  }

  return `${Math.round((1 - resultSizeValue / originalSize) * 100)}%`;
}

async function readError(response) {
  try {
    const payload = await response.json();
    return payload.detail || "处理失败。";
  } catch {
    return "处理失败。";
  }
}

async function checkApiHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error("API unavailable");
    }
    apiState.textContent = "API 在线";
    apiState.classList.add("ok");
    apiState.classList.remove("error");
  } catch {
    apiState.textContent = "API 离线";
    apiState.classList.add("error");
    apiState.classList.remove("ok");
  }
}

// �����л�����
function initThemeToggle() {
  const themeToggle = document.querySelector("#themeToggle");
  const html = document.documentElement;
  
  // �ӱ��ش洢��ȡ�û�ƫ�õ�����
  const savedTheme = localStorage.getItem("theme") || "light";
  
  // ��ʼ������
  if (savedTheme === "dark") {
    html.setAttribute("data-theme", "dark");
    updateThemeIcon(true);
  }
  
  // �����л���ť�¼�����
  themeToggle.addEventListener("click", () => {
    const currentTheme = html.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    
    html.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
    updateThemeIcon(newTheme === "dark");
  });
  
  // ����ϵͳ����ƫ�ñ仯
  if (window.matchMedia) {
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
      // ����û�û���ֶ����ù����⣬�����ϵͳ����
      if (!localStorage.getItem("theme")) {
        const newTheme = e.matches ? "dark" : "light";
        html.setAttribute("data-theme", newTheme);
        updateThemeIcon(e.matches);
      }
    });
  }
}

function updateThemeIcon(isDark) {
  const themeToggle = document.querySelector("#themeToggle");
  const themeIcon = themeToggle.querySelector(".theme-icon");
  themeIcon.textContent = isDark ? "☀️" : "🌙";
}

// ��ʼ��Ӧ��
document.addEventListener("DOMContentLoaded", () => {
  initThemeToggle();
  if (typeof checkApiHealth === "function") {
    checkApiHealth();
  }
});
