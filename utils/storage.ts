import storage from '@react-native-firebase/storage';

export async function uploadEquipmentImage(uri: string, userId: string): Promise<string> {
  try {
    const filename = `equipment/${userId}/gamma_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
    
    // Create the reference
    const ref = storage().ref(filename);

    // Let the native OS handle the upload stream completely
    await ref.putFile(uri);

    // Grab the URL
    return await ref.getDownloadURL();
  } catch (error) {
    console.error("🔥 NATIVE UPLOAD ERROR:", error);
    throw new Error("Failed to upload equipment image.");
  }
}