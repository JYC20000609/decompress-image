from io import BytesIO
from pathlib import Path
from typing import Annotated
from urllib.parse import quote
from zipfile import ZIP_DEFLATED, ZipFile

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps, UnidentifiedImageError


app = FastAPI(title="Image Workshop API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SUPPORTED_FORMATS = {"jpeg": "JPEG", "jpg": "JPEG", "webp": "WEBP", "png": "PNG"}
MIME_TYPES = {"jpeg": "image/jpeg", "webp": "image/webp", "png": "image/png"}
MAX_UPLOAD_BYTES = 20 * 1024 * 1024
MAX_BATCH_FILES = 20
MAX_BATCH_BYTES = 100 * 1024 * 1024
MAX_IMAGE_SIDE = 12000
SUPPORTED_BATCH_OPERATIONS = {
    "compress",
    "resize",
    "convert",
    "crop",
    "watermark",
    "color",
    "metadata",
}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/compress")
async def compress_image(
    image: Annotated[UploadFile, File()],
    quality: Annotated[int, Form()] = 75,
    format: Annotated[str, Form()] = "jpeg",
    max_width: Annotated[int | None, Form()] = None,
    max_height: Annotated[int | None, Form()] = None,
) -> StreamingResponse:
    output_format = normalize_format(format)
    validate_quality(quality)
    validate_optional_dimension(max_width, "Max width")
    validate_optional_dimension(max_height, "Max height")

    source = await load_upload_image(image)
    result = apply_compress(source, max_width, max_height)
    return image_response(result, image.filename, "compressed", output_format, quality)


@app.post("/api/resize")
async def resize_image(
    image: Annotated[UploadFile, File()],
    width: Annotated[int | None, Form()] = None,
    height: Annotated[int | None, Form()] = None,
    keep_aspect: Annotated[bool, Form()] = True,
    format: Annotated[str, Form()] = "jpeg",
    quality: Annotated[int, Form()] = 90,
) -> StreamingResponse:
    output_format = normalize_format(format)
    validate_quality(quality)
    source = await load_upload_image(image)
    result = apply_resize(source, width, height, keep_aspect)
    return image_response(result, image.filename, "resized", output_format, quality)


@app.post("/api/convert")
async def convert_image(
    image: Annotated[UploadFile, File()],
    format: Annotated[str, Form()] = "webp",
    quality: Annotated[int, Form()] = 90,
) -> StreamingResponse:
    output_format = normalize_format(format)
    validate_quality(quality)
    source = await load_upload_image(image)
    return image_response(source, image.filename, "converted", output_format, quality)


@app.post("/api/crop")
async def crop_image(
    image: Annotated[UploadFile, File()],
    x: Annotated[int, Form()] = 0,
    y: Annotated[int, Form()] = 0,
    width: Annotated[int, Form()] = 100,
    height: Annotated[int, Form()] = 100,
    format: Annotated[str, Form()] = "jpeg",
    quality: Annotated[int, Form()] = 90,
) -> StreamingResponse:
    output_format = normalize_format(format)
    validate_quality(quality)
    source = await load_upload_image(image)
    result = apply_crop(source, x, y, width, height)
    return image_response(result, image.filename, "cropped", output_format, quality)


@app.post("/api/watermark")
async def watermark_image(
    image: Annotated[UploadFile, File()],
    text: Annotated[str, Form()] = "Image Workshop",
    position: Annotated[str, Form()] = "bottom-right",
    opacity: Annotated[int, Form()] = 55,
    size: Annotated[int, Form()] = 32,
    format: Annotated[str, Form()] = "jpeg",
    quality: Annotated[int, Form()] = 90,
) -> StreamingResponse:
    output_format = normalize_format(format)
    validate_quality(quality)
    source = await load_upload_image(image)
    result = apply_watermark(source, text, position, opacity, size)
    return image_response(result, image.filename, "watermarked", output_format, quality)


@app.post("/api/color")
async def color_image(
    image: Annotated[UploadFile, File()],
    brightness: Annotated[float, Form()] = 1.0,
    contrast: Annotated[float, Form()] = 1.0,
    saturation: Annotated[float, Form()] = 1.0,
    sharpness: Annotated[float, Form()] = 1.0,
    format: Annotated[str, Form()] = "jpeg",
    quality: Annotated[int, Form()] = 90,
) -> StreamingResponse:
    output_format = normalize_format(format)
    validate_quality(quality)
    source = await load_upload_image(image)
    result = apply_color(source, brightness, contrast, saturation, sharpness)
    return image_response(result, image.filename, "color", output_format, quality)


@app.post("/api/metadata")
async def clean_metadata(
    image: Annotated[UploadFile, File()],
    format: Annotated[str, Form()] = "jpeg",
    quality: Annotated[int, Form()] = 95,
) -> StreamingResponse:
    output_format = normalize_format(format)
    validate_quality(quality)
    source = await load_upload_image(image)
    result = source.copy()
    return image_response(result, image.filename, "clean", output_format, quality)


@app.post("/api/batch")
async def batch_process(
    images: Annotated[list[UploadFile], File()],
    operation: Annotated[str, Form()] = "compress",
    format: Annotated[str, Form()] = "jpeg",
    quality: Annotated[int, Form()] = 75,
    max_width: Annotated[int | None, Form()] = None,
    max_height: Annotated[int | None, Form()] = None,
    width: Annotated[int | None, Form()] = None,
    height: Annotated[int | None, Form()] = None,
    keep_aspect: Annotated[bool, Form()] = True,
    x: Annotated[int, Form()] = 0,
    y: Annotated[int, Form()] = 0,
    text: Annotated[str, Form()] = "Image Workshop",
    position: Annotated[str, Form()] = "bottom-right",
    opacity: Annotated[int, Form()] = 55,
    size: Annotated[int, Form()] = 32,
    brightness: Annotated[float, Form()] = 1.0,
    contrast: Annotated[float, Form()] = 1.0,
    saturation: Annotated[float, Form()] = 1.0,
    sharpness: Annotated[float, Form()] = 1.0,
) -> StreamingResponse:
    normalized_operation = operation.lower()
    if normalized_operation not in SUPPORTED_BATCH_OPERATIONS:
        raise HTTPException(status_code=400, detail="Unsupported batch operation.")

    if not images:
        raise HTTPException(status_code=400, detail="Please upload at least one image.")

    if len(images) > MAX_BATCH_FILES:
        raise HTTPException(status_code=413, detail=f"Batch can include at most {MAX_BATCH_FILES} images.")

    output_format = normalize_format(format)
    validate_quality(quality)
    validate_optional_dimension(max_width, "Max width")
    validate_optional_dimension(max_height, "Max height")

    zip_buffer = BytesIO()
    total_bytes = 0

    with ZipFile(zip_buffer, "w", ZIP_DEFLATED) as archive:
        for index, upload in enumerate(images, start=1):
            source = await load_upload_image(upload)
            total_bytes += getattr(upload, "_image_workshop_size", 0)
            if total_bytes > MAX_BATCH_BYTES:
                raise HTTPException(status_code=413, detail="Batch upload is too large.")

            result = apply_operation(
                source,
                normalized_operation,
                max_width=max_width,
                max_height=max_height,
                width=width,
                height=height,
                keep_aspect=keep_aspect,
                x=x,
                y=y,
                text=text,
                position=position,
                opacity=opacity,
                size=size,
                brightness=brightness,
                contrast=contrast,
                saturation=saturation,
                sharpness=sharpness,
            )
            image_bytes = save_image(result, output_format, quality)
            archive.writestr(
                build_archive_name(upload.filename, normalized_operation, output_format, index),
                image_bytes.getvalue(),
            )

    zip_buffer.seek(0)
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": 'attachment; filename="image-workshop-batch.zip"'},
    )


async def load_upload_image(upload: UploadFile) -> Image.Image:
    raw = await upload.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 20MB or smaller.")

    try:
        source = Image.open(BytesIO(raw))
        source = ImageOps.exif_transpose(source)
        source.load()
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.") from exc

    if source.width > MAX_IMAGE_SIDE or source.height > MAX_IMAGE_SIDE:
        raise HTTPException(status_code=413, detail="Image dimensions are too large.")

    setattr(upload, "_image_workshop_size", len(raw))
    return source


def apply_operation(source: Image.Image, operation: str, **params: object) -> Image.Image:
    if operation == "compress":
        return apply_compress(
            source,
            params.get("max_width") if isinstance(params.get("max_width"), int) else None,
            params.get("max_height") if isinstance(params.get("max_height"), int) else None,
        )

    if operation == "resize":
        return apply_resize(
            source,
            params.get("width") if isinstance(params.get("width"), int) else None,
            params.get("height") if isinstance(params.get("height"), int) else None,
            bool(params.get("keep_aspect")),
        )

    if operation == "convert" or operation == "metadata":
        return source.copy()

    if operation == "crop":
        return apply_crop(
            source,
            int(params.get("x", 0)),
            int(params.get("y", 0)),
            int(params.get("width") or source.width),
            int(params.get("height") or source.height),
        )

    if operation == "watermark":
        return apply_watermark(
            source,
            str(params.get("text") or "Image Workshop"),
            str(params.get("position") or "bottom-right"),
            int(params.get("opacity", 55)),
            int(params.get("size", 32)),
        )

    if operation == "color":
        return apply_color(
            source,
            float(params.get("brightness", 1.0)),
            float(params.get("contrast", 1.0)),
            float(params.get("saturation", 1.0)),
            float(params.get("sharpness", 1.0)),
        )

    raise HTTPException(status_code=400, detail="Unsupported operation.")


def apply_compress(source: Image.Image, max_width: int | None, max_height: int | None) -> Image.Image:
    result = source.copy()
    if max_width or max_height:
        result.thumbnail(
            (
                max_width or result.width,
                max_height or result.height,
            ),
            Image.Resampling.LANCZOS,
        )
    return result


def apply_resize(
    source: Image.Image,
    width: int | None,
    height: int | None,
    keep_aspect: bool,
) -> Image.Image:
    validate_optional_dimension(width, "Width")
    validate_optional_dimension(height, "Height")

    if width is None and height is None:
        raise HTTPException(status_code=400, detail="Width or height is required.")

    if keep_aspect:
        result = source.copy()
        result.thumbnail((width or source.width, height or source.height), Image.Resampling.LANCZOS)
        return result

    if width is None or height is None:
        raise HTTPException(status_code=400, detail="Exact resize requires both width and height.")

    return source.resize((width, height), Image.Resampling.LANCZOS)


def apply_crop(source: Image.Image, x: int, y: int, width: int, height: int) -> Image.Image:
    if x < 0 or y < 0:
        raise HTTPException(status_code=400, detail="Crop origin must be non-negative.")

    validate_dimension(width, "Crop width")
    validate_dimension(height, "Crop height")

    right = x + width
    lower = y + height
    if x >= source.width or y >= source.height or right > source.width or lower > source.height:
        raise HTTPException(status_code=400, detail="Crop area must stay inside the image.")

    return source.crop((x, y, right, lower))


def apply_watermark(
    source: Image.Image,
    text: str,
    position: str,
    opacity: int,
    size: int,
) -> Image.Image:
    text = text.strip()
    if not text:
        raise HTTPException(status_code=400, detail="Watermark text is required.")

    if len(text) > 80:
        raise HTTPException(status_code=400, detail="Watermark text is too long.")

    if opacity < 1 or opacity > 100:
        raise HTTPException(status_code=400, detail="Opacity must be between 1 and 100.")

    if size < 8 or size > 180:
        raise HTTPException(status_code=400, detail="Watermark size must be between 8 and 180.")

    base = source.convert("RGBA")
    overlay = Image.new("RGBA", base.size, (255, 255, 255, 0))
    draw = ImageDraw.Draw(overlay)
    font = load_font(size)
    bbox = draw.textbbox((0, 0), text, font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    margin = max(12, round(min(base.size) * 0.04))
    point = watermark_point(position, base.width, base.height, text_width, text_height, margin)
    alpha = round(255 * opacity / 100)

    shadow_point = (point[0] + max(1, size // 14), point[1] + max(1, size // 14))
    draw.text(shadow_point, text, font=font, fill=(47, 30, 18, min(180, alpha)))
    draw.text(point, text, font=font, fill=(255, 248, 216, alpha))

    return Image.alpha_composite(base, overlay)


def apply_color(
    source: Image.Image,
    brightness: float,
    contrast: float,
    saturation: float,
    sharpness: float,
) -> Image.Image:
    for label, value, upper in (
        ("Brightness", brightness, 3.0),
        ("Contrast", contrast, 3.0),
        ("Saturation", saturation, 3.0),
        ("Sharpness", sharpness, 4.0),
    ):
        if value < 0 or value > upper:
            raise HTTPException(status_code=400, detail=f"{label} is out of range.")

    result = source.copy()
    result = ImageEnhance.Brightness(result).enhance(brightness)
    result = ImageEnhance.Contrast(result).enhance(contrast)
    result = ImageEnhance.Color(result).enhance(saturation)
    result = ImageEnhance.Sharpness(result).enhance(sharpness)
    return result


def normalize_format(output_format: str) -> str:
    normalized = output_format.lower()
    if normalized == "jpg":
        normalized = "jpeg"

    if normalized not in SUPPORTED_FORMATS:
        raise HTTPException(status_code=400, detail="Unsupported output format.")

    return normalized


def validate_quality(quality: int) -> None:
    if quality < 1 or quality > 95:
        raise HTTPException(status_code=400, detail="Quality must be between 1 and 95.")


def validate_dimension(value: int, label: str) -> None:
    if value < 1:
        raise HTTPException(status_code=400, detail=f"{label} must be positive.")

    if value > MAX_IMAGE_SIDE:
        raise HTTPException(status_code=400, detail=f"{label} is too large.")


def validate_optional_dimension(value: int | None, label: str) -> None:
    if value is not None:
        validate_dimension(value, label)


def watermark_point(
    position: str,
    image_width: int,
    image_height: int,
    text_width: int,
    text_height: int,
    margin: int,
) -> tuple[int, int]:
    positions = {
        "top-left": (margin, margin),
        "top-right": (image_width - text_width - margin, margin),
        "bottom-left": (margin, image_height - text_height - margin),
        "bottom-right": (image_width - text_width - margin, image_height - text_height - margin),
        "center": ((image_width - text_width) // 2, (image_height - text_height) // 2),
    }

    if position not in positions:
        raise HTTPException(status_code=400, detail="Unsupported watermark position.")

    return positions[position]


def load_font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        Path("C:/Windows/Fonts/msyh.ttc"),
        Path("C:/Windows/Fonts/simhei.ttf"),
        Path("C:/Windows/Fonts/simsun.ttc"),
        Path("C:/Windows/Fonts/arial.ttf"),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size=size)
    return ImageFont.load_default(size=size)


def image_response(
    source: Image.Image,
    original_filename: str | None,
    suffix: str,
    output_format: str,
    quality: int,
) -> StreamingResponse:
    output = save_image(source, output_format, quality)
    filename = build_filename(original_filename, suffix, output_format)
    fallback_filename = f"{suffix}.{extension_for(output_format)}"

    return StreamingResponse(
        output,
        media_type=MIME_TYPES[output_format],
        headers={
            "Content-Disposition": (
                f'attachment; filename="{fallback_filename}"; '
                f"filename*=UTF-8''{quote(filename)}"
            )
        },
    )


def save_image(source: Image.Image, output_format: str, quality: int) -> BytesIO:
    output = BytesIO()
    prepared = prepare_for_format(source, output_format)
    prepared.save(output, SUPPORTED_FORMATS[output_format], **build_save_options(output_format, quality))
    output.seek(0)
    return output


def prepare_for_format(source: Image.Image, output_format: str) -> Image.Image:
    if output_format == "jpeg" and source.mode in {"RGBA", "LA", "P"}:
        if source.mode == "P":
            source = source.convert("RGBA")
        background = Image.new("RGB", source.size, (255, 255, 255))
        alpha = source.getchannel("A") if source.mode in {"RGBA", "LA"} else None
        background.paste(source.convert("RGB"), mask=alpha)
        return background

    if output_format == "jpeg" and source.mode != "RGB":
        return source.convert("RGB")

    if output_format in {"png", "webp"} and source.mode == "P":
        return source.convert("RGBA")

    return source


def build_save_options(output_format: str, quality: int) -> dict[str, int | bool | str]:
    if output_format == "png":
        compress_level = round((100 - quality) / 100 * 9)
        return {"optimize": True, "compress_level": compress_level}

    options: dict[str, int | bool | str] = {"quality": quality, "optimize": True}
    if output_format == "jpeg":
        options["progressive"] = True
    if output_format == "webp":
        options["method"] = 6
    return options


def build_filename(original_filename: str | None, suffix: str, output_format: str) -> str:
    stem = Path(original_filename or "image").stem or "image"
    extension = extension_for(output_format)
    return f"{stem}-{suffix}.{extension}"


def build_archive_name(
    original_filename: str | None,
    suffix: str,
    output_format: str,
    index: int,
) -> str:
    stem = Path(original_filename or f"image-{index}").stem or f"image-{index}"
    safe_stem = "".join(ch if ch.isalnum() or ch in "-_." else "_" for ch in stem).strip("._")
    return f"{safe_stem or f'image-{index}'}-{suffix}.{extension_for(output_format)}"


def extension_for(output_format: str) -> str:
    return "jpg" if output_format == "jpeg" else output_format
