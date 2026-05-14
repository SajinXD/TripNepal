import { SafeScreen } from "@/components/layout/SafeScreen";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { pickAndUploadImage } from "@/lib/image-picker";
import { supabase } from "@/lib/supabase";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import {
  Briefcase,
  ChevronLeft,
  FileCheck,
  Shield,
  Upload,
  User,
} from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const STEPS = [
	{ id: 1, label: "Personal", icon: User },
	{ id: 2, label: "Documents", icon: Shield },
	{ id: 3, label: "Services", icon: Briefcase },
];

export default function KYCWizard() {
	const router = useRouter();
	const { user } = useAuth();
	const [step, setStep] = useState(1);
	const [loading, setLoading] = useState(false);

	// Step 1 — Personal details
	const [fullNameLegal, setFullNameLegal] = useState("");
	const [citizenshipNumber, setCitizenshipNumber] = useState("");
	const [phone, setPhone] = useState("");
	const [dateOfBirth, setDateOfBirth] = useState("");
	const [showDOBPicker, setShowDOBPicker] = useState(false);
	const [permanentAddress, setPermanentAddress] = useState("");

	// Step 2 — Documents (citizenship only; NTB license is in Guide Settings)
	const [citizenshipPath, setCitizenshipPath] = useState<string | null>(null);
	const [uploadingDoc, setUploadingDoc] = useState(false);

	async function handleCitizenshipUpload() {
		if (!user) return;
		setUploadingDoc(true);
		const path = await pickAndUploadImage("kyc-documents", user.id);
		if (path) {
			setCitizenshipPath(path);
			Alert.alert("Success", "Document uploaded successfully!");
		}
		setUploadingDoc(false);
	}

	// Step 3 — Service setup
	const [areaPrices, setAreaPrices] = useState<Record<string, string>>({});
	const [languages, setLanguages] = useState("English, Nepali");
	const [bio, setBio] = useState("");
	const [selectedSpecializations, setSelectedSpecializations] = useState<
		string[]
	>([]);
	const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

	const SPECIALIZATIONS = [
		{ key: "trekking", label: "🥾 Trekking" },
		{ key: "cultural", label: "🏛️ Cultural" },
		{ key: "adventure", label: "🪂 Adventure" },
		{ key: "wildlife", label: "🐘 Wildlife" },
		{ key: "spiritual", label: "🙏 Spiritual" },
		{ key: "photography", label: "📷 Photography" },
		{ key: "sightseeing", label: "🗺️ Sightseeing" },
		{ key: "food", label: "🍜 Food Tour" },
		{ key: "local", label: "📍 Local Guide" },
		{ key: "other", label: "✨ Other" },
	];

	const SERVICE_AREAS = [
		// Core cities & valleys
		"Kathmandu",
		"Pokhara",
		"Chitwan",
		"Bhaktapur",
		"Patan (Lalitpur)",
		"Nagarkot",
		"Dhulikhel",
		"Bandipur",
		// Trekking regions
		"Solukhumbu (Everest)",
		"Kaski (Annapurna)",
		"Mustang",
		"Langtang",
		"Manaslu",
		"Kanchenjunga",
		"Dolpo",
		"Poon Hill (Ghorepani)",
		"Jomsom",
		"Rolwaling",
		"Rara Lake",
		// Wildlife & plains
		"Bardiya",
		"Ilam",
		"Lumbini",
		// Other towns
		"Gorkha",
		"Tansen (Palpa)",
		"Dharan",
		"Biratnagar",
		"Butwal",
		"Nepalgunj",
		"Dhangadhi",
	];

	function toggleSpecialization(key: string) {
		setSelectedSpecializations((prev) =>
			prev.includes(key) ? prev.filter((s) => s !== key) : [...prev, key],
		);
	}

	function toggleArea(area: string) {
		setSelectedAreas((prev) => {
			const next = prev.includes(area)
				? prev.filter((a) => a !== area)
				: [...prev, area];
			setAreaPrices((prices) => {
				const updated = { ...prices };
				if (!prev.includes(area)) {
					updated[area] = "";
				} else {
					delete updated[area];
				}
				return updated;
			});
			return next;
		});
	}

	function validateStep(): boolean {
		if (step === 1) {
			if (
				!fullNameLegal.trim() ||
				!citizenshipNumber.trim() ||
				!dateOfBirth.trim() ||
				!permanentAddress.trim()
			) {
				Alert.alert(
					"Required Fields",
					"Please fill in all required fields.",
				);
				return false;
			}
			if (
				phone.trim() &&
				!/^(\+977)?[0-9]{9,10}$/.test(phone.replace(/\s/g, ""))
			) {
				Alert.alert(
					"Invalid Phone",
					"Please enter a valid Nepal phone number.",
				);
				return false;
			}
		}
		if (step === 2) {
			if (!citizenshipPath) {
				Alert.alert(
					"Upload Required",
					"Please upload your citizenship document.",
				);
				return false;
			}
		}
		if (step === 3) {
			if (selectedSpecializations.length === 0) {
				Alert.alert(
					"Select Specializations",
					"Please select at least one service type.",
				);
				return false;
			}
			if (selectedAreas.length === 0) {
				Alert.alert(
					"Select Service Areas",
					"Please select at least one area you serve.",
				);
				return false;
			}
			const hasValidPrice = selectedAreas.every((a) => {
				const v = Number(areaPrices[a]);
				return !isNaN(v) && v > 0;
			});
			if (!hasValidPrice) {
				Alert.alert(
					"Missing Prices",
					"Please enter a daily rate for every selected area.",
				);
				return false;
			}
		}
		return true;
	}

	async function submitKYC() {
		if (!user) return;
		setLoading(true);

		try {
			const areaNumbers: Record<string, number> = {};
			selectedAreas.forEach((a) => {
				areaNumbers[a] = parseFloat(areaPrices[a]) || 0;
			});
			const avgPrice =
				Object.values(areaNumbers).reduce((s, v) => s + v, 0) /
				(selectedAreas.length || 1);

			const guideProfile = {
				price_per_day: Math.round(avgPrice),
				area_prices: areaNumbers,
				languages_spoken: languages
					.split(",")
					.map((l) => l.trim().toLowerCase())
					.filter(Boolean),
				bio_long: bio.trim() || null,
				specializations: selectedSpecializations.length
					? selectedSpecializations
					: [],
				service_areas: selectedAreas.length ? selectedAreas : [],
			};

			const { error: updateError } = await (
				supabase.from("guide_profiles") as any
			)
				.update(guideProfile)
				.eq("id", user.id);

			if (updateError) {
				console.error("Guide profile update error:", updateError);
				throw updateError;
			}

			await (supabase.from("kyc_verifications") as any)
				.update({
					status: "pending",
					full_name_legal: fullNameLegal.trim(),
					date_of_birth: dateOfBirth,
					permanent_address: permanentAddress.trim(),
					citizenship_number: citizenshipNumber.trim() || null,
					submitted_at: new Date().toISOString(),
				})
				.eq("user_id", user.id);

			if (phone.trim()) {
				await (supabase.from("profiles") as any)
					.update({ phone: phone.trim() })
					.eq("id", user.id);
			}

			router.replace("/kyc/pending");
		} catch (e: any) {
			console.error("KYC submission error:", e);
			Alert.alert(
				"Submission Failed",
				e?.message || "Something went wrong. Please try again.",
			);
		} finally {
			setLoading(false);
		}
	}

	function handleNext() {
		if (!validateStep()) return;
		if (step < 3) {
			setStep(step + 1);
		} else {
			submitKYC();
		}
	}

	return (
		<SafeScreen edges={["top", "bottom"]} bg="#F7F7F4">
			{/* Header */}
			<View className="px-6 py-4 flex-row items-center justify-between bg-white border-b border-border">
				<TouchableOpacity
					onPress={() =>
						step > 1 ? setStep(step - 1) : router.back()
					}
					className="p-1"
				>
					<ChevronLeft size={24} color="#0A0A0A" />
				</TouchableOpacity>
				<Text className="font-display text-lg text-text">
					Guide Verification
				</Text>
				<Text className="font-semibold text-text-secondary text-sm">
					{step}/3
				</Text>
			</View>

			{/* Step indicator */}
			<View className="flex-row px-6 py-4 bg-white border-b border-border">
				{STEPS.map((s, i) => {
					const Icon = s.icon;
					const isActive = step === s.id;
					const isDone = step > s.id;
					return (
						<View key={s.id} className="flex-1 items-center">
							<View
								className={`w-10 h-10 rounded-full items-center justify-center mb-1 ${isDone ? "bg-primary" : isActive ? "bg-primary/10 border-2 border-primary" : "bg-border"}`}
							>
								{isDone ? (
									<FileCheck size={18} color="#fff" />
								) : (
									<Icon
										size={18}
										color={isActive ? "#8B1A1A" : "#9CA3AF"}
									/>
								)}
							</View>
							<Text
								className={`text-xs font-semibold ${isActive ? "text-primary" : isDone ? "text-text" : "text-text-muted"}`}
							>
								{s.label}
							</Text>
							{i < STEPS.length - 1 && (
								<View
									className={`absolute right-0 top-5 w-full h-[2px] ${isDone ? "bg-primary" : "bg-border"}`}
									style={{ left: "50%" }}
								/>
							)}
						</View>
					);
				})}
			</View>

			<KeyboardAvoidingView
				behavior={Platform.OS === "ios" ? "padding" : "height"}
				style={{ flex: 1 }}
			>
				<ScrollView
					className="flex-1 px-6 pt-6"
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
				>
					{/* ── STEP 1: Personal Details ── */}
					{step === 1 && (
						<View>
							<Text className="font-display text-2xl text-text mb-1">
								Personal Details
							</Text>
							<Text className="text-text-secondary text-sm mb-6">
								Enter your details exactly as they appear on
								your Citizenship card.
							</Text>

							<Text className="font-semibold text-sm text-text mb-2">
								Full Legal Name *
							</Text>
							<TextInput
								value={fullNameLegal}
								onChangeText={setFullNameLegal}
								className="bg-white border border-border rounded-xl px-4 py-3 mb-4 text-text"
								placeholder="As on citizenship card"
								placeholderTextColor="#9CA3AF"
							/>

							<Text className="font-semibold text-sm text-text mb-2">
								Citizenship Number *
							</Text>
							<TextInput
								value={citizenshipNumber}
								onChangeText={setCitizenshipNumber}
								className="bg-white border border-border rounded-xl px-4 py-3 mb-4 text-text"
								placeholder="e.g. 12-34-56-78901"
								placeholderTextColor="#9CA3AF"
							/>

							<Text className="font-semibold text-sm text-text mb-2">
								Phone Number
							</Text>
							<TextInput
								value={phone}
								onChangeText={setPhone}
								className="bg-white border border-border rounded-xl px-4 py-3 mb-4 text-text"
								placeholder="e.g. 9801234567"
								placeholderTextColor="#9CA3AF"
								keyboardType="phone-pad"
							/>

							<Text className="font-semibold text-sm text-text mb-2">
								Date of Birth *
							</Text>
							<Pressable
								onPress={() => setShowDOBPicker(true)}
								className="bg-white border border-border rounded-xl px-4 py-3 mb-4"
							>
								<Text
									className={
										dateOfBirth
											? "text-text"
											: "text-[#9CA3AF]"
									}
								>
									{dateOfBirth || "Select date of birth"}
								</Text>
							</Pressable>
							{showDOBPicker && (
								<DateTimePicker
									value={
										dateOfBirth
											? new Date(dateOfBirth)
											: new Date("1990-01-01")
									}
									mode="date"
									display="spinner"
									maximumDate={new Date()}
									onChange={(_event, date) => {
										setShowDOBPicker(false);
										if (date)
											setDateOfBirth(
												date
													.toISOString()
													.split("T")[0],
											);
									}}
								/>
							)}

							<Text className="font-semibold text-sm text-text mb-2">
								Permanent Address *
							</Text>
							<TextInput
								value={permanentAddress}
								onChangeText={setPermanentAddress}
								className="bg-white border border-border rounded-xl px-4 py-3 mb-8 text-text"
								placeholder="e.g. Lakeside-6, Pokhara, Kaski"
								placeholderTextColor="#9CA3AF"
								multiline
							/>
						</View>
					)}

					{/* ── STEP 2: Upload Documents ── */}
					{step === 2 && (
						<View>
							<Text className="font-display text-2xl text-text mb-1">
								Upload Documents
							</Text>
							<Text className="text-text-secondary text-sm mb-6">
								Upload your Citizenship card (front &amp; back)
								for identity verification.
							</Text>
							<TouchableOpacity
								onPress={handleCitizenshipUpload}
								disabled={uploadingDoc}
								className={`border-2 border-dashed rounded-2xl p-6 items-center mb-4 ${citizenshipPath ? "bg-primary/5 border-primary" : "bg-white border-primary/30"}`}
							>
								{uploadingDoc ? (
									<ActivityIndicator
										color="#8B1A1A"
										size="large"
									/>
								) : citizenshipPath ? (
									<FileCheck size={32} color="#8B1A1A" />
								) : (
									<Upload size={32} color="#8B1A1A" />
								)}
								<Text
									className={`font-semibold mt-2 ${citizenshipPath ? "text-primary" : "text-primary/70"}`}
								>
									{citizenshipPath
										? "Citizenship Uploaded ✓"
										: "Upload Citizenship (Front/Back)"}
								</Text>
								{!citizenshipPath && (
									<Text className="text-text-muted text-xs mt-1">
										JPG, PNG or PDF · Max 5MB
									</Text>
								)}
							</TouchableOpacity>

							<View className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 flex-row">
								<Text className="text-amber-700 text-sm flex-1">
									📋 Documents are encrypted and stored
									securely. They are only used for identity
									verification and will not be shared
									publicly.
								</Text>
							</View>

							<View className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-8 flex-row">
								<Text className="text-blue-700 text-sm flex-1">
									🪪 NTB License can be added separately in
									Guide Settings after verification.
								</Text>
							</View>
						</View>
					)}

					{/* ── STEP 3: Service Setup ── */}
					{step === 3 && (
						<View>
							<Text className="font-display text-2xl text-text mb-1">
								Service Setup
							</Text>
							<Text className="text-text-secondary text-sm mb-6">
								Help tourists discover and book you by setting
								up your guide profile.
							</Text>

							{/* Specializations */}
							<Text className="font-semibold text-sm text-text mb-3">
								Your Specializations *{" "}
								<Text className="text-text-muted font-normal">
									(select all that apply)
								</Text>
							</Text>
							<View className="flex-row flex-wrap gap-2 mb-5">
								{SPECIALIZATIONS.map((s) => {
									const active =
										selectedSpecializations.includes(s.key);
									return (
										<TouchableOpacity
											key={s.key}
											onPress={() =>
												toggleSpecialization(s.key)
											}
											className={`px-3 py-2 rounded-xl border ${active ? "bg-primary border-primary" : "bg-white border-border"}`}
										>
											<Text
												className={`text-sm font-semibold ${active ? "text-white" : "text-text"}`}
											>
												{s.label}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>

							{/* Service Areas */}
							<Text className="font-semibold text-sm text-text mb-3">
								Areas You Serve *{" "}
								<Text className="text-text-muted font-normal">
									(select all districts)
								</Text>
							</Text>
							<View className="flex-row flex-wrap gap-2 mb-5">
								{SERVICE_AREAS.map((area) => {
									const active = selectedAreas.includes(area);
									return (
										<TouchableOpacity
											key={area}
											onPress={() => toggleArea(area)}
											className={`px-3 py-2 rounded-full border ${active ? "bg-primary/10 border-primary" : "bg-white border-border"}`}
										>
											<Text
												className={`text-sm font-medium ${active ? "text-primary" : "text-text"}`}
											>
												{area}
											</Text>
										</TouchableOpacity>
									);
								})}
							</View>

							{/* Per-area price inputs */}
							{selectedAreas.length > 0 && (
								<View className="mb-5">
									<Text className="font-semibold text-sm text-text mb-3">
										Set Your Daily Rate Per Area (NPR) *
									</Text>
									{selectedAreas.map((area) => (
										<View
											key={area}
											className="flex-row items-center bg-white border border-border rounded-xl px-4 mb-2"
										>
											<Text className="flex-1 text-sm text-text py-3">
												{area}
											</Text>
											<TextInput
												value={areaPrices[area] ?? ""}
												onChangeText={(val) =>
													setAreaPrices((prev) => ({
														...prev,
														[area]: val,
													}))
												}
												placeholder="e.g. 3500"
												placeholderTextColor="#9CA3AF"
												keyboardType="numeric"
												style={{
													width: 96,
													textAlign: "right",
													paddingVertical: 12,
													color: "#0A0A0A",
													fontSize: 14,
												}}
											/>
											<Text className="text-text-muted text-xs ml-1">
												/day
											</Text>
										</View>
									))}
								</View>
							)}

							<Text className="font-semibold text-sm text-text mb-2">
								Languages Spoken *
							</Text>
							<TextInput
								value={languages}
								onChangeText={setLanguages}
								className="bg-white border border-border rounded-xl px-4 py-3 mb-4 text-text"
								placeholder="English, Nepali, Hindi"
								placeholderTextColor="#9CA3AF"
							/>

							<Text className="font-semibold text-sm text-text mb-2">
								Guide Bio (Optional)
							</Text>
							<TextInput
								value={bio}
								onChangeText={setBio}
								className="bg-white border border-border rounded-xl px-4 py-3 mb-8 text-text"
								placeholder="Share your trekking experience, specializations, and why tourists should choose you..."
								placeholderTextColor="#9CA3AF"
								multiline
								numberOfLines={4}
								textAlignVertical="top"
								style={{ minHeight: 100 }}
							/>
						</View>
					)}
				</ScrollView>
			</KeyboardAvoidingView>

			<View className="p-6 bg-white border-t border-border">
				<Button
					onPress={handleNext}
					loading={loading}
					fullWidth
					size="lg"
				>
					{step < 3 ? "Continue" : "Submit for Verification"}
				</Button>
			</View>
		</SafeScreen>
	);
}
