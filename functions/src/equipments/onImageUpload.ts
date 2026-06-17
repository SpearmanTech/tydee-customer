import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as admin from "firebase-admin";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
import sharp from "sharp";

export const generateThumbnail = onObjectFinalized(
  {
    cpu: 1,
    memory: "512MiB",
    region: "us-central1", // 🇿🇦 Kept local for Foona
  },
  async (event) => {
    const filePath = event.data.name; // e.g. "equipment/UID/gamma_123.jpg"
    const bucketName = event.data.bucket;
    const contentType = event.data.contentType;

    // 1. Get the directory and filename safely
    const dirName = path.dirname(filePath); // "equipment/UID"
    const fileName = path.basename(filePath); // "gamma_123.jpg"

    // 🚨 2. INFINITE LOOP PREVENTION
    // Exit if it's not an image OR if it's already inside a 'thumbnails' folder
    if (!contentType?.startsWith("image/") || dirName.includes("thumbnails")) {
      return;
    }

    const bucket = admin.storage().bucket(bucketName);
    const tempFilePath = path.join(os.tmpdir(), fileName);

    // 3. Define exact thumbnail path: "equipment/UID/thumbnails/gamma_123.jpg"
    // Using posix ensures forward slashes (/) are used, which Cloud Storage requires
    const thumbPath = path.posix.join(dirName, "thumbnails", fileName);
    const tempThumbPath = path.join(os.tmpdir(), `thumb_${fileName}`);

    try {
      // 4. Download original
      await bucket.file(filePath).download({ destination: tempFilePath });

      // 5. Resize using Sharp
      await sharp(tempFilePath)
        .resize(200, 200, { fit: "cover" })
        .toFile(tempThumbPath);

      // 6. Upload thumbnail back to Storage
      await bucket.upload(tempThumbPath, {
        destination: thumbPath,
        metadata: {
          contentType: contentType,
          cacheControl: "public,max-age=31536000",
        },
      });
    } catch (error) {
      console.error("Thumbnail generation failed:", error);
    } finally {
      // 7. Cleanup temp files (ALWAYS run this to prevent memory leaks)
      if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
      if (fs.existsSync(tempThumbPath)) fs.unlinkSync(tempThumbPath);
    }
  },
);
