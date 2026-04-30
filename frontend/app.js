const API_BASE_URL = "http://127.0.0.1:8000";

const form = document.querySelector("#compressForm");
const imageInput = document.querySelector("#imageInput");
const dropZone = document.querySelector("#dropZone");
const fileMeta = document.querySelector("#fileMeta");
const qualityInput = document.querySelector("#qualityInput");
const qualityValue = document.querySelector("#qualityValue");
const qualityPresetInputs = document.querySelectorAll('input[name="qualityPreset"]');
const maxWidthInput = document.querySelector("#maxWidthInput");
const maxHeightInput = document.querySelector("#maxHeightInput");
const submitButton = document.querySelector("#submitButton");
const sourcePreview = document.querySelector("#sourcePreview");
const resultPreview = document.querySelector("#resultPreview");
const sourceSize = document.querySelector("#sourceSize");
const resultSize = document.querySelector("#resultSize");
const savingValue = document.querySelector("#savingValue");
const sourceMeta = document.querySelector("#sourceMeta");
const resultMeta = document.querySelector("#resultMeta");
const sourceFrame = sourcePreview.closest(".image-frame");
const resultFrame = resultPreview.closest(".image-frame");
const downloadLink = document.querySelector("#downloadLink");
const message = document.querySelector("#message");
const apiState = document.querySelector("#apiState");

let selectedFile = null;
let currentSourceUrl = null;
let currentResultUrl = null;

qualityInput.addEventListener("input", () => {
  qualityPresetInputs.forEach((input) => {
    input.checked = input.value === qualityInput.value;
  });
  updateQualityLabel();
});

qualityPresetInputs.forEach((input) => {
  input.addEventListener("change", () => {
    if (input.checked) {
      qualityInput.value = input.value;
      updateQualityLabel();
    }
  });
});

imageInput.addEventListener("change", () => {
  if (imageInput.files?.[0]) {
    setSelectedFile(imageInput.files[0]);
  }
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
  const file = event.dataTransfer.files?.[0];
  if (file) {
    imageInput.files = event.dataTransfer.files;
    setSelectedFile(file);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedFile) {
    return;
  }

  setMessage("");
  setLoading(true);
  clearResult();

  const outputFormat = getSelectedFormat();
  const formData = new FormData();
  formData.append("image", selectedFile);
  formData.append("quality", qualityInput.value);
  formData.append("format", outputFormat);
  appendOptionalNumber(formData, "max_width", maxWidthInput.value);
  appendOptionalNumber(formData, "max_height", maxHeightInput.value);

  try {
    const response = await fetch(`${API_BASE_URL}/api/compress`, {
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

    const saved = savedPercent(selectedFile.size, blob.size);
    resultPreview.src = resultUrl;
    resultFrame.classList.add("has-image");
    resultSize.textContent = formatBytes(blob.size);
    savingValue.textContent = saved;
    resultMeta.textContent = `${outputFormat.toUpperCase()} · 清晰度 ${qualityInput.value}%`;
    downloadLink.href = resultUrl;
    downloadLink.download = buildDownloadName(selectedFile.name, outputFormat);
    downloadLink.hidden = false;
  } catch (error) {
    setMessage(error.message || "压缩失败。");
  } finally {
    setLoading(false);
  }
});

checkApiHealth();
updateQualityLabel();

function setSelectedFile(file) {
  if (!file.type.startsWith("image/")) {
    setMessage("请选择图片文件。");
    return;
  }

  selectedFile = file;
  submitButton.disabled = false;
  setMessage("");
  clearResult();

  if (currentSourceUrl) {
    URL.revokeObjectURL(currentSourceUrl);
  }
  currentSourceUrl = URL.createObjectURL(file);
  sourcePreview.src = currentSourceUrl;
  sourceFrame.classList.add("has-image");
  fileMeta.textContent = `${file.name} · ${formatBytes(file.size)}`;
  sourceSize.textContent = formatBytes(file.size);
  sourceMeta.textContent = file.type.replace("image/", "").toUpperCase() || "IMAGE";
}

function getSelectedFormat() {
  return document.querySelector('input[name="format"]:checked')?.value || "jpeg";
}

function appendOptionalNumber(formData, name, value) {
  if (value.trim() !== "") {
    formData.append(name, value);
  }
}

function clearResult() {
  resultPreview.removeAttribute("src");
  resultFrame.classList.remove("has-image");
  resultSize.textContent = "-";
  savingValue.textContent = "-";
  resultMeta.textContent = "未生成";
  downloadLink.hidden = true;
  downloadLink.removeAttribute("href");

  if (currentResultUrl) {
    URL.revokeObjectURL(currentResultUrl);
    currentResultUrl = null;
  }
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading || !selectedFile;
  submitButton.textContent = isLoading ? "压缩中..." : "开始压缩";
}

function updateQualityLabel() {
  const value = Number(qualityInput.value);
  let label = "自定义";

  if (value <= 60) {
    label = "小文件";
  } else if (value >= 85) {
    label = "高清";
  } else {
    label = "推荐";
  }

  qualityValue.textContent = `${label} ${value}%`;
}

function setMessage(text) {
  message.textContent = text;
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

function buildDownloadName(name, format) {
  const extension = format === "jpeg" ? "jpg" : format;
  const stem = name.replace(/\.[^.]+$/, "") || "compressed";
  return `${stem}-compressed.${extension}`;
}

async function readError(response) {
  try {
    const payload = await response.json();
    return payload.detail || "压缩失败。";
  } catch {
    return "压缩失败。";
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
