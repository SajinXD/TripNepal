import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";
import { supabase } from "./supabase";


export async function pickAndUploadImage(
	bucket:
		| "avatars"
		| "kyc-documents"
		| "chat-attachments"
		| "destination-images",
	folderPath: string,
) {
	try {
		
		const { status } =
			await ImagePicker.requestMediaLibraryPermissionsAsync();
		if (status !== "granted") {
			Alert.alert(
				"Permission Denied",
				"We need access to your photos to upload documents.",
			);
			return null;
		}

		
		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ["images"],
			allowsEditing: true,
			quality: 0.7,
			base64: true, 
		});

		if (result.canceled || !result.assets || result.assets.length === 0) {
			return null;
		}

		const asset = result.assets[0];
		const base64 = asset.base64;

		if (!base64) {
			throw new Error("Failed to read image data");
		}

		
		const contentType = asset.mimeType || "image/jpeg";
		const extension = contentType.split("/")[1]?.toLowerCase() || "jpg";
		const fileName = `${Date.now()}.${extension}`;
		const filePath = `${folderPath}/${fileName}`;

		
		
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

		
		if (bucket === "avatars" || bucket === "destination-images") {
			const {
				data: { publicUrl },
			} = supabase.storage.from(bucket).getPublicUrl(filePath);
			return publicUrl;
		} else {
			
			
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
