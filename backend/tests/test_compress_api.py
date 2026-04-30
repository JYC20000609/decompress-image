from io import BytesIO
from zipfile import ZipFile

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app


client = TestClient(app)


def make_test_image() -> BytesIO:
    buffer = BytesIO()
    image = Image.new("RGBA", (80, 40), (35, 99, 235, 255))
    image.save(buffer, format="PNG")
    buffer.seek(0)
    return buffer


def test_health() -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_compress_image_to_jpeg_with_resize() -> None:
    source = make_test_image()

    response = client.post(
        "/api/compress",
        files={"image": ("sample.png", source, "image/png")},
        data={"quality": "70", "format": "jpeg", "max_width": "20"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/jpeg"
    assert "sample-compressed.jpg" in response.headers["content-disposition"]

    result = Image.open(BytesIO(response.content))
    assert result.format == "JPEG"
    assert result.width <= 20


def test_compress_supports_non_ascii_filename() -> None:
    source = make_test_image()

    response = client.post(
        "/api/compress",
        files={"image": ("微信图片.png", source, "image/png")},
        data={"quality": "70", "format": "jpeg"},
    )

    assert response.status_code == 200
    assert 'filename="compressed.jpg"' in response.headers["content-disposition"]
    assert "filename*=UTF-8''" in response.headers["content-disposition"]


def test_compress_rejects_unsupported_format() -> None:
    source = make_test_image()

    response = client.post(
        "/api/compress",
        files={"image": ("sample.png", source, "image/png")},
        data={"format": "gif"},
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Unsupported output format."


def test_resize_image_exact_dimensions() -> None:
    source = make_test_image()

    response = client.post(
        "/api/resize",
        files={"image": ("sample.png", source, "image/png")},
        data={"width": "30", "height": "20", "keep_aspect": "false", "format": "png"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/png"

    result = Image.open(BytesIO(response.content))
    assert result.size == (30, 20)


def test_crop_image() -> None:
    source = make_test_image()

    response = client.post(
        "/api/crop",
        files={"image": ("sample.png", source, "image/png")},
        data={"x": "10", "y": "5", "width": "30", "height": "20", "format": "jpeg"},
    )

    assert response.status_code == 200
    result = Image.open(BytesIO(response.content))
    assert result.size == (30, 20)


def test_watermark_image() -> None:
    source = make_test_image()

    response = client.post(
        "/api/watermark",
        files={"image": ("sample.png", source, "image/png")},
        data={"text": "Demo", "position": "center", "format": "png"},
    )

    assert response.status_code == 200
    result = Image.open(BytesIO(response.content))
    assert result.size == (80, 40)


def test_color_image() -> None:
    source = make_test_image()

    response = client.post(
        "/api/color",
        files={"image": ("sample.png", source, "image/png")},
        data={"brightness": "1.2", "contrast": "1.1", "saturation": "0.8", "format": "webp"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "image/webp"


def test_batch_returns_zip() -> None:
    first = make_test_image()
    second = make_test_image()

    response = client.post(
        "/api/batch",
        files=[
            ("images", ("one.png", first, "image/png")),
            ("images", ("two.png", second, "image/png")),
        ],
        data={"operation": "convert", "format": "jpeg"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/zip"

    archive = ZipFile(BytesIO(response.content))
    assert archive.namelist() == ["one-convert.jpg", "two-convert.jpg"]
