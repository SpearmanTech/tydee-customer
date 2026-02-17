import { storage } from "@/firebase/firebase";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

/**
 * Uploads a user's profile image to Firebase Storage
 * and returns a public download URL.
 *
 * @param uri - Local image URI from ImagePicker
 * @param uid - Firebase Auth user UID
 */
export async function uploadProfileImage(
  uri: string,
  uid: string
): Promise<string> {
  try {
    if (!uri) {
      throw new Error("No image URI provided");
    }

    // Convert local file URI to blob (Expo-compatible)
    const response = await fetch(uri);
    const blob = await response.blob();

    // Use deterministic path (overwrites old image if re-uploaded)
    const imageRef = ref(storage, `profileImages/${uid}/avatar.jpg`);

    // Upload image
    await uploadBytes(imageRef, blob, {
      contentType: "image/jpeg",
    });

    // Retrieve public download URL
    const downloadURL = await getDownloadURL(imageRef);

    return downloadURL;
  } catch (error) {
    console.error("uploadProfileImage error:", error);
    throw error;
  }
}
