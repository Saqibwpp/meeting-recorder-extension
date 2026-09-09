import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export async function uploadAudioToCloudinary(
  audioBase64: string,
  mimeType: string,
  meetingId: string
): Promise<string> {
  const dataUri = `data:${mimeType || 'audio/webm'};base64,${audioBase64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    resource_type: 'video', // Cloudinary classifies audio as video resource_type for streaming
    folder: 'meeting-recordings',
    public_id: meetingId,
    overwrite: true,
  });

  return result.secure_url;
}

export default cloudinary;
