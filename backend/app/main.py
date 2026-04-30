from io import BytesIO
from pathlib import Path
from typing import Annotated
from urllib.parse import quote

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from PIL import Image, ImageOps, UnidentifiedImageError


app = FastAPI(title="Image Compression API", version="1.0.0")

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

SUPPORTED_FORMATS = {"jpeg": "JPEG", "webp": "WEBP", "png": "PNG"}
MAX_UPLOAD_BYTES = 20 * 1024 * 1024


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
    normalized_format = format.lower()
    if normalized_format not in SUPPORTED_FORMATS:
        raise HTTPException(status_code=400, detail="Unsupported output format.")

    if quality < 1 or quality > 95:
        raise HTTPException(status_code=400, detail="Quality must be between 1 and 95.")

    if max_width is not None and max_width < 1:
        raise HTTPException(status_code=400, detail="Max width must be positive.")

    if max_height is not None and max_height < 1:
        raise HTTPException(status_code=400, detail="Max height must be positive.")

    raw = await image.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Image must be 20MB or smaller.")

    try:
        source = Image.open(BytesIO(raw))
        source = ImageOps.exif_transpose(source)
    except UnidentifiedImageError as exc:
        raise HTTPException(status_code=400, detail="Uploaded file is not a valid image.") from exc

    if max_width or max_height:
        source.thumbnail(
            (
                max_width or source.width,
                max_height or source.height,
            ),
            Image.Resampling.LANCZOS,
        )

    output_format = SUPPORTED_FORMATS[normalized_format]
    output = BytesIO()
    save_options = build_save_options(normalized_format, quality)
    prepared = prepare_for_format(source, normalized_format)
    prepared.save(output, output_format, **save_options)
    output.seek(0)

    stem = Path(image.filename or "compressed").stem or "compressed"
    extension = "jpg" if normalized_format == "jpeg" else normalized_format
    filename = f"{stem}-compressed.{extension}"
    fallback_filename = f"compressed.{extension}"

    return StreamingResponse(
        output,
        media_type=f"image/{'jpeg' if normalized_format == 'jpeg' else normalized_format}",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{fallback_filename}"; '
                f"filename*=UTF-8''{quote(filename)}"
            )
        },
    )


def prepare_for_format(source: Image.Image, output_format: str) -> Image.Image:
    if output_format in {"jpeg", "webp"} and source.mode in {"RGBA", "LA", "P"}:
        background = Image.new("RGB", source.size, (255, 255, 255))
        if source.mode == "P":
            source = source.convert("RGBA")
        alpha = source.getchannel("A") if source.mode in {"RGBA", "LA"} else None
        background.paste(source.convert("RGB"), mask=alpha)
        return background

    if output_format == "jpeg" and source.mode != "RGB":
        return source.convert("RGB")

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
