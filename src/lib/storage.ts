import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

export async function uploadMemoryPhoto(file: File, memoryId: string): Promise<string> {
  const storageRef = ref(storage, `memories/${memoryId}/${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}