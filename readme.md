# Image Optimizer CLI

## Description

Image Optimizer CLI is a command-line tool to optimize images in your file system. It uses `sharp` to perform image manipulation, allowing you to easily convert, resize, and compress images.

## Features

* Command-line image optimization.
* Support for multiple output formats: jpg, png, webp.
* Control over image quality.
* Image resizing with aspect ratio options.
* Specification of the output folder for optimized images.

## New Features

* Support for SVG optimization using `svgo`.
* Real-time progress display with a fixed message showing the current image being processed.
* Option to display or hide the results table using the `--show-table` flag.

## Installation

1. **Install from npm:**

    ```bash
    npm install -g imgoptim-cli
    ```

2. **Verify the installation:**

    ```bash
    imgoptim --help
    ```

## Usage

Once installed, you can use the `imgoptim` command from any directory in your terminal.

```bash
imgoptim --format <format> --quality <quality> --width <width> --height <height> --aspect <aspect> --folder <folder> --preserve-format --show-table
```

## Options
-f, --format <format>: Output format of the image. Options: jpg, png, webp. Default: jpg.

-q, --quality <quality>: Quality of the output image (1-100). Default: 80.

-w, --width <width>: Width of the output image. Default: original width.

-h, --height <height>: Height of the output image. Default: original height.

-a, --aspect <aspect>: Aspect ratio adjustment mode. Options: scale, crop, false. Default: scale.

scale: Scale the image, maintaining the aspect ratio.

crop: Crop the image to fit the dimensions, maintaining the aspect ratio.

false: Do not maintain the aspect ratio; stretch the image.

-o, --folder <folder>: Output folder for the optimized images. Default: optimized_images.

--preserve-format: Keeps the original format of each image when no other format is specified.

--show-table: Displays the results table at the end of the process. Default: false.

## Examples
Optimize all images in the current directory to webp format, with 70 quality, a width of 1000px, and save them in the "optimized" folder, while showing the results table:

```bash
imgoptim --format webp --quality 70 --width 1000 --folder optimized --preserve-format --show-table
```

Optimize all images in the current directory without displaying the results table:

```bash
imgoptim --format webp --quality 70 --width 1000 --folder optimized --preserve-format
```