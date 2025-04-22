#!/usr/bin/env node

/**
 * Optimizador de Imágenes de Línea de Comandos
 * ---------------------------------------
 * Una herramienta para optimizar imágenes desde la línea de comandos,
 * utilizando `sharp` para la manipulación de imágenes.
 */

import sharp from "sharp";
import fs from "fs";
import path from "path";
import { Command } from "commander";
import Table from "cli-table3";
import chalk from "chalk";
import { optimize as optimizeSvg } from "svgo";

// Define los valores predeterminados para las opciones.
const DEFAULT_FORMAT = "jpg";
const DEFAULT_QUALITY = 80;
const DEFAULT_WIDTH = null; // Ancho original
const DEFAULT_HEIGHT = null; // Alto original
const DEFAULT_ASPECT = "scale"; // 'scale', 'crop', o false
const DEFAULT_FOLDER = "optimized_images";
const SUPPORTED_FORMATS = ["jpg", "png", "webp", "svg"];

/**
 * Función para buscar todas las imágenes en un directorio y sus subdirectorios.
 * @param {string} dir - Directorio para buscar imágenes
 * @param {string} baseDir - Directorio base para calcular rutas relativas
 * @returns {Promise<Array<{file: string, relativePath: string}>>} Lista de imágenes encontradas con sus rutas relativas
 */
async function findImages(dir, baseDir) {
  let results = [];

  // Lee los archivos en el directorio actual
  const items = await fs.promises.readdir(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      // Es un directorio, busca imágenes recursivamente
      const subResults = await findImages(fullPath, baseDir);
      results = results.concat(subResults);
    } else {
      // Es un archivo, verifica si es una imagen
      const ext = path.extname(item.name).toLowerCase();
      if ([".jpg", ".jpeg", ".png", ".webp", ".svg"].includes(ext)) {
        // Calcula la ruta relativa desde el directorio base
        const relativePath = path.relative(baseDir, dir);
        results.push({
          file: fullPath,
          relativePath: relativePath,
        });
      }
    }
  }

  return results;
}

/**
 * Función principal que realiza la optimización de imágenes.
 */
async function optimizeImages(options) {
  const {
    format,
    quality: qualityRaw,
    width,
    height,
    aspect,
    folder,
    showTable,
  } = options;
  const quality = parseInt(qualityRaw, 10);
  const useOriginalFormat = format === DEFAULT_FORMAT && options.preserveFormat;

  try {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    console.log(
      chalk.blue(
        "Buscando imágenes en el directorio actual y subdirectorios..."
      )
    );
    const currentDir = process.cwd();
    const imageFiles = await findImages(currentDir, currentDir);

    if (imageFiles.length === 0) {
      console.log(chalk.yellow("No se encontraron imágenes para optimizar."));
      return;
    }

    console.log(
      chalk.green(
        `Optimizando ${imageFiles.length} imágenes con las siguientes opciones:`
      )
    );
    console.log(
      `  Formato: ${useOriginalFormat ? "Original de cada imagen" : format}`
    );
    console.log(`  Calidad: ${quality}`);
    console.log(`  Ancho: ${width === null ? "Original" : width}`);
    console.log(`  Alto: ${height === null ? "Original" : height}`);
    console.log(`  Aspecto: ${aspect}`);
    console.log(`  Carpeta de salida: ${folder}`);

    console.log(chalk.blue("Iniciando la optimización de imágenes..."));

    let totalOriginalSize = 0;
    let totalOptimizedSize = 0;

    const table = new Table({
      head: [
        chalk.bold("#"),
        chalk.bold("Imagen Original"),
        chalk.bold("Tamaño Original"),
        chalk.bold("Imagen Optimizada"),
        chalk.bold("Tamaño Optimizado"),
        chalk.bold("Reducción"),
        chalk.bold("Estado"),
      ],
      colWidths: [5, 30, 20, 30, 20, 15, 10],
    });

    let optimizedCount = 0;

    process.stdout.write(chalk.blue("Optimizando 0 de " + imageFiles.length + " imágenes...\r"));

    for (const [index, { file, relativePath }] of imageFiles.entries()) {
      try {
        const originalSize = fs.statSync(file).size;
        totalOriginalSize += originalSize;

        const originalExt = path.extname(file).toLowerCase().substring(1);
        const originalFormat = originalExt === "jpeg" ? "jpg" : originalExt;

        if (originalFormat === "svg") {
          // Procesar archivos SVG
          const svgContent = fs.readFileSync(file, "utf8");
          const optimizedSvg = optimizeSvg(svgContent, { multipass: true });

          const outputDir = path.join(folder, relativePath);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          const outputFileName = path.parse(file).name + ".svg";
          const outputPath = path.join(outputDir, outputFileName);

          fs.writeFileSync(outputPath, optimizedSvg.data, "utf8");

          const optimizedSize = fs.statSync(outputPath).size;
          totalOptimizedSize += optimizedSize;

          const reduction = ((originalSize - optimizedSize) / originalSize) * 100;

          table.push([
            chalk.yellow(index + 1),
            chalk.cyan(path.relative(currentDir, file)),
            chalk.yellow(`${(originalSize / 1024).toFixed(2)} KB`),
            chalk.green(path.relative(currentDir, outputPath)),
            chalk.yellow(`${(optimizedSize / 1024).toFixed(2)} KB`),
            chalk.magenta(`${reduction.toFixed(2)}%`),
            chalk.green("✅ Éxito"),
          ]);

          optimizedCount++;
        } else {
          const outputFormat = useOriginalFormat ? originalFormat : format;

          const outputDir = path.join(folder, relativePath);
          if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
          }

          const outputFileName = path.parse(file).name + "." + outputFormat;
          const outputPath = path.join(outputDir, outputFileName);

          let sharpInstance = sharp(file);

          if (width || height) {
            let resizeOptions = { width, height };
            if (aspect === "scale") {
              resizeOptions.fit = sharp.fit.inside;
            } else if (aspect === "crop") {
              resizeOptions.fit = sharp.fit.cover;
              resizeOptions.position = sharp.strategy.entropy;
            }
            sharpInstance = sharpInstance.resize(resizeOptions);
          }

          switch (outputFormat) {
            case "jpg":
              sharpInstance = sharpInstance.jpeg({ quality });
              break;
            case "png":
              const compressionLevel = Math.max(
                0,
                Math.min(9, Math.floor((100 - quality) / 11))
              );
              sharpInstance = sharpInstance.png({
                compressionLevel,
                adaptiveFiltering: true,
                palette: true,
              });
              break;
            case "webp":
              sharpInstance = sharpInstance.webp({ quality });
              break;
          }

          await sharpInstance.toFile(outputPath);

          const optimizedSize = fs.statSync(outputPath).size;
          totalOptimizedSize += optimizedSize;

          const reduction = ((originalSize - optimizedSize) / originalSize) * 100;

          table.push([
            chalk.yellow(index + 1),
            chalk.cyan(path.relative(currentDir, file)),
            chalk.yellow(`${(originalSize / 1024).toFixed(2)} KB`),
            chalk.green(path.relative(currentDir, outputPath)),
            chalk.yellow(`${(optimizedSize / 1024).toFixed(2)} KB`),
            chalk.magenta(`${reduction.toFixed(2)}%`),
            chalk.green("✅ Éxito"),
          ]);

          optimizedCount++;
        }
      } catch (error) {
        table.push([
          chalk.yellow(index + 1),
          chalk.cyan(path.relative(currentDir, file)),
          chalk.yellow("-"),
          chalk.red("-"),
          chalk.red("-"),
          chalk.red("-"),
          chalk.red("⚠️ Error"),
        ]);
        console.error(
          chalk.red(`Error al procesar la imagen ${file}: ${error.message}`)
        );
      }

      // Actualizar el texto fijo con el progreso
      process.stdout.write(
        chalk.blue(`Optimizando ${index + 1} de ${imageFiles.length} imágenes...\r`)
      );
    }

    if (showTable) {
      console.log("\n" + table.toString());
    }

    const totalReduction =
      ((totalOriginalSize - totalOptimizedSize) / totalOriginalSize) * 100;
    console.log(chalk.green("\nResumen:"));
    console.log(chalk.green(`  Imágenes optimizadas: ${optimizedCount}`));
    console.log(
      chalk.green(
        `  Tamaño total original: ${(totalOriginalSize / 1024).toFixed(2)} KB`
      )
    );
    console.log(
      chalk.green(
        `  Tamaño total optimizado: ${(totalOptimizedSize / 1024).toFixed(
          2
        )} KB`
      )
    );
    console.log(
      chalk.green(`  Reducción total: ${totalReduction.toFixed(2)}%`)
    );
  } catch (error) {
    console.error(chalk.red("Error en el proceso de optimización:"), error);
  }
}

// Define los comandos y las opciones que se pueden usar en la terminal.
const program = new Command();

program
  .version("1.0.0")
  .description("Optimiza imágenes en el directorio actual y subdirectorios.")
  .option(
    "-f, --format <format>",
    `Formato de salida: ${SUPPORTED_FORMATS.join(
      ", "
    )} (default: ${DEFAULT_FORMAT})`,
    DEFAULT_FORMAT
  )
  .option(
    "-q, --quality <quality>",
    `Calidad de la imagen (1-100) (default: ${DEFAULT_QUALITY})`,
    (value) => parseInt(value, 10),
    DEFAULT_QUALITY
  )
  .option(
    "-w, --width <width>",
    "Ancho de la imagen de salida (default: ancho original)",
    (value) => parseInt(value, 10),
    DEFAULT_WIDTH
  )
  .option(
    "-h, --height <height>",
    "Alto de la imagen de salida (default: alto original)",
    (value) => parseInt(value, 10),
    DEFAULT_HEIGHT
  )
  .option(
    "-a, --aspect <aspect>",
    `Modo de ajuste de aspecto: scale, crop, false (default: ${DEFAULT_ASPECT})`,
    DEFAULT_ASPECT
  )
  .option(
    "-o, --folder <folder>",
    `Carpeta de salida para las imágenes optimizadas (default: ${DEFAULT_FOLDER})`,
    DEFAULT_FOLDER
  )
  .option(
    "--preserve-format",
    "Mantiene el formato original de cada imagen cuando no se especifica otro formato",
    true
  )
  .option(
    "--show-table",
    "Muestra la tabla de resultados al final del proceso",
    false
  )
  .action((options) => {
    // Valida las opciones ingresadas por el usuario.
    if (!SUPPORTED_FORMATS.includes(options.format)) {
      console.error(
        `Error: El formato debe ser uno de: ${SUPPORTED_FORMATS.join(", ")}`
      );
      process.exit(1);
    }
    if (options.quality < 1 || options.quality > 100) {
      console.error("Error: La calidad debe estar entre 1 y 100.");
      process.exit(1);
    }
    if (
      options.aspect !== "scale" &&
      options.aspect !== "crop" &&
      options.aspect !== false
    ) {
      console.error("Error: El aspecto debe ser 'scale', 'crop' o false.");
      process.exit(1);
    }

    // Llama a la función principal para iniciar el proceso de optimización.
    optimizeImages(options);
  });

// Inicia el procesamiento de los argumentos de la línea de comandos.
program.parse(process.argv);
