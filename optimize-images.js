#!/usr/bin/env node

/**
 * Optimizador de Imágenes de Línea de Comandos
 * ---------------------------------------
 * Una herramienta para optimizar imágenes desde la línea de comandos,
 * utilizando `sharp` para la manipulación de imágenes.
 */

const sharp = require("sharp");
const fs = require("fs");
const path = require("path");
const { Command } = require("commander");
const program = new Command();

// Define los valores predeterminados para las opciones.
const DEFAULT_FORMAT = "jpg";
const DEFAULT_QUALITY = 80;
const DEFAULT_WIDTH = null; // Ancho original
const DEFAULT_HEIGHT = null; // Alto original
const DEFAULT_ASPECT = "scale"; // 'scale', 'crop', o false
const DEFAULT_FOLDER = "optimized_images";
const SUPPORTED_FORMATS = ["jpg", "png", "webp"];

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
      if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
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
  const { format, quality, width, height, aspect, folder } = options;
  const useOriginalFormat = format === DEFAULT_FORMAT && options.preserveFormat;

  try {
    // 1. Verifica si el directorio de salida existe, si no, lo crea.
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder, { recursive: true });
    }

    // 2. Buscar todas las imágenes en el directorio actual y subdirectorios
    console.log(
      "Buscando imágenes en el directorio actual y subdirectorios..."
    );
    const currentDir = process.cwd();
    const imageFiles = await findImages(currentDir, currentDir);

    if (imageFiles.length === 0) {
      console.log("No se encontraron imágenes para optimizar.");
      return;
    }

    console.log(
      `Optimizando ${imageFiles.length} imágenes con las siguientes opciones:`
    );
    console.log(
      `  Formato: ${useOriginalFormat ? "Original de cada imagen" : format}`
    );
    console.log(`  Calidad: ${quality}`);
    console.log(`  Ancho: ${width === null ? "Original" : width}`);
    console.log(`  Alto: ${height === null ? "Original" : height}`);
    console.log(`  Aspecto: ${aspect}`);
    console.log(`  Carpeta de salida: ${folder}`);

    // 3. Itera sobre cada archivo de imagen y lo optimiza.
    for (const { file, relativePath } of imageFiles) {
      try {
        // Determina el formato original de la imagen
        const originalExt = path.extname(file).toLowerCase().substring(1);
        // Normaliza jpeg a jpg
        const originalFormat = originalExt === "jpeg" ? "jpg" : originalExt;

        // Define el formato de salida: usa el original si se especificó preserveFormat
        const outputFormat = useOriginalFormat ? originalFormat : format;

        // Crear la estructura de directorios en la carpeta de salida
        const outputDir = path.join(folder, relativePath);
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const outputFileName = path.parse(file).name + "." + outputFormat;
        const outputPath = path.join(outputDir, outputFileName);

        let sharpInstance = sharp(file);

        // 4. Redimensiona la imagen según las opciones de ancho, alto y aspect.
        if (width || height) {
          let resizeOptions = {
            width: width,
            height: height,
          };

          if (aspect === "scale") {
            resizeOptions.fit = sharp.fit.inside; // Mantiene aspect ratio, se ajusta al tamaño
          } else if (aspect === "crop") {
            resizeOptions.fit = sharp.fit.cover; // Mantiene aspect ratio, recorta si es necesario
            resizeOptions.position = sharp.strategy.entropy; // Opcional: punto de recorte
          } else {
            // aspect === false: No mantiene aspect ratio, estira la imagen
          }
          sharpInstance = sharpInstance.resize(resizeOptions);
        }

        // 5. Convierte la imagen al formato de salida y establece la calidad.
        switch (outputFormat) {
          case "jpg":
            sharpInstance = sharpInstance.jpeg({ quality });
            break;
          case "png":
            sharpInstance = sharpInstance.png({ quality });
            break;
          case "webp":
            sharpInstance = sharpInstance.webp({ quality });
            break;
        }

        // 6. Guarda la imagen optimizada en el directorio de salida.
        await sharpInstance.toFile(outputPath);

        // Muestra la ruta relativa para mayor claridad
        const relativeInputPath = path.relative(currentDir, file);
        const relativeOutputPath = path.relative(currentDir, outputPath);
        console.log(
          `Optimizado: ${relativeInputPath} -> ${relativeOutputPath}`
        );
      } catch (error) {
        console.error(`Error al procesar la imagen ${file}:`, error.message);
      }
    }
    console.log("¡Todas las imágenes han sido optimizadas!");
  } catch (error) {
    console.error("Error en el proceso de optimización:", error);
  }
}

// Define los comandos y las opciones que se pueden usar en la terminal.
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
    parseInt,
    DEFAULT_QUALITY
  )
  .option(
    "-w, --width <width>",
    "Ancho de la imagen de salida (default: ancho original)",
    parseInt,
    DEFAULT_WIDTH
  )
  .option(
    "-h, --height <height>",
    "Alto de la imagen de salida (default: alto original)",
    parseInt,
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
