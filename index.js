const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');


const keyIdAWS      = process.env.AWS_ACCESS_KEY_ID;
const regionAWS     = process.env.AWS_REGION;
const secretKeyAWS  = process.env.AWS_SECRET_ACCESS_KEY;
const bucketAWS     = process.env.S3_BUCKET_NAME;
const bucketFolderAWS   = process.env.S3_BUCKET_FOLDER || '/';

//* Configura el cliente S3 con la región correspondiente
const s3 = new S3Client({
    region: regionAWS,
    credentials: {
        accessKeyId: keyIdAWS,
        secretAccessKey: secretKeyAWS
    }
});

async function uploadGif(filePath) {
  try {
    //* Lee el archivo GIF
    const fileData = await fs.readFile(filePath);
    const fileName = path.basename(filePath);

    //* Define los parámetros para la subida
    const params = {
      Bucket: bucketAWS,
      Key: `${bucketFolderAWS}${fileName}`, // Ruta y nombre del archivo dentro del bucket
      Body: fileData,
      ContentType: 'image/gif'
    };

    //* Crea y envía el comando para subir el objeto
    const command = new PutObjectCommand(params);
    const data = await s3.send(command);
    
    //* El comando PutObjectCommand no retorna directamente la URL del objeto
    //* Puedes construir la URL manualmente si tu bucket es público:
    const url = `https://${bucketAWS}.s3.${regionAWS}.amazonaws.com/${params.Key}`;
    
    console.log('Termino el proceso:', {...data, fileName, url});
  } catch (error) {
    console.error('Error al subir el archivo:', error);
  }
}

async function uploadGifsFromFolder(folderPath) {
    try {
        // Lee la lista de archivos en la carpeta
        const files = await fs.readdir(folderPath);
        // Filtra únicamente los archivos que terminen en .gif (sin importar mayúsculas/minúsculas)
        const gifFiles = files.filter(file => file.toLowerCase().endsWith('.gif'));

        if (gifFiles.length === 0) {
            console.log('No se encontraron archivos GIF en la carpeta:', folderPath);
            return;
        }

        // Sube cada archivo GIF de forma secuencial
        for (const file of gifFiles) {
            const fullPath = path.join(folderPath, file);
            await uploadGif(fullPath);
        }
    } catch (error) {
        console.error('Error al leer la carpeta:', error);
    }
}
  
// La ruta de la carpeta se puede pasar como argumento.
const folderPath = process.argv[2] || './GIFS';
uploadGifsFromFolder(folderPath);

// const filePath = process.argv[2];
// if (!filePath) {
//   console.error('No se escribio ningun argumento. \nUso: node index.js <ruta-archivo>');
//   process.exit(1);
// }

// uploadGif(filePath);
