import { storage } from "@/firebase/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export async function uploadEquipmentImage(uri: string, userId: string): Promise<string> {
  try {
    const filename = `equipment/${userId}/gamma_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    
    // 1. Create the reference using your initialized Firebase storage
    const imageRef = ref(storage, filename);

    // 2. Convert the local file URI to a blob (This works on BOTH Web and Native Expo!)
    const response = await fetch(uri);
    const blob = await response.blob();

    // 3. Upload the blob to Firebase
    await uploadBytes(imageRef, blob, {
      contentType: "image/jpeg",
    });

    // 4. Return the public download URL
    return await getDownloadURL(imageRef);
  } catch (error) {
    console.error("🔥 UPLOAD ERROR:", error);
    throw new Error("Failed to upload equipment image.");
  }
}