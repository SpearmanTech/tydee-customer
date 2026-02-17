import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/firebase/firebase";

export async function uploadProfileImage(
  uri: string,
  uid: string
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();

  const imageRef = ref(storage, `profileImages/${uid}.jpg`);

  await uploadBytes(imageRef, blob);

  return await getDownloadURL(imageRef);
}
