const fs = require('fs').promises;
const path = require('path');
require('dotenv').config();
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

const config_aws = {
    keyId        : process.env.AWS_ACCESS_KEY_ID,
    region       : process.env.AWS_REGION,
    secretKey    : process.env.AWS_SECRET_ACCESS_KEY,
    bucket       : process.env.S3_BUCKET_NAME,
    bucketFolder : process.env.S3_BUCKET_FOLDER,
}
const fileTypes = {
    svg: {
      contentType: 'image/svg+xml',
      extension: '.svg'
    },
    gif: {
      contentType: 'image/gif',
      extension: '.gif'
    }
}

//* Configura el cliente S3 con la región correspondiente
const s3 = new S3Client({
    region: config_aws.region,
    credentials: {
        accessKeyId: config_aws.keyId,
        secretAccessKey: config_aws.secretKey
    }
});

async function uploadFile(filePath, contentType) {
  try {
    const {region, bucket, bucketFolder} = config_aws;

    //* Lee el archivo
    const fileData = await fs.readFile(filePath);
    const fileName = path.basename(filePath);

    //* Define los parámetros para la subida
    const params = {
      Bucket: bucket,
      Key: `${bucketFolder}${fileName}`, // Ruta y nombre del archivo dentro del bucket
      Body: fileData,
      ContentType: contentType
    };

    //* Crea y envía el comando para subir el objeto
    const command = new PutObjectCommand(params);
    const data = await s3.send(command);
    
    if(data['$metadata']?.httpStatusCode === 200) {
      //* El comando PutObjectCommand no retorna directamente la URL del objeto
      //* Puedes construir la URL manualmente si tu bucket es público:
      const url = `https://${bucket}.s3.${region}.amazonaws.com/${bucketFolder}${fileName}`;
      console.log('data: ', {...data, fileName, url});

      //Eliminar el archivo
      await moveFile(filePath)
    }

    console.log('Termino el proceso!')
  } catch (error) {
    console.error('Error al subir el archivo:', error);
  }
}

async function uploadFilesFromFolder(folderPath, fileType) {
    try {
        const { extension, contentType } = fileType;
        // Lee la lista de archivos en la carpeta
        const files = await fs.readdir(folderPath);
        // Filtra únicamente los archivos que terminen con la extension especificada (sin importar mayúsculas/minúsculas)
        const filterFiles = files.filter(file => file.toLowerCase().endsWith(extension));

        if (filterFiles.length === 0) {
            console.log(`No se encontraron archivos de extensión ${extension} en la carpeta:`, folderPath);
            return;
        }

        // Sube cada archivo de forma secuencial
        for (const file of filterFiles) {
            const fullPath = path.join(folderPath, file);
            await uploadFile(fullPath, contentType);
        }
    } catch (error) {
        console.error('Error al leer la carpeta:', error);
    }
}

async function moveFile(filePath) {
  try {
    const fileName = path.basename(filePath);
    const uploadFolderPath = path.join(__dirname, '../files-uploaded'); //

    // Crea la carpeta si no existe
    await fs.mkdir(uploadFolderPath, { recursive: true });

    const newFilePath = path.join(uploadFolderPath, fileName);
    await fs.rename(filePath, newFilePath); // Mueve el archivo

  } catch (error) {
    console.error('Error al mover el archivo:', error);
  }
}
  
// La ruta de la carpeta se puede pasar como argumento.
const folderPath = process.argv[2] || './files';
uploadFilesFromFolder(folderPath, fileTypes.gif);

// const filePath = process.argv[2];
// if (!filePath) {
//   console.error('No se escribio ningun argumento. \nUso: node index.js <ruta-archivo>');
//   process.exit(1);
// }

// uploadFile(filePath);
