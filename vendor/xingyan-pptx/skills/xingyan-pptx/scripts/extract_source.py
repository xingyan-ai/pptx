#!/usr/bin/env python3
"""Extract readable text from PDF / DOCX / PPTX / XLSX / HTML / Markdown.

This is the only supported source-reading path. Do not write ad-hoc PDF parsers:
pypdf extracts this project's 29-page whitepaper in ~0.3 s.

Usage:
    python3 extract_source.py <input> --out <path> [--json]

The text file uses page markers:

    ===== PAGE 1 =====
    ...
    ===== PAGE 2 =====
    ...

stdout is a JSON report, so the Node wrapper can parse it without mixing text.
"""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'


def fail(message: str) -> None:
    print(json.dumps({'ok': False, 'error': message}, ensure_ascii=False))
    raise SystemExit(1)


def pdf_pages(path: Path, allow_agpl: bool = False) -> tuple[list[str], str]:
    attempts: list[str] = []
    try:
        from pypdf import PdfReader  # type: ignore
        reader = PdfReader(str(path))
        pages = [(page.extract_text() or '') for page in reader.pages]
        if any(page.strip() for page in pages):
            return pages, 'pypdf'
        attempts.append('pypdf: no text layer')
    except Exception as exc:  # noqa: BLE001
        attempts.append(f'pypdf: {exc}')
    try:
        import pdfplumber  # type: ignore
        with pdfplumber.open(str(path)) as pdf:
            pages = [(page.extract_text() or '') for page in pdf.pages]
        if any(page.strip() for page in pages):
            return pages, 'pdfplumber'
        attempts.append('pdfplumber: no text layer')
    except Exception as exc:  # noqa: BLE001
        attempts.append(f'pdfplumber: {exc}')
    # PyMuPDF is AGPL-3.0 (or Artifex commercial): backend/self-hosted only.
    if allow_agpl:
        try:
            import fitz  # type: ignore
            doc = fitz.open(str(path))
            pages = [(page.get_text() or '') for page in doc]
            if any(page.strip() for page in pages):
                return pages, 'pymupdf'
            attempts.append('pymupdf: no text layer')
        except Exception as exc:  # noqa: BLE001
            attempts.append(f'pymupdf: {exc}')
    else:
        attempts.append('pymupdf: AGPL-3.0, disabled (use --allow-agpl only for backend)')
    fail('没有可用的商业友好 PDF 文本库；请安装 pypdf：python3 -m pip install pypdf（或 pdfplumber）。尝试过：' + ' | '.join(attempts))
    return [], ''


def docx_text(path: Path) -> str:
    try:
        with zipfile.ZipFile(path) as archive:
            xml = archive.read('word/document.xml')
    except Exception as exc:  # noqa: BLE001
        fail(f'DOCX 读取失败：{exc}')
    try:
        root = ET.fromstring(xml)
    except Exception as exc:  # noqa: BLE001
        fail(f'DOCX XML 解析失败：{exc}')
    body = root.find(f'{W}body')
    out: list[str] = []

    def paragraph_text(node: ET.Element) -> str:
        return ''.join(t.text or '' for t in node.iter(f'{W}t')).strip()

    def walk(node: ET.Element) -> None:
        if node.tag == f'{W}p':
            text = paragraph_text(node)
            if text:
                out.append(text)
            return
        if node.tag == f'{W}tbl':
            for row in node.findall(f'{W}tr'):
                cells = []
                for cell in row.findall(f'{W}tc'):
                    cells.append(' '.join(
                        paragraph_text(p) for p in cell.findall(f'{W}p') if paragraph_text(p)
                    ).strip())
                if any(cells):
                    out.append(' | '.join(cells))
            return
        for child in node:
            walk(child)

    if body is not None:
        for child in body:
            walk(child)
    return '\n'.join(out)


def pptx_slides(path: Path) -> tuple[list[str], str]:
    try:
        from pptx import Presentation  # type: ignore
        slides: list[str] = []
        for slide in Presentation(str(path)).slides:
            texts: list[str] = []
            for shape in slide.shapes:
                if getattr(shape, 'has_text_frame', False) and shape.text_frame.text.strip():
                    texts.append(shape.text_frame.text.strip())
                if getattr(shape, 'has_table', False):
                    for row in shape.table.rows:
                        texts.append(' | '.join(cell.text.strip() for cell in row.cells))
            slides.append('\n'.join(texts))
        return slides, 'python-pptx'
    except Exception:
        pass
    # stdlib fallback: read the DrawingML slide parts directly.
    try:
        with zipfile.ZipFile(path) as archive:
            names = [n for n in archive.namelist() if re.fullmatch(r'ppt/slides/slide\d+\.xml', n)]
            names.sort(key=lambda n: int(re.search(r'(\d+)', n).group(1)))
            slides = []
            for name in names:
                root = ET.fromstring(archive.read(name))
                paragraphs = []
                for paragraph in root.iter(f'{A}p'):
                    text = ''.join(t.text or '' for t in paragraph.iter(f'{A}t')).strip()
                    if text:
                        paragraphs.append(text)
                slides.append('\n'.join(paragraphs))
            return slides, 'stdlib'
    except Exception as exc:  # noqa: BLE001
        fail(f'PPTX 读取失败：{exc}')
    return [], ''


def strip_html(text: str) -> str:
    text = re.sub(r'(?is)<(script|style).*?>.*?</\1>', ' ', text)
    text = re.sub(r'(?s)<[^>]+>', '\n', text)
    text = html.unescape(text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return '\n'.join(line.strip() for line in text.splitlines() if line.strip())


def _read_text_any(path: Path) -> str:
    """Decode a text file the way Windows tools actually save it.

    Notepad "Unicode" is UTF-16LE+BOM, PowerShell 5.1 `>` is UTF-16LE, and
    legacy editors save GBK. Reading everything as UTF-8 turns those into
    replacement characters without any error.
    """
    data = path.read_bytes()
    if data[:2] == b'\xff\xfe':
        return data[2:].decode('utf-16-le', errors='replace')
    if data[:2] == b'\xfe\xff':
        return data[2:].decode('utf-16-be', errors='replace')
    if data[:3] == b'\xef\xbb\xbf':
        data = data[3:]
    for encoding in ('utf-8', 'gb18030'):
        try:
            return data.decode(encoding)
        except UnicodeDecodeError:
            continue
    return data.decode('utf-8', errors='replace')


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument('input')
    parser.add_argument('--out', required=True)
    parser.add_argument('--json', action='store_true')
    parser.add_argument('--max-chars', type=int, default=0)
    parser.add_argument('--allow-agpl', action='store_true', help='Allow PyMuPDF (AGPL-3.0); backend/self-hosted only')
    args = parser.parse_args()

    source = Path(args.input).expanduser()
    if not source.exists():
        fail(f'找不到输入文件：{source}')

    suffix = source.suffix.lower()
    pages: list[str]
    engine = ''

    if suffix == '.pdf':
        pages, engine = pdf_pages(source, allow_agpl=args.allow_agpl)
        text = '\n\n'.join(f'===== PAGE {i + 1} =====\n{page.strip()}' for i, page in enumerate(pages))
    elif suffix == '.docx':
        body = docx_text(source)
        pages = [body]
        engine = 'stdlib'
        text = body
    elif suffix == '.pptx':
        pages, engine = pptx_slides(source)
        text = '\n\n'.join(f'===== SLIDE {i + 1} =====\n{page.strip()}' for i, page in enumerate(pages))
    elif suffix in {'.html', '.htm'}:
        body = strip_html(_read_text_any(source))
        pages = [body]
        engine = 'html'
        text = body
    elif suffix in {'.md', '.markdown', '.txt', '.csv'}:
        body = _read_text_any(source)
        pages = [body]
        engine = 'text'
        text = body
    else:
        fail(f'不支持的输入类型：{suffix or "(无扩展名)"}；支持 PDF / DOCX / PPTX / HTML / Markdown / TXT')

    if args.max_chars and len(text) > args.max_chars:
        text = text[: args.max_chars] + '\n\n[truncated]'

    out = Path(args.out).expanduser()
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(text, encoding='utf-8')

    empty_pages = [i + 1 for i, page in enumerate(pages) if not page.strip()]
    report = {
        'ok': True,
        'source': str(source),
        'kind': suffix.lstrip('.'),
        'engine': engine,
        'pages': len(pages),
        'chars': len(text),
        'emptyPages': empty_pages,
        'out': str(out),
    }
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
