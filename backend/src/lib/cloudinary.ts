import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadAudioToCloudinary(
  audioBase64: string,
  meetingId: string
): Promise<string> {
  const buffer = Buffer.from(audioBase64, 'base64');

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: 'video', // Cloudinary classifies audio as video resource_type for streaming
        folder: 'meeting-recordings',
        public_id: meetingId,
        format: 'webm',
        overwrite: true,
      },
      (error, result) => {
        if (error || !result) {
          return reject(error || new Error('Upload to Cloudinary failed with no result'));
        }
        resolve(result.secure_url);
      }
    );

    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}

export function generateUploadSignature(folder: string = 'meeting-recordings', publicId?: string) {
  const timestamp = Math.round(new Date().getTime() / 1000);
  const apiSecret = process.env.CLOUDINARY_API_SECRET || '';
  const apiKey = process.env.CLOUDINARY_API_KEY || '';
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';

  const paramsToSign: Record<string, string | number> = {
    folder,
    timestamp,
  };
  if (publicId) {
    paramsToSign.public_id = publicId;
  }

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret);

  return {
    signature,
    timestamp,
    apiKey,
    cloudName,
    folder,
    publicId,
  };
}

export default cloudinary;
