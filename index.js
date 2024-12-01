const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const qrcode = require('qrcode-terminal'); // Para mostrar el QR en la terminal

// Ruta de la carpeta donde se guardarán las imágenes y stickers
const imagesFolderPath = path.join(__dirname, 'images');

// Crear la carpeta si no existe
if (!fs.existsSync(imagesFolderPath)) {
    fs.mkdirSync(imagesFolderPath);
}

// Configuración del cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth(), // Estrategia de autenticación local (mantiene sesión)
    puppeteer: { headless: true }   // Si necesitas usar Puppeteer en modo headless (sin interfaz gráfica)
});

// Escucha cuando el QR es generado
client.on('qr', qr => {
    console.log('QR RECEIVED');
    qrcode.generate(qr, { small: true });  // Muestra el QR en formato visual en la terminal
});

// Escucha cuando el cliente está listo
client.on('ready', () => {
    console.log('Cliente está listo!');
});

// Maneja los mensajes entrantes
client.on('message', async message => {
    console.log(`Mensaje recibido: ${message.body}`);  // Muestra el contenido del mensaje recibido

    if (message.hasMedia) {
        try {
            const media = await message.downloadMedia();
            if (media.mimetype.startsWith('image/')) {
                const timestamp = Date.now();
                const imageName = `received-image-${timestamp}.jpg`;
                const stickerName = `sticker-${timestamp}.webp`;

                const imagePath = path.join(imagesFolderPath, imageName);
                fs.writeFileSync(imagePath, media.data, 'base64');
                console.log('Imagen guardada temporalmente en:', imagePath);

                // Convertir la imagen en un sticker usando Sharp
                const stickerPath = path.join(imagesFolderPath, stickerName);

                // Redimensionar y mantener la relación de aspecto, luego recortar para que el sticker tenga el tamaño adecuado
                await sharp(imagePath)
                    .resize(512, 512, { fit: sharp.fit.cover, position: sharp.strategy.entropy }) // Ajuste inteligente y recorte
                    .webp({ quality: 100, lossless: true })
                    .toFile(stickerPath);
                console.log('Sticker generado en:', stickerPath);

                // Crear el sticker a partir del archivo generado
                const sticker = MessageMedia.fromFilePath(stickerPath);
                await client.sendMessage(message.from, sticker, { sendMediaAsSticker: true });
                console.log('Sticker enviado!');

                // Añadir un retardo antes de eliminar los archivos temporales
                setTimeout(() => {
                    try {
                        fs.unlinkSync(imagePath);
                        fs.unlinkSync(stickerPath);
                        console.log('Archivos temporales eliminados');
                    } catch (err) {
                        console.error('Error al eliminar los archivos temporales:', err);
                    }
                }, 5000); // Retardo de 5 segundos
            }
        } catch (error) {
            console.error('Error al procesar la imagen o enviar el sticker:', error);
        }
    }
});

// Inicializar el cliente de WhatsApp
client.initialize();
