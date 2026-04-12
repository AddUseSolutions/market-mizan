import os
from urllib.parse import urlparse

import requests


def download_images(image_urls, property_id, upload_root, timeout=30):
    saved_paths = []
    property_dir = os.path.join(upload_root, property_id)
    os.makedirs(property_dir, exist_ok=True)

    for index, image_url in enumerate(image_urls, start=1):
        if not image_url:
            continue
        try:
            parsed = urlparse(image_url)
            ext = os.path.splitext(parsed.path)[1] or ".jpg"
            file_name = f"{index}{ext[:5]}"
            file_path = os.path.join(property_dir, file_name)

            response = requests.get(image_url, timeout=timeout)
            response.raise_for_status()
            with open(file_path, "wb") as f:
                f.write(response.content)

            saved_paths.append(file_path)
        except Exception:
            continue

    return saved_paths
