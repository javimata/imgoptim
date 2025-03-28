#!/usr/bin/env node

/**
 * Optimizador de Imágenes de Línea de Comandos
 * ---------------------------------------
 * Una herramienta para optimizar imágenes desde la línea de comandos,
 * utilizando `sharp` para la manipulación de imágenes.
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { Command } = require('commander');
const program = new Command();

// Define los valores predeterminados para las opciones.
const DEFAULT_FORMAT = 'jpg';
const DEFAULT_QUALITY = 80;
const DEFAULT_WIDTH = null; // Ancho original
const DEFAULT_HEIGHT = null; // Alto original
const DEFAULT_ASPECT = 'scale';  // 'scale', 'crop', o false
const DEFAULT_FOLDER = 'optimized_images';
const SUPPORTED_FORMATS = ['jpg', 'png', 'webp'];

/**
 * Función principal que realiza la optimización de imágenes.
 */
async function optimizeImages(options) {
    const { format, quality, width, height, aspect, folder } = options;

    // 1. Verifica si el directorio de salida existe, si no, lo crea.
    if (!fs.existsSync(folder)) {
        fs.mkdirSync(folder, { recursive: true });
    }

    // 2. Lee todos los archivos en el directorio actual.
    fs.readdir('.', async (err, files) => {
        if (err) {
            console.error('Error al leer el directorio:', err);
            return;
        }

        // 3. Filtra los archivos para obtener solo imágenes (jpg, png, webp).
        const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
        });

        if (imageFiles.length === 0) {
            console.log('No se encontraron imágenes para optimizar en este directorio.');
            return;
        }

        console.log(`Optimizando ${imageFiles.length} imágenes con las siguientes opciones:`);
        console.log(`  Formato: ${format}`);
        console.log(`  Calidad: ${quality}`);
        console.log(`  Ancho: ${width === null ? 'Original' : width}`);
        console.log(`  Alto: ${height === null ? 'Original' : height}`);
        console.log(`  Aspecto: ${aspect}`);
        console.log(`  Carpeta de salida: ${folder}`);

        // 4. Itera sobre cada archivo de imagen y lo optimiza.
        for (const file of imageFiles) {
            try {
                const inputPath = file;
                const outputPath = path.join(folder, path.parse(file).name + '.' + format);

                let sharpInstance = sharp(inputPath);

                // 5. Redimensiona la imagen según las opciones de ancho, alto y aspect.
                if (width || height) {
                    let resizeOptions = {
                        width: width,
                        height: height,
                    };

                    if (aspect === 'scale') {
                        resizeOptions.fit = sharp.fit.inside; // Mantiene aspect ratio, se ajusta al tamaño
                    } else if (aspect === 'crop') {
                         resizeOptions.fit = sharp.fit.cover;  // Mantiene aspect ratio, recorta si es necesario
                         resizeOptions.position = sharp.strategy.entropy; // Opcional: punto de recorte
                    } else {
                        // aspect === false: No mantiene aspect ratio, estira la imagen
                    }
                    sharpInstance = sharpInstance.resize(resizeOptions);
                }
                // 6. Convierte la imagen al formato de salida y establece la calidad.
                switch (format) {
                    case 'jpg':
                        sharpInstance = sharpInstance.jpeg({ quality });
                        break;
                    case 'png':
                        sharpInstance = sharpInstance.png({ quality });
                        break;
                    case 'webp':
                        sharpInstance = sharpInstance.webp({ quality });
                        break;
                }

                // 7. Guarda la imagen optimizada en el directorio de salida.
                await sharpInstance.toFile(outputPath);
                console.log(`Optimizado: ${file} -> ${outputPath}`);

            } catch (error) {
                console.error(`Error al procesar la imagen ${file}:`, error);
            }
        }
        console.log('¡Todas las imágenes han sido optimizadas!');
    });
}

// 8. Define los comandos y las opciones que se pueden usar en la terminal.
program
    .version('1.0.0')
    .description('Optimiza imágenes en el directorio actual.')
    .option('-f, --format <format>', `Formato de salida: ${SUPPORTED_FORMATS.join(', ')} (default: ${DEFAULT_FORMAT})`, DEFAULT_FORMAT)
    .option('-q, --quality <quality>', `Calidad de la imagen (1-100) (default: ${DEFAULT_QUALITY})`, parseInt, DEFAULT_QUALITY)
    .option('-w, --width <width>', 'Ancho de la imagen de salida (default: ancho original)', parseInt, DEFAULT_WIDTH)
    .option('-h, --height <height>', 'Alto de la imagen de salida (default: alto original)', parseInt, DEFAULT_HEIGHT)
    .option('-a, --aspect <aspect>', `Modo de ajuste de aspecto: scale, crop, false (default: ${DEFAULT_ASPECT})`, DEFAULT_ASPECT)
    .option('-o, --folder <folder>', `Carpeta de salida para las imágenes optimizadas (default: ${DEFAULT_FOLDER})`, DEFAULT_FOLDER)
    .action((options) => {
        // 9. Valida las opciones ingresadas por el usuario.
        if (!SUPPORTED_FORMATS.includes(options.format)) {
            console.error(`Error: El formato debe ser uno de: ${SUPPORTED_FORMATS.join(', ')}`);
            process.exit(1);
        }
        if (options.quality < 1 || options.quality > 100) {
            console.error('Error: La calidad debe estar entre 1 y 100.');
            process.exit(1);
        }
        if (options.aspect !== 'scale' && options.aspect !== 'crop' && options.aspect !== false) {
            console.error("Error: El aspecto debe ser 'scale', 'crop' o false.");
            process.exit(1);
        }
        if (options.width === null && options.height !== null) {
            console.error("Error: Si se especifica el alto, también debe especificarse el ancho.");
            process.exit(1);
        }

        // 10. Llama a la función principal para iniciar el proceso de optimización.
        optimizeImages(options);
    });

// 11. Inicia el procesamiento de los argumentos de la línea de comandos.
program.parse(process.argv);

