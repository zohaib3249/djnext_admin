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

# Version kept in sync with __init__.py (and with GitHub tag v*)
def _get_version():
    import os
    path = os.path.join(os.path.dirname(__file__), "__init__.py")
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if line.startswith("__version__"):
                return line.split("=")[1].strip().strip('"').strip("'")
    return "0.1.0"

setup(
    name="djnext-admin",
    version=_get_version(),
    author="DJNext",
    description="Headless Django Admin API – auto REST from your admin registry, optional modern frontend",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/your-org/djnext_admin",
    project_urls={
        "Bug Reports": "https://github.com/your-org/djnext_admin/issues",
        "Source": "https://github.com/your-org/djnext_admin",
    },
    packages=find_packages(exclude=["tests", "tests.*", "frontend"]),
    include_package_data=True,
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
    python_requires=">=3.9",
    install_requires=[
        "Django>=4.0",
        "djangorestframework>=3.14",
        "djangorestframework-simplejwt>=5.3",
    ],
)
