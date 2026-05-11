import { useRouter } from "expo-router";
import {
	ChevronRight,
	DollarSign,
	FileText,
	HelpCircle,
	LogOut,
	Pencil,
	Shield,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
	ActivityIndicator,
	Alert,
	Pressable,
	ScrollView,
	Text,
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

	useEffect(() => {
		if (!user?.id) return;
		Promise.all([
			(supabase.from("guide_profiles") as any)
				.select(
					"price_per_day, average_rating, total_reviews, total_trips_completed, is_verified, specializations, service_areas",
				)
				.eq("id", user.id)
				.single(),
			supabase
				.from("kyc_verifications")
				.select("status")
				.eq("user_id", user.id)
				.single(),
		]).then(([gp, kyc]) => {
			const gpData = gp.data;
			if (gpData) setGuideProfile(gpData);
			if (gpData?.is_verified) {
				setKycStatus("approved");
			} else if (
				kyc.data?.status &&
				kyc.data.status !== "not_submitted"
			) {
				setKycStatus(kyc.data.status);
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
				updateProfile({ avatar_url: url });
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

				{/* KYC Status */}
				{kycStatus !== "approved" && (
					<Pressable
						onPress={() => router.push("/kyc" as any)}
						style={{
							backgroundColor:
								kycStatus === "pending" ? "#FEF3C7" : "#FEE2E2",
							borderRadius: 12,
							padding: 14,
							marginBottom: 24,
							flexDirection: "row",
							alignItems: "center",
						}}
					>
						<Shield
							size={20}
							color={
								kycStatus === "pending" ? "#D97706" : "#DC2626"
							}
						/>
						<View style={{ flex: 1, marginLeft: 12 }}>
							<Text
								style={{
									fontWeight: "700",
									color:
										kycStatus === "pending"
											? "#D97706"
											: "#DC2626",
									fontSize: 14,
								}}
							>
								{kycStatus === "pending"
									? "Verification Under Review"
									: kycStatus === "rejected"
										? "Verification Rejected — Resubmit"
										: "Complete KYC Verification"}
							</Text>
							<Text
								style={{
									fontSize: 12,
									color: "#6B7280",
									marginTop: 2,
								}}
							>
								{kycStatus === "pending"
									? "Usually takes 24-48 hours"
									: "Tap to submit your documents"}
							</Text>
						</View>
						<ChevronRight size={18} color="#9CA3AF" />
					</Pressable>
				)}

				{/* Account */}
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
								Citizenship, license, documents
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

				{/* Support */}
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
