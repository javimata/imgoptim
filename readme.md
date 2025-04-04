# Image Optimizer CLI

## Description

Image Optimizer CLI is a command-line tool to optimize images in your file system. It uses `sharp` to perform image manipulation, allowing you to easily convert, resize, and compress images.

## Features

* Command-line image optimization.
* Support for multiple output formats: jpg, png, webp.
* Control over image quality.
* Image resizing with aspect ratio options.
* Specification of the output folder for optimized images.

## Installation

1.  **Clone the repository:**

    ```bash
    git clone git@github.com:javimata/imgoptim.git
    ```

2.  **Navigate to the project directory:**

    ```bash
    cd imgoptim
    ```
3.  **Install dependencies:**

    ```bash
    npm install
    ```
4.  **Install the tool globally:**

    ```bash
    npm install -g .
    ```

## Usage

Once installed, you can use the `imgoptim` command from any directory in your terminal.

```bash
imgoptim --format <format> --quality <quality> --width <width> --height <height> --aspect <aspect> --folder <folder>
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

--preserve-format: Mantiene el formato original de cada imagen cuando no se especifica otro formato.

## Examples
Optimize all images in the current directory to webp format, with 70 quality, a width of 1000px, and save them in the "optimized" folder:

```bash
imgoptim --format webp --quality 70 --width 1000 --folder optimized --preserve-format
``` 