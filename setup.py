"""
Setup script for DJNext Admin.

Install: pip install djnext-admin
"""

from setuptools import setup, find_packages

try:
    with open("README.md", "r", encoding="utf-8") as fh:
        long_description = fh.read()
except FileNotFoundError:
    long_description = "Headless Django Admin API with optional Next.js frontend."

def _get_package_data():
    """Include templates/ and static/ (filled by post-build-to-static.py)."""
    import os
    root = os.path.dirname(__file__)
    files = []
    for subdir in ("templates", "static"):
        d = os.path.join(root, subdir)
        if not os.path.isdir(d):
            continue
        for dirpath, _dirs, filenames in os.walk(d):
            for name in filenames:
                abs_path = os.path.join(dirpath, name)
                rel = os.path.relpath(abs_path, root)
                files.append(rel)
    return files


# Version kept in sync with __init__.py (and with GitHub tag v*)
def _get_version():
    import os
    path = os.path.join(os.path.dirname(__file__), "__init__.py")
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("__version__"):
                    return line.split("=")[1].strip().strip('"').strip("'")
    except FileNotFoundError:
        pass
    return "0.1.0"

# Root package lives in current dir; subpackages are core, migrations, serializers, views.
_subpackages = find_packages(exclude=["tests", "tests.*", "frontend"])
packages = ["djnext_admin"] + ["djnext_admin." + p for p in _subpackages]

setup(
    name="djnext-admin",
    version=_get_version(),
    author="DJNext",
    description="Headless Django Admin API – auto REST from your admin registry, optional modern frontend",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/zohaib3249/djnext_admin",
    project_urls={
        "Bug Reports": "https://github.com/zohaib3249/djnext_admin/issues",
        "Source": "https://github.com/zohaib3249/djnext_admin",
    },
    package_dir={"djnext_admin": "."},
    packages=packages,
    include_package_data=True,
    package_data={
        "djnext_admin": _get_package_data(),
    },
    keywords="django, admin, rest, api, headless, django-admin",
    license="MIT",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Framework :: Django",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Topic :: Internet :: WWW/HTTP",
    ],
    python_requires=">=3.10",
    install_requires=[
        "Django>=5.2",
        "djangorestframework>=3.16",
        "djangorestframework-simplejwt>=5.5",
    ],
)
