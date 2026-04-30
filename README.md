# Image Workshop

前后端分离的图像处理工具集合。首页是像素田园风格的图像处理大厅，点击任意工具后进入对应工作台。

## 项目结构

```text
backend/
  app/
    main.py
  tests/
  requirements.txt
  requirements-dev.txt
frontend/
  index.html
  styles.css
  app.js
```

## 功能

- 图像处理工具大厅：统一承载所有小工具。
- 图片压缩：调整质量、格式和最大宽高。
- 尺寸调整：按宽高缩放，可保持比例或精确拉伸。
- 格式转换：JPEG、WebP、PNG 互转。
- 图片裁剪：按像素坐标裁剪指定区域。
- 水印处理：添加文字水印，支持位置、透明度和字号。
- 色彩微调：调整亮度、对比度、饱和度和锐度。
- 批量处理：多图统一压缩、调整尺寸、转换格式或清理信息，输出 zip。
- 信息清理：重新导出图片并去除元数据。
- 智能参考：尺寸调整、图片裁剪、色彩微调会在上传后展示原图尺寸、比例、方向或色彩概况，并提供一键建议。

## 启动后端

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

如果还没有安装依赖：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
```

后端健康检查：

```text
http://127.0.0.1:8000/health
```

## 启动前端

另开一个 PowerShell：

```powershell
cd frontend
python -m http.server 5173
```

访问：

```text
http://127.0.0.1:5173
```

常用二级页：

```text
http://127.0.0.1:5173/#compress
http://127.0.0.1:5173/#resize
http://127.0.0.1:5173/#convert
http://127.0.0.1:5173/#crop
http://127.0.0.1:5173/#watermark
http://127.0.0.1:5173/#color
http://127.0.0.1:5173/#batch
http://127.0.0.1:5173/#metadata
```

## 运行测试

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pytest
```
