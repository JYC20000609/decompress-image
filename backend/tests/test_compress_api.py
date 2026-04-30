from io import BytesIO

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
