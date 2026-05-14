import { useRouter } from "expo-router";
import {
	ChevronDown,
	ChevronRight,
	ChevronUp,
	DollarSign,
	FileCheck,
	FileText,
	HelpCircle,
	LogOut,
	Pencil,
	Shield,
	Upload,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	ScrollView,
	Switch,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ScreenHeader } from "../../src/components/layout/ScreenHeader";
import { Avatar } from "../../src/components/ui/Avatar";
import { Badge } from "../../src/components/ui/Badge";
import { IconTile } from "../../src/components/ui/IconTile";
import { useAuth } from "../../src/hooks/useAuth";
import { pickAndUploadImage } from "../../src/lib/image-picker";
import { supabase } from "../../src/lib/supabase";
import { useAuthStore } from "../../src/stores/authStore";

export default function GuideSettingsScreen() {
	const insets = useSafeAreaInsets();
	const router = useRouter();
	const { user, profile } = useAuth();
	const { updateProfile } = useAuthStore();
	const [uploadingAvatar, setUploadingAvatar] = useState(false);
	const [guideProfile, setGuideProfile] = useState<any>(null);
	const [kycStatus, setKycStatus] = useState<string>("not_submitted");
	const [loading, setLoading] = useState(true);

	// Negotiable toggle
	const [priceNegotiable, setPriceNegotiable] = useState(false);
	const [savingNegotiable, setSavingNegotiable] = useState(false);

	// NTB License section
	const [ntbLicenseNumber, setNtbLicenseNumber] = useState("");
	const [ntbLicenseUrl, setNtbLicenseUrl] = useState<string | null>(null);
	const [ntbLicenseStatus, setNtbLicenseStatus] =
		useState<string>("not_submitted");
	const [ntbExpanded, setNtbExpanded] = useState(false);
	const [uploadingNtb, setUploadingNtb] = useState(false);
	const [savingNtb, setSavingNtb] = useState(false);

	useEffect(() => {
		if (!user?.id) return;
		Promise.all([
			(supabase.from("guide_profiles") as any)
				.select(
					"price_per_day, average_rating, total_reviews, total_trips_completed, is_verified, specializations, service_areas, price_negotiable, guide_license_number, ntb_license_url, ntb_license_status",
				)
				.eq("user_id", user.id)
				.single(),
			supabase
				.from("kyc_verifications")
				.select("status")
				.eq("user_id", user.id)
				.single(),
		]).then(([gp, kyc]: [any, any]) => {
			const gpData = gp.data;
			if (gpData) {
				setGuideProfile(gpData);
				setPriceNegotiable(gpData.price_negotiable ?? false);
				setNtbLicenseNumber(gpData.guide_license_number ?? "");
				setNtbLicenseUrl(gpData.ntb_license_url ?? null);
				const status = gpData.ntb_license_status ?? "not_submitted";
				setNtbLicenseStatus(status);
				// Auto-expand form only when not yet submitted
				setNtbExpanded(status === "not_submitted");
			}
			if (gpData?.is_verified) {
				setKycStatus("approved");
			} else if (
				kyc.data?.status &&
				kyc.data.status !== "not_submitted"
			) {
				setKycStatus(kyc.data.status);
			} else if (gpData?.price_per_day) {
				setKycStatus("pending");
			}
			setLoading(false);
		});
	}, [user?.id]);

	const handleLogout = async () => {
		Alert.alert("Log Out", "Are you sure you want to log out?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Log Out",
				style: "destructive",
				onPress: async () => {
					await supabase.auth.signOut();
					useAuthStore.getState().setAuth(null, null);
				},
			},
		]);
	};

	const handleAvatarUpload = async () => {
		if (!user) return;
		setUploadingAvatar(true);
		try {
			const url = await pickAndUploadImage("avatars", user.id);
			if (url) {
				const { error } = await supabase
					.from("profiles")
					.update({ avatar_url: url })
					.eq("id", user.id);
				if (error) throw error;
				updateProfile({ avatar_url: url } as Parameters<
					typeof updateProfile
				>[0]);
				Alert.alert("Success", "Profile picture updated successfully!");
			}
		} catch (error: any) {
			Alert.alert(
				"Upload Failed",
				error.message || "Could not update profile picture.",
			);
		} finally {
			setUploadingAvatar(false);
		}
	};

	const handleNegotiableToggle = async (value: boolean) => {
		if (!user) return;
		setPriceNegotiable(value);
		setSavingNegotiable(true);
		try {
			const { error } = await (supabase.from("guide_profiles") as any)
				.update({ price_negotiable: value })
				.eq("user_id", user.id);
			if (error) throw error;
		} catch (e: any) {
			Alert.alert(
				"Error",
				e.message || "Could not update pricing setting.",
			);
			setPriceNegotiable(!value);
		} finally {
			setSavingNegotiable(false);
		}
	};

	const handleNtbPhotoUpload = async () => {
		if (!user) return;
		setUploadingNtb(true);
		try {
			const url = await pickAndUploadImage("kyc-documents", user.id);
			if (url) setNtbLicenseUrl(url);
		} catch (e: any) {
			Alert.alert(
				"Upload Failed",
				e.message || "Could not upload license photo.",
			);
		} finally {
			setUploadingNtb(false);
		}
	};

	const handleSaveNtb = async () => {
		if (!user) return;
		setSavingNtb(true);
		try {
			if (!ntbLicenseNumber.trim() && !ntbLicenseUrl) {
				Alert.alert(
					"Required",
					"Please enter your license number or upload a photo.",
				);
				return;
			}
			const { error } = await (supabase.from("guide_profiles") as any)
				.update({
					guide_license_number: ntbLicenseNumber.trim() || null,
					ntb_license_url: ntbLicenseUrl,
					ntb_license_status: "pending",
				})
				.eq("user_id", user.id);
			if (error) throw error;
			setNtbLicenseStatus("pending");
			setNtbExpanded(false);
			Alert.alert(
				"Submitted",
				"Your NTB license is under review. This usually takes 1–2 business days.",
			);
		} catch (e: any) {
			Alert.alert("Error", e.message || "Could not save NTB details.");
		} finally {
			setSavingNtb(false);
		}
	};

	const kycBadge = () => {
		if (kycStatus === "approved")
			return { label: "VERIFIED", color: "#22C55E", bg: "#D1FAE5" };
		if (kycStatus === "pending")
			return { label: "PENDING", color: "#F59E0B", bg: "#FEF3C7" };
		if (kycStatus === "rejected")
			return { label: "RESUBMIT", color: "#DC2626", bg: "#FEE2E2" };
		return { label: "NOT VERIFIED", color: "#6B7280", bg: "#F3F4F6" };
	};

	const badge = kycBadge();
	const displayName =
		profile?.full_name || user?.email?.split("@")[0] || "Guide";
	const avatarSrc = profile?.avatar_url || undefined;

	return (
		<View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
			<View style={{ paddingTop: insets.top }}>
				<ScreenHeader />
			</View>

			<ScrollView
				style={{ flex: 1, paddingHorizontal: 20, paddingTop: 20 }}
				showsVerticalScrollIndicator={false}
			>
				{/* Profile Card */}
				<View
					style={{
						backgroundColor: "#fff",
						borderRadius: 16,
						padding: 20,
						marginBottom: 24,
						shadowColor: "#000",
						shadowOpacity: 0.05,
						shadowRadius: 8,
						elevation: 2,
					}}
				>
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							marginBottom: 16,
						}}
					>
						<View style={{ position: "relative", marginRight: 16 }}>
							<Avatar size={64} src={avatarSrc} borderMint />
							<Pressable
								onPress={handleAvatarUpload}
								disabled={uploadingAvatar}
								style={{
									position: "absolute",
									bottom: 0,
									right: 0,
									width: 24,
									height: 24,
									backgroundColor: "white",
									borderRadius: 12,
									alignItems: "center",
									justifyContent: "center",
									borderWidth: 1,
									borderColor: "#E5E7EB",
								}}
							>
								{uploadingAvatar ? (
									<ActivityIndicator
										size="small"
										color="#8B1A1A"
									/>
								) : (
									<Pencil size={12} color="#414844" />
								)}
							</Pressable>
						</View>
						<View style={{ flex: 1 }}>
							<Text
								style={{
									fontWeight: "700",
									fontSize: 20,
									color: "#1A1C1E",
								}}
							>
								{displayName}
							</Text>
							<Text
								style={{
									fontSize: 13,
									color: "#717973",
									marginBottom: 6,
								}}
							>
								{user?.email}
							</Text>
							<View
								style={{
									flexDirection: "row",
									alignItems: "center",
									gap: 6,
								}}
							>
								<View
									style={{
										backgroundColor: badge.bg,
										paddingHorizontal: 8,
										paddingVertical: 3,
										borderRadius: 20,
									}}
								>
									<Text
										style={{
											color: badge.color,
											fontSize: 10,
											fontWeight: "700",
										}}
									>
										{badge.label}
									</Text>
								</View>
								<Badge label="GUIDE" variant="mint" />
							</View>
						</View>
					</View>

					{/* Stats */}
					{loading ? (
						<ActivityIndicator color="#8B1A1A" />
					) : (
						<View
							style={{
								flexDirection: "row",
								paddingTop: 14,
								borderTopWidth: 1,
								borderTopColor: "#E5E7EB",
							}}
						>
							<View
								style={{
									flex: 1,
									alignItems: "center",
									borderRightWidth: 1,
									borderRightColor: "#E5E7EB",
								}}
							>
								<Text
									style={{
										fontSize: 10,
										color: "#717973",
										fontWeight: "700",
										letterSpacing: 1,
										marginBottom: 4,
									}}
								>
									RATING
								</Text>
								<Text
									style={{
										fontSize: 20,
										fontWeight: "700",
										color: "#1A1C1E",
									}}
								>
									{guideProfile?.average_rating
										? Number(
												guideProfile.average_rating,
											).toFixed(1)
										: "—"}
								</Text>
							</View>
							<View
								style={{
									flex: 1,
									alignItems: "center",
									borderRightWidth: 1,
									borderRightColor: "#E5E7EB",
								}}
							>
								<Text
									style={{
										fontSize: 10,
										color: "#717973",
										fontWeight: "700",
										letterSpacing: 1,
										marginBottom: 4,
									}}
								>
									TRIPS
								</Text>
								<Text
									style={{
										fontSize: 20,
										fontWeight: "700",
										color: "#1A1C1E",
									}}
								>
									{guideProfile?.total_trips_completed ?? 0}
								</Text>
							</View>
							<View style={{ flex: 1, alignItems: "center" }}>
								<Text
									style={{
										fontSize: 10,
										color: "#717973",
										fontWeight: "700",
										letterSpacing: 1,
										marginBottom: 4,
									}}
								>
									RATE/DAY
								</Text>
								<Text
									style={{
										fontSize: 20,
										fontWeight: "700",
										color: "#8B1A1A",
									}}
								>
									{guideProfile?.price_per_day
										? `रू${(guideProfile.price_per_day / 1000).toFixed(1)}k`
										: "—"}
								</Text>
							</View>
						</View>
					)}
				</View>

				{/* KYC Status Banner */}
				{kycStatus !== "approved" &&
					(kycStatus === "pending" ? (
						// Non-clickable when under review
						<View
							style={{
								backgroundColor: "#FEF3C7",
								borderRadius: 12,
								padding: 14,
								marginBottom: 24,
								flexDirection: "row",
								alignItems: "center",
							}}
						>
							<Shield size={20} color="#D97706" />
							<View style={{ flex: 1, marginLeft: 12 }}>
								<Text
									style={{
										fontWeight: "700",
										color: "#D97706",
										fontSize: 14,
									}}
								>
									Verification Under Review
								</Text>
								<Text
									style={{
										fontSize: 12,
										color: "#6B7280",
										marginTop: 2,
									}}
								>
									Usually takes 24–48 hours
								</Text>
							</View>
						</View>
					) : (
						// Non-clickable for not_submitted / rejected
						<View
							style={{
								backgroundColor: "#FEE2E2",
								borderRadius: 12,
								padding: 14,
								marginBottom: 24,
								flexDirection: "row",
								alignItems: "center",
							}}
						>
							<Shield size={20} color="#DC2626" />
							<View style={{ flex: 1, marginLeft: 12 }}>
								<Text
									style={{
										fontWeight: "700",
										color: "#DC2626",
										fontSize: 14,
									}}
								>
									{kycStatus === "rejected"
										? "Verification Rejected — Resubmit"
										: "Complete KYC Verification"}
								</Text>
							</View>
						</View>
					))}

				{/* NTB LICENSE */}
				<Text
					style={{
						fontSize: 11,
						fontWeight: "700",
						color: "#717973",
						letterSpacing: 1.2,
						marginBottom: 10,
					}}
				>
					NTB LICENSE
				</Text>

				{/* Non-clickable status banner */}
				<View
					style={{
						backgroundColor:
							ntbLicenseStatus === "approved"
								? "#D1FAE5"
								: ntbLicenseStatus === "pending"
									? "#FEF3C7"
									: "#F3F4F6",
						borderRadius: 12,
						padding: 14,
						marginBottom: 12,
						flexDirection: "row",
						alignItems: "center",
					}}
				>
					<Shield
						size={20}
						color={
							ntbLicenseStatus === "approved"
								? "#059669"
								: ntbLicenseStatus === "pending"
									? "#D97706"
									: "#6B7280"
						}
					/>
					<View style={{ flex: 1, marginLeft: 12 }}>
						<Text
							style={{
								fontWeight: "700",
								fontSize: 14,
								color:
									ntbLicenseStatus === "approved"
										? "#059669"
										: ntbLicenseStatus === "pending"
											? "#D97706"
											: "#6B7280",
							}}
						>
							{ntbLicenseStatus === "approved"
								? "License Verified ✓"
								: ntbLicenseStatus === "pending"
									? "Pending Verification"
									: "NTB License Not Submitted"}
						</Text>
						<Text
							style={{
								fontSize: 12,
								color: "#6B7280",
								marginTop: 2,
							}}
						>
							{ntbLicenseStatus === "approved"
								? "Your NTB license has been verified."
								: ntbLicenseStatus === "pending"
									? "Usually takes 1–2 business days."
									: "Submit your license to build tourist trust."}
						</Text>
					</View>
				</View>

				{/* Accordion toggle — hidden when approved */}
				{ntbLicenseStatus !== "approved" && (
					<TouchableOpacity
						onPress={() => setNtbExpanded(!ntbExpanded)}
						style={{
							backgroundColor: "#fff",
							borderRadius: 12,
							padding: 14,
							marginBottom: ntbExpanded ? 0 : 24,
							flexDirection: "row",
							alignItems: "center",
							shadowColor: "#000",
							shadowOpacity: 0.04,
							shadowRadius: 4,
							elevation: 1,
							borderBottomLeftRadius: ntbExpanded ? 0 : 12,
							borderBottomRightRadius: ntbExpanded ? 0 : 12,
						}}
						activeOpacity={0.7}
					>
						<FileCheck size={18} color="#8B1A1A" />
						<Text
							style={{
								flex: 1,
								marginLeft: 10,
								fontSize: 15,
								fontWeight: "600",
								color: "#1A1C1E",
							}}
						>
							{ntbLicenseStatus === "pending"
								? "View / Update License"
								: "Add NTB License"}
						</Text>
						{ntbExpanded ? (
							<ChevronUp size={18} color="#9CA3AF" />
						) : (
							<ChevronDown size={18} color="#9CA3AF" />
						)}
					</TouchableOpacity>
				)}

				{/* Collapsible form */}
				{ntbExpanded && ntbLicenseStatus !== "approved" && (
					<View
						style={{
							backgroundColor: "#fff",
							borderTopWidth: 1,
							borderTopColor: "#F3F4F6",
							borderBottomLeftRadius: 12,
							borderBottomRightRadius: 12,
							padding: 16,
							marginBottom: 24,
							shadowColor: "#000",
							shadowOpacity: 0.04,
							shadowRadius: 4,
							elevation: 1,
						}}
					>
						<Text
							style={{
								fontSize: 13,
								fontWeight: "600",
								color: "#1A1C1E",
								marginBottom: 6,
							}}
						>
							NTB License Number
						</Text>
						<TextInput
							value={ntbLicenseNumber}
							onChangeText={setNtbLicenseNumber}
							placeholder="e.g. NTB-2024-12345"
							placeholderTextColor="#9CA3AF"
							style={{
								borderWidth: 1,
								borderColor: "#E5E7EB",
								borderRadius: 10,
								paddingHorizontal: 14,
								paddingVertical: 10,
								fontSize: 14,
								color: "#1A1C1E",
								marginBottom: 12,
							}}
						/>

						<Text
							style={{
								fontSize: 13,
								fontWeight: "600",
								color: "#1A1C1E",
								marginBottom: 6,
							}}
						>
							License Photo
						</Text>
						<TouchableOpacity
							onPress={handleNtbPhotoUpload}
							disabled={uploadingNtb}
							style={{
								borderWidth: 2,
								borderStyle: "dashed",
								borderColor: ntbLicenseUrl
									? "#8B1A1A"
									: "#D1D5DB",
								borderRadius: 10,
								padding: 16,
								alignItems: "center",
								backgroundColor: ntbLicenseUrl
									? "#FFF5F5"
									: "#FAFAFA",
								marginBottom: 14,
							}}
						>
							{uploadingNtb ? (
								<ActivityIndicator color="#8B1A1A" />
							) : ntbLicenseUrl ? (
								<FileCheck size={24} color="#8B1A1A" />
							) : (
								<Upload size={24} color="#9CA3AF" />
							)}
							<Text
								style={{
									fontSize: 13,
									color: ntbLicenseUrl
										? "#8B1A1A"
										: "#9CA3AF",
									marginTop: 6,
									fontWeight: "600",
								}}
							>
								{ntbLicenseUrl
									? "License Photo Uploaded ✓"
									: "Upload License Photo"}
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							onPress={handleSaveNtb}
							disabled={savingNtb}
							style={{
								backgroundColor: "#8B1A1A",
								borderRadius: 10,
								paddingVertical: 12,
								alignItems: "center",
								opacity: savingNtb ? 0.6 : 1,
							}}
						>
							{savingNtb ? (
								<ActivityIndicator color="#fff" />
							) : (
								<Text
									style={{
										color: "#fff",
										fontWeight: "700",
										fontSize: 14,
									}}
								>
									Submit for Verification
								</Text>
							)}
						</TouchableOpacity>
					</View>
				)}

				{/* Spacer when approved and form hidden */}
				{ntbLicenseStatus === "approved" && (
					<View style={{ marginBottom: 24 }} />
				)}

				{/* PRICING */}
				<Text
					style={{
						fontSize: 11,
						fontWeight: "700",
						color: "#717973",
						letterSpacing: 1.2,
						marginBottom: 10,
					}}
				>
					PRICING
				</Text>
				<View
					style={{
						backgroundColor: "#fff",
						borderRadius: 16,
						padding: 16,
						marginBottom: 24,
						shadowColor: "#000",
						shadowOpacity: 0.04,
						shadowRadius: 4,
						elevation: 1,
					}}
				>
					<View
						style={{
							flexDirection: "row",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<View style={{ flex: 1, marginRight: 12 }}>
							<Text
								style={{
									fontSize: 15,
									fontWeight: "600",
									color: "#1A1C1E",
								}}
							>
								Price Negotiable
							</Text>
							<Text
								style={{
									fontSize: 12,
									color: "#717973",
									marginTop: 2,
								}}
							>
								{priceNegotiable
									? "Tourists can negotiate your daily rate"
									: "Your rate is fixed — no negotiation"}
							</Text>
						</View>
						{savingNegotiable ? (
							<ActivityIndicator color="#8B1A1A" size="small" />
						) : (
							<Switch
								value={priceNegotiable}
								onValueChange={handleNegotiableToggle}
								trackColor={{
									false: "#E5E7EB",
									true: "#8B1A1A",
								}}
								thumbColor="#fff"
							/>
						)}
					</View>
				</View>

				{/* ACCOUNT */}
				<Text
					style={{
						fontSize: 11,
						fontWeight: "700",
						color: "#717973",
						letterSpacing: 1.2,
						marginBottom: 10,
					}}
				>
					ACCOUNT
				</Text>
				<View
					style={{
						backgroundColor: "#fff",
						borderRadius: 16,
						marginBottom: 24,
						overflow: "hidden",
						shadowColor: "#000",
						shadowOpacity: 0.04,
						shadowRadius: 4,
						elevation: 1,
					}}
				>
					<Pressable
						style={{
							flexDirection: "row",
							alignItems: "center",
							padding: 16,
							borderBottomWidth: 1,
							borderBottomColor: "#E5E7EB",
						}}
						onPress={() => router.push("/kyc" as any)}
					>
						<IconTile
							icon={<Shield size={20} color="#8B1A1A" />}
							variant="primary"
							className="mr-3"
						/>
						<View style={{ flex: 1, marginLeft: 12 }}>
							<Text
								style={{
									fontSize: 16,
									fontWeight: "600",
									color: "#1A1C1E",
								}}
							>
								KYC Verification
							</Text>
							<Text style={{ fontSize: 13, color: "#717973" }}>
								Identity verification
							</Text>
						</View>
						<ChevronRight size={20} color="#717973" />
					</Pressable>
					<Pressable
						style={{
							flexDirection: "row",
							alignItems: "center",
							padding: 16,
						}}
						onPress={() =>
							Alert.alert(
								"Update Rate",
								"Go to KYC to update your daily rate and service areas.",
							)
						}
					>
						<IconTile
							icon={<DollarSign size={20} color="#8B1A1A" />}
							variant="primary"
							className="mr-3"
						/>
						<View style={{ flex: 1, marginLeft: 12 }}>
							<Text
								style={{
									fontSize: 16,
									fontWeight: "600",
									color: "#1A1C1E",
								}}
							>
								Daily Rate & Services
							</Text>
							<Text style={{ fontSize: 13, color: "#717973" }}>
								{guideProfile?.price_per_day
									? `रू ${Number(guideProfile.price_per_day).toLocaleString()}/day`
									: "Not set"}
								{guideProfile?.service_areas?.length
									? ` · ${guideProfile.service_areas.slice(0, 2).join(", ")}`
									: ""}
							</Text>
						</View>
						<ChevronRight size={20} color="#717973" />
					</Pressable>
				</View>

				{/* SUPPORT */}
				<Text
					style={{
						fontSize: 11,
						fontWeight: "700",
						color: "#717973",
						letterSpacing: 1.2,
						marginBottom: 10,
					}}
				>
					SUPPORT
				</Text>
				<View
					style={{
						backgroundColor: "#fff",
						borderRadius: 16,
						marginBottom: 16,
						overflow: "hidden",
						shadowColor: "#000",
						shadowOpacity: 0.04,
						shadowRadius: 4,
						elevation: 1,
					}}
				>
					<Pressable
						style={{
							flexDirection: "row",
							alignItems: "center",
							padding: 16,
							borderBottomWidth: 1,
							borderBottomColor: "#E5E7EB",
						}}
						onPress={() =>
							Alert.alert(
								"Guide Support",
								"Email: guides@tripnepal.com\n\nWe respond within 12 hours for guides.",
							)
						}
					>
						<IconTile
							icon={<HelpCircle size={20} color="#414844" />}
							variant="info"
							className="mr-3"
						/>
						<View style={{ flex: 1, marginLeft: 12 }}>
							<Text
								style={{
									fontSize: 16,
									fontWeight: "600",
									color: "#1A1C1E",
								}}
							>
								Guide Support
							</Text>
						</View>
						<ChevronRight size={20} color="#717973" />
					</Pressable>
					<Pressable
						style={{
							flexDirection: "row",
							alignItems: "center",
							padding: 16,
							borderBottomWidth: 1,
							borderBottomColor: "#E5E7EB",
						}}
						onPress={() =>
							Alert.alert(
								"Guide Terms",
								"Available at:\nhttps://tripnepal.com/guide-terms",
							)
						}
					>
						<IconTile
							icon={<FileText size={20} color="#414844" />}
							variant="info"
							className="mr-3"
						/>
						<View style={{ flex: 1, marginLeft: 12 }}>
							<Text
								style={{
									fontSize: 16,
									fontWeight: "600",
									color: "#1A1C1E",
								}}
							>
								Guide Agreement
							</Text>
						</View>
						<ChevronRight size={20} color="#717973" />
					</Pressable>
					<Pressable
						style={{
							flexDirection: "row",
							alignItems: "center",
							padding: 16,
						}}
						onPress={handleLogout}
					>
						<IconTile
							icon={<LogOut size={20} color="#BA1A1A" />}
							variant="danger"
							className="mr-3"
						/>
						<View style={{ flex: 1, marginLeft: 12 }}>
							<Text
								style={{
									fontSize: 16,
									fontWeight: "600",
									color: "#BA1A1A",
								}}
							>
								Logout
							</Text>
						</View>
					</Pressable>
				</View>

				<Text
					style={{
						textAlign: "center",
						fontSize: 11,
						color: "#C1C8C2",
						marginBottom: 40,
					}}
				>
					Trip Nepal Guide App · v1.0.0
				</Text>
			</ScrollView>
		</View>
	);
}
