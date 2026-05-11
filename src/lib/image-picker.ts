import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { supabase } from "./supabase";

/**
 * Picks an image from the gallery and uploads it to a Supabase bucket.
 *
 * @param bucket The Supabase storage bucket name
 * @param folderPath The folder/sub-path within the bucket (e.g., user ID)
 * @returns The public URL of the uploaded image (for avatars) or the file path (for private docs)
 */
export async function pickAndUploadImage(
	bucket:
		| "avatars"
		| "kyc-documents"
		| "chat-attachments"
		| "destination-images",
	folderPath: string,
) {
	try {
		// 1. Request permissions (usually handled by the picker, but good to ensure)
		const { status } =
			await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== "granted") {
			Alert.alert(
				"Permission Denied",
				"We need access to your photos to upload documents.",
			);
			return null;
		}

		// 2. Launch Image Picker
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsEditing: true,
			quality: 0.7,
			base64: true, // Use base64 for reliable binary conversion in React Native
		});

		if (result.canceled || !result.assets || result.assets.length === 0) {
			return null;
		}

		const asset = result.assets[0];
		const base64 = asset.base64;

		if (!base64) {
			throw new Error("Failed to read image data");
		}

		// 3. Generate unique file path
		const contentType = asset.mimeType || "image/jpeg";
		const extension = contentType.split("/")[1]?.toLowerCase() || "jpg";
		const fileName = `${Date.now()}.${extension}`;
		const filePath = `${folderPath}/${fileName}`;

		// 4. Upload to Supabase Storage
		// We decode the base64 string to an ArrayBuffer using base64-arraybuffer
		const { data, error } = await supabase.storage
			.from(bucket)
			.upload(filePath, decode(base64), {
				contentType,
				upsert: true,
			});

		if (error) {
			console.error("Supabase Storage Error:", error);
			throw error;
		}

		console.log(filePath);

		// 5. Return either public URL or the internal path
		if (bucket === "avatars" || bucket === "destination-images") {
			const {
				data: { publicUrl },
			} = supabase.storage.from(bucket).getPublicUrl(filePath);
			return publicUrl;
		} else {
			// For private buckets like kyc-documents, we return the path
			// Profiles or KYC records will store this path for later verification
			return filePath;
		}
	} catch (error: any) {
		console.error("Image Upload Flow Error:", error);
		Alert.alert(
			"Upload Failed",
			error.message || "An unknown error occurred during upload.",
		);
		return null;
	}
}
